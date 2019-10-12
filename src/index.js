import Vue from 'vue';
import Rete from 'rete';
import ConnectionPlugin from 'rete-connection-plugin';
import VueRenderPlugin from 'rete-vue-render-plugin';
import AreaPlugin from 'rete-area-plugin';
import CommentPlugin from 'rete-comment-plugin';
import ModulePlugin from 'rete-module-plugin';
import ContextMenuPlugin from 'rete-context-menu-plugin';

var numSocket = new Rete.Socket("Number");
var floatSocket = new Rete.Socket("Float");


import VueTextControl from '../vueComponents/TextInput.vue';
class TextControl extends Rete.Control {

    constructor(emitter, key, params = {}) {
        super(key);
        this.component = VueTextControl;
        this.props = { emitter, ikey: key, params, change: () => this.onChange() };
    }

    onChange() {}

    setValue(val) {
        this.vueContext.value = val;
    }

    getValue() {
        return this.vueContext ? this.vueContext.value : undefined;
    }
}


class InputComponent extends Rete.Component {

    constructor() {
        super("Input");
        this.module = {
            nodeType: 'input',
            socket: numSocket
        }
    }

    builder(node) {
        var out1 = new Rete.Output('output', "Number", numSocket);
        var ctrl = new TextControl(this.editor, 'name', {value: 'InputName'});

        return node.addControl(ctrl).addOutput(out1);
    }
}


class ModuleComponent extends Rete.Component {

    constructor() {
        super("Module");
        this.module = {
            nodeType: 'module'
        }
    }

    builder(node) {
        var ctrl = new TextControl(this.editor, 'module', {value: 'ModuleName'});
        ctrl.onChange = () => {
            //console.log(this)
            this.updateModuleSockets(node);
            node.update();
        }
        return node.addControl(ctrl);
    }

    change(node, item) {
        node.data.module = item;
        this.editor.trigger('process');
    }
}


class OutputComponent extends Rete.Component {

    constructor() {
        super("Output");
        this.module = {
            nodeType: 'output',
            socket: numSocket
        }
    }

    builder(node) {
        var inp = new Rete.Input('input', "Number", numSocket);
        var ctrl = new TextControl(this.editor, 'name', {value: 'OutputName'});

        return node.addControl(ctrl).addInput(inp);
    }
}


class OutputFloatComponent extends Rete.Component {

    constructor() {
        super("Float Output");
        this.module = {
            nodeType: 'output',
            socket: floatSocket
        }
    }

    builder(node) {
        var inp = new Rete.Input('float', "Float", floatSocket);
        var ctrl = new TextControl(this.editor, 'name', {value: 'FloatOutput Name'});

        return node.addControl(ctrl).addInput(inp);
    }
}

class NumComponent extends Rete.Component {

    constructor() {
        super("Number");
    }

    builder(node) {
        var out1 = new Rete.Output('num', "Number", numSocket);
        var ctrl = new TextControl(this.editor, 'num', {type:'number', value: 0});

        return node.addControl(ctrl).addOutput(out1);
    }

    worker(node, inputs, outputs) {
        outputs['num'] = node.data.num;
    }
}


class AddComponent extends Rete.Component {
    constructor() {
        super("Add");
    }

    builder(node) {
        var inp1 = new Rete.Input('num1', "Number", numSocket);
        var inp2 = new Rete.Input('num2', "Number", numSocket);
        var out = new Rete.Output('num', "Number", numSocket);

        inp1.addControl(new TextControl(this.editor, 'num1', {type:'number'}))
        inp2.addControl(new TextControl(this.editor, 'num2', {type:'number'}))

        return node
            .addInput(inp1)
            .addInput(inp2)
            .addControl(new TextControl(this.editor, 'preview', true))
            .addOutput(out);
    }

    worker(node, inputs, outputs, { silent } = {}) {
        var n1 = inputs['num1'].length ? inputs['num1'][0] : node.data.num1;
        var n2 = inputs['num2'].length ? inputs['num2'][0] : node.data.num2;
        var sum = n1 + n2;

        if (!silent)
            this.editor.nodes.find(n => n.id == node.id).controls.get('preview').setValue(sum);

        outputs['num'] = sum;
    }

    created(node) {
        console.log('created', node)
    }

    destroyed(node) {
        console.log('destroyed', node)
    }
}


/////////////////////


var container = document.querySelector('#rete');
var editor = null;
var initialData = () => ({id: 'demo@0.1.0', nodes: {}});
var modules = {
    ...modulesData
}
var currentModule = {};

function addModule() {
    Vue.set(app.modules, 'module'+Object.keys(modules).length+'.rete', { data: initialData() });
}

async function openModule(name) {
    currentModule.data = editor.toJSON();
    
    currentModule = modules[name];
    await editor.fromJSON(currentModule.data);
    editor.trigger('process')
}


//modules menu
let app = new Vue({
  el: '#modules',
  data: {
     modules:modules,  
  },
  methods:{
    openModule : openModule,
    addModule : addModule
  }
})


var editor = new Rete.NodeEditor("demo@0.1.0", container);
editor.use(ConnectionPlugin, { curvature: 0.4 });
editor.use(VueRenderPlugin);
editor.use(ContextMenuPlugin);

var engine = new Rete.Engine("demo@0.1.0");

editor.use(ModulePlugin, { engine, modules });
//engine.use(ProfilerPlugin, { editor, enabled: true });


[new NumComponent, new AddComponent, new InputComponent, new ModuleComponent, new OutputComponent, new OutputFloatComponent].map(c => {
    editor.register(c);
    engine.register(c);
});


/*
[new ModuleComponent].map(c => {
    editor.register(c);
    engine.register(c);
});
*/



editor.on("process connectioncreated connectionremoved", async () => {
   if(editor.silent) return;
   
   await engine.abort();
   await engine.process(editor.toJSON());
});

editor.view.resize();
openModule('index.rete').then(() => {
   AreaPlugin.zoomAt(editor);
});
