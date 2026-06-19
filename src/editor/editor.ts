import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import { AnalysisData, NodeId, ReducedJSON, SyntaxNode, SyntaxTree, WordNode } from "./tree.js";

export class SyntaxEditor {
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    elementMapping: Map<NodeId, AnyNodeEl> = new Map();

    state: state = {
        selectedNodeId: null,
        editing: {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        }
    };

    constructor(json: ReducedJSON) {
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node') as RootNodeEl;
    }

    mount(container: HTMLDivElement) {
        container.appendChild(this.rootEl);
        this.renderTree();
    }

    private renderTree() {
        const json = this.tree.getJSON();
        console.log(json);
        this.elementMapping = this.rootEl.build(json);
        if (this.state.selectedNodeId) {
            this.selectNode(this.state.selectedNodeId);
        }
    }

    private installListeners() {
        // TODO: Listen for clicks on rootEl and keyboard shortcuts
    }

    private selectNode(id: number | null) {
        const oldSelectedId = this.state.selectedNodeId;
        if (oldSelectedId !== null) {
            const oldElement = this.elementMapping.get(oldSelectedId) as EditableNodeEl;
            oldElement.deselect();
        }

        if (id !== null) {
            const newElement = this.elementMapping.get(id) as EditableNodeEl;
            newElement.select();
        }
        this.state.selectedNodeId = id;
    }

    private startEditing() {
        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        this.state.editing = {
            isEditing: true,
            elements: element.startEdit(),
            type: element.type,
            field: null
        };

        // TODO: Set field to clicked field
        let field: state['editing']['field'];
        if (element.type === 'word') {
            field = 'word';
            this.state.editing.elements?.word?.focus();
        } else {
            field = 'category';
            this.state.editing.elements?.category?.focus();
        }

        this.state.editing.field = field;
    }

    private finishEditing() {
        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        const node = this.tree.getNode(id);

        const analysis = element.finishEdit();
        if (element.type === 'word') { // TODO: Delete/Create node
            const wNode = node as WordNode; const wAnalysis = analysis as WordNodeData;

            wNode.word = wAnalysis.word ?? 'TODO'; // Thish should actually delete the node if null...
            wNode.comment = wAnalysis.comment;
        }
        else {
            const sNode = node as SyntaxNode; const sAnalysis = analysis as AnalysisData;
            
            sNode.category = sAnalysis.category!;
            sNode.function = sAnalysis.function!;
            sNode.comment = sAnalysis.comment;
        }

        this.renderTree();
    }

    private deleteNode() {
        this.doDeleteAction(false);
    }

    private promoteChildren() {
        this.doDeleteAction(true);
    }

    private doDeleteAction(keepChildren: boolean) {
        const id = this.state.selectedNodeId;
        if (id === null) return;
        const selected = this.tree.getNode(id);
        if (selected.type === 'word') return;

        if (keepChildren) {
            this.tree.promoteChildren(id);
        } else {
            this.tree.deleteNode(id);
        }

        const parentId = this.tree.getParentId(id);
        this.state.selectedNodeId = null; // So that selectNode doesn't deselect unexistent element
        this.selectNode((parentId === 'root') ? null : parentId);
        this.renderTree();
    }
}

type EditableNodeEl = SyntaxNodeEl | WordNodeEl;

interface state {
    selectedNodeId: number | null;
    editing: EditingNodeData;
}

interface EditingNodeData {
    isEditing: boolean;
    type: 'word' | 'box' | null;
    field: 'category' | 'function' | 'comment' | 'word' | null;
    elements: InputFieldEls | null;
}