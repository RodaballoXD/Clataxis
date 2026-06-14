import { AnyNodeEl, RootNodeEl, SyntaxNodeEl, WordNodeEl } from "./elements";
import { ReducedJSON, RootNode, SyntaxNode, SyntaxTree, WordNode, NodeId } from "./tree";

export class SyntaxEditor {
    private tree: SyntaxTree;
    private rootElement: RootNodeEl;

    private nodeElementMap: Map<NodeId, AnyNodeEl>;

    private state: EditorState;

    constructor(tree: ReducedJSON) {
        this.tree = new SyntaxTree(tree);

        this.state = {
            selectedNodeId: null,
            editingNodeId: null,
            editingNodeData: {
                type: null,
                field: null
            }
        };
        
        this.rootElement = document.createElement('root-node') as RootNodeEl;
        this.nodeElementMap = this.rootElement.build(this.tree.toJSON());

        const editorContainer = document.getElementById('editor-container') as HTMLDivElement;
        editorContainer.replaceChildren(this.rootElement);
    }

    private rerenderNode(id: NodeId) {
        const element = this.nodeElementMap.get(id)!;
        const node = this.tree.getNode(id)!;

        let newElementMap: Map<NodeId, AnyNodeEl>;
        if (element instanceof WordNodeEl) {
            newElementMap = element.build(node as WordNode);
        } else if (element instanceof SyntaxNodeEl) {
            newElementMap = element.build(node as SyntaxNode);
        } else {
            newElementMap = element.build(node as RootNode);
        }
        for (const [id, el] of newElementMap) {
            this.nodeElementMap.set(id, el);
        }
    }

    private selectNode(id: number | null) {
        const oldSelected = this.state.selectedNodeId;
        if (oldSelected !== null) {
            const oldElement = this.nodeElementMap.get(oldSelected) as EditableNodeEl;
            oldElement.deselect();
        }

        if (id !== null) {
            const newElement = this.nodeElementMap.get(id) as EditableNodeEl;
            newElement.select();
        }
        this.state.selectedNodeId = id;
    }

    private setEditingNode(id: number | null, field?: 'category' | 'function' | 'word' | 'comment') {
        this.selectNode(id);
        const oldEditing = this.state.editingNodeId;
        if (oldEditing !== null) {
            const oldElement = this.nodeElementMap.get(oldEditing) as EditableNodeEl;
            oldElement.endEdit();
        }

        let newField: EditingNodeData['field'] = null;
        let type: EditingNodeData['type'] = null;
        if (id !== null) {
            const newElement = this.nodeElementMap.get(id) as EditableNodeEl;
            if (newElement instanceof WordNodeEl) {
                newField = newElement.startEdit(field as 'word' | 'comment' | undefined);
                type = 'word';
            } else {
                newField = newElement.startEdit(field as 'category' | 'function' | 'comment' | undefined);
                type = 'box';
            }
        }
        this.state.editingNodeId = id;
        this.state.editingNodeData = { type, field: newField };
    }
}

type EditableNodeEl = SyntaxNodeEl | WordNodeEl;

interface EditorState {
    selectedNodeId: number | null;
    editingNodeId: number | null;
    editingNodeData: EditingNodeData;
}

interface EditingNodeData {
    type: 'word' | 'box' | null;
    field: 'category' | 'function' | 'comment' | 'word' | null;
}