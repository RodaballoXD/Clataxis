import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import { AnalysisData, NodeId, ReducedJSON, SyntaxNode, SyntaxTree, WordNode } from "./tree.js";

export class SyntaxEditor {
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    appEl: HTMLDivElement;
    elementMapping: Map<NodeId, AnyNodeEl> = new Map();

    state: EditorState = {
        selectedNodeId: null,
        editing: {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        },
        pointer: {
            isDragging: false,
            pointerId: null,
            startWordToken: null,
            endWordToken: null,
            didMove: false,
            startMousePosition: null
        }
    };

    constructor(json: ReducedJSON) {
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node') as RootNodeEl;
        this.appEl = document.getElementById('app') as HTMLDivElement;
    }

    mount(container: HTMLElement) {
        container.appendChild(this.rootEl);
        this.renderTree();
        this.installListeners();
    }

    private renderTree() {
        const json = this.tree.getJSON();
        this.elementMapping = this.rootEl.build(json);
        if (this.state.selectedNodeId !== null) {
            this.selectNode(this.state.selectedNodeId);
        }
    }

    private installListeners() {
        this.appEl.addEventListener('pointerdown', this.onPointerDown);
        this.appEl.addEventListener('pointermove', this.onPoinerMove);
        this.appEl.addEventListener('pointerup', this.onPointerUp);
    }

    private onPointerDown = (event: PointerEvent) => {
        const clicked = this.getClickedNode(event);
        
        if (clicked.type === 'word') {
            const wordToken = (this.tree.getNode(clicked.nodeEl.nodeId) as WordNode).token;
            this.state.pointer = {
                isDragging: true,
                didMove: false,
                pointerId: event.pointerId,
                startWordToken: wordToken,
                endWordToken: wordToken,
                startMousePosition: this.getMousePosition(event)
            };
            this.appEl.setPointerCapture(event.pointerId);
            return;
        }

        if (clicked.didClickInput) return;
        
        if (clicked.type === null) {
            this.clickNode(null);
        }

        else if (clicked.type === 'syntax') {
            const clickedId = clicked.nodeEl.nodeId as number;
            this.clickNode(clickedId);
        }
    }

    private onPoinerMove = (event: PointerEvent) => {
        if (!this.state.pointer.isDragging || this.state.editing.isEditing) return;

        const MIN_PIXELS_MOVED = 20;
        
        const currentPos = this.getMousePosition(event);
        const didMove = (distance(this.state.pointer.startMousePosition, currentPos) > MIN_PIXELS_MOVED);
        this.state.pointer.didMove ||= didMove;
        
        let endWordToken: number;
        const clicked = this.getClickedNode(event);
        if (clicked.type !== 'word') {
            endWordToken = (this.state.pointer.endWordToken as number | null) ?? this.state.pointer.startWordToken;
        } else {
            endWordToken = (this.tree.getNode(clicked.nodeEl.nodeId) as WordNode).token;
        }
        this.state.pointer.endWordToken = endWordToken;

        function distance(pos1: Position, pos2: Position): number {
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    private onPointerUp = (event: PointerEvent) => {
        if (!this.state.pointer.isDragging) return;

        if (!this.state.pointer.didMove) {
            this.clearPointerState();
            const clicked = this.getClickedNode(event);
            if (clicked.didClickInput) return;
            const clickedId = clicked.nodeEl?.nodeId as number;
            this.clickNode(clickedId ?? null);
            return;
        }

        this.insertBoxAtRange(this.state.pointer.startWordToken, this.state.pointer.endWordToken);
        this.clearPointerState();
    }

    private getClickedNode(event: PointerEvent): ClickedData {
        const underPointer = document.elementFromPoint(event.clientX, event.clientY);
        if (!underPointer) return { type: null, nodeEl: null, didClickInput: false };

        const didClickInput = (
            ['input', 'button', 'textarea']
            .includes(underPointer.nodeName.toLowerCase())
        );

        const wordContEl = underPointer?.closest('.word-node') as HTMLDivElement | null; // whitespace of 'word-node' should return null
        const wordEl = underPointer?.closest('word-node') as WordNodeEl | null;
        if (wordEl && wordContEl) return { type: 'word', nodeEl: wordEl, didClickInput };

        const syntaxEl = underPointer?.closest('syntax-node') as SyntaxNodeEl | null;
        if (syntaxEl && !wordEl) return { type: 'syntax', nodeEl: syntaxEl, didClickInput };

        return { type: null, nodeEl: null, didClickInput };
    }

    private getMousePosition(event: PointerEvent): Position {
        const rect = this.rootEl.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }

    private clearPointerState() {
        this.state.pointer = {
            isDragging: false,
            pointerId: null,
            startWordToken: null,
            endWordToken: null,
            didMove: false,
            startMousePosition: null
        };
    }

    private clickNode(id: number | null) {
        const prevSelected = this.state.selectedNodeId;
        const clickedSame = (prevSelected === id) && (id !== null);
        const wasEditing = this.state.editing.isEditing;
        if (wasEditing && clickedSame) {
            return;
        }
        if (!wasEditing && clickedSame) {
            this.startEditing();
            return;
        }

        if (wasEditing && !clickedSame) {
            this.finishEditing();
        }
        this.selectNode(id);
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
        let field: EditorState['editing']['field'];
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
        this.state.editing = {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        };

        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        const node = this.tree.getNode(id);

        const analysis = element.finishEdit();
        if (element.type === 'word') { // TODO: Delete/Create node
            const wNode = node as WordNode; const wAnalysis = analysis as WordNodeData;

            wNode.word = wAnalysis.word ?? 'TODO'; // This should actually delete the node if null...
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
        
        const parentId = this.tree.getParentId(id);

        if (keepChildren) {
            this.tree.promoteChildren(id);
        } else {
            this.tree.deleteNode(id);
        }

        this.state.selectedNodeId = null; // So that selectNode doesn't deselect unexistent element
        this.selectNode((parentId === 'root') ? null : parentId);
        this.renderTree();
    }

    private insertBoxAtRange(startToken: number, endToken: number) {
        if (startToken > endToken) {
            [endToken, startToken] = [startToken, endToken];
        }
        const insertedData = this.tree.insertBoxAtRange(startToken, endToken);
        if (insertedData.status === 'error') return; // TODO: Message for user

        this.renderTree();
        this.selectNode(insertedData.newNodeId);
    }
}

type EditableNodeEl = SyntaxNodeEl | WordNodeEl;

interface EditorState {
    selectedNodeId: number | null;
    editing: EditingNodeData;
    pointer: PointerData;
}

interface EditingNodeData {
    isEditing: boolean;
    type: 'word' | 'box' | null;
    field: 'category' | 'function' | 'comment' | 'word' | null;
    elements: InputFieldEls | null;
}

interface PointerDataActive {
    isDragging: true;
    pointerId: number;
    startWordToken: number;
    endWordToken: number;
    didMove: boolean;
    startMousePosition: Position;
}

interface PointerDataInactive {
    isDragging: false;
    pointerId: null;
    startWordToken: null;
    endWordToken: null;
    didMove: false;
    startMousePosition: null;
}

type PointerData = PointerDataActive | PointerDataInactive;

type ClickedData = { type: null, nodeEl: null, didClickInput: boolean } | { type: 'word', nodeEl: WordNodeEl, didClickInput: boolean } | { type: 'syntax', nodeEl: SyntaxNodeEl, didClickInput: boolean };

interface Position {
    x: number;
    y: number;
}