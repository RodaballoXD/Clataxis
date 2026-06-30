import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import type { EditorInterfaceEls } from "./editor-screen.js";
import type { AnalysisData, NodeId, ReducedJSON, SyntaxNode, WordNode } from "./tree.js";
import { SyntaxTree } from "./tree.js";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export class SyntaxEditor {
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    appEl: HTMLDivElement;
    private selectionActionsEl: HTMLDivElement;
    private onChange: (json: ReducedJSON) => void;
    private controls: EditorInterfaceEls | null;
    private zoom: number = 1;
    private undoStack: ReducedJSON[] = [];
    private redoStack: ReducedJSON[] = [];
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

    constructor(json: ReducedJSON, onChange: (json: ReducedJSON) => void = () => {}, controls: EditorInterfaceEls | null = null) {
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node') as RootNodeEl;
        this.appEl = document.getElementById('app') as HTMLDivElement;
        this.selectionActionsEl = this.createSelectionActions();
        this.onChange = onChange;
        this.controls = controls;
    }

    mount(container: HTMLElement) {
        container.appendChild(this.rootEl);
        this.renderTree();
        this.installListeners();
        this.installControlListeners();
        this.updateHistoryButtons();
    }

    destroy() {
        this.appEl.removeEventListener('pointerdown', this.onPointerDown);
        this.appEl.removeEventListener('pointermove', this.onPointerMove);
        this.appEl.removeEventListener('pointerup', this.onPointerUp);
    }

    private renderTree() {
        const json = this.tree.getJSON();
        this.elementMapping = this.rootEl.build(json);
        if (this.state.selectedNodeId !== null) {
            this.selectNode(this.state.selectedNodeId);
        }
    }

    private notifyChange() {
        this.onChange(this.tree.toReducedJSON());
    }

    private snapshot(): ReducedJSON {
        return cloneReducedJSON(this.tree.toReducedJSON());
    }

    private restoreSnapshot(json: ReducedJSON) {
        this.state.selectedNodeId = null;
        this.resetEditingState();
        this.tree = new SyntaxTree(cloneReducedJSON(json));
        this.renderTree();
        this.notifyChange();
        this.updateHistoryButtons();
    }

    private registerTreeChange(previousJSON: ReducedJSON) {
        const currentJSON = this.tree.toReducedJSON();
        if (sameReducedJSON(previousJSON, currentJSON)) return;

        this.undoStack.push(cloneReducedJSON(previousJSON));
        this.redoStack = [];
        this.notifyChange();
        this.updateHistoryButtons();
    }

    private undo() {
        const previous = this.undoStack.pop();
        if (!previous) return;

        this.redoStack.push(this.snapshot());
        this.restoreSnapshot(previous);
    }

    private redo() {
        const next = this.redoStack.pop();
        if (!next) return;

        this.undoStack.push(this.snapshot());
        this.restoreSnapshot(next);
    }

    private installControlListeners() {
        if (!this.controls) return;

        this.controls.zoomInButtonEl.addEventListener('click', () => this.changeZoom(ZOOM_STEP));
        this.controls.zoomOutButtonEl.addEventListener('click', () => this.changeZoom(-ZOOM_STEP));
        this.controls.undoButtonEl.addEventListener('click', () => this.undo());
        this.controls.redoButtonEl.addEventListener('click', () => this.redo());
    }

    private changeZoom(delta: number) {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta));
        this.zoom = Math.round(nextZoom * 100) / 100;
        this.rootEl.style.zoom = String(this.zoom);
    }

    private updateHistoryButtons() {
        if (!this.controls) return;

        this.controls.undoButtonEl.disabled = this.undoStack.length === 0;
        this.controls.redoButtonEl.disabled = this.redoStack.length === 0;
    }

    private installListeners() {
        this.appEl.addEventListener('pointerdown', this.onPointerDown);
        this.appEl.addEventListener('pointermove', this.onPointerMove);
        this.appEl.addEventListener('pointerup', this.onPointerUp);
    }

    private createSelectionActions(): HTMLDivElement {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'node-action-buttons';
        actionsEl.setAttribute('aria-label', 'Acciones del nodo seleccionado');

        const deleteButtonEl = document.createElement('button');
        deleteButtonEl.type = 'button';
        deleteButtonEl.textContent = '🗑';
        deleteButtonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            this.deleteNode();
        });

        const promoteButtonEl = document.createElement('button');
        promoteButtonEl.type = 'button';
        promoteButtonEl.textContent = '⤴';
        promoteButtonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            this.promoteChildren();
        });

        actionsEl.addEventListener('pointerdown', (event) => {
            event.stopPropagation();
        });
        actionsEl.replaceChildren(deleteButtonEl, promoteButtonEl);
        return actionsEl;
    }

    private onPointerDown = (event: PointerEvent) => {
        const clicked = this.getClickedNode(event);
        if (clicked.didClickInput) return;
        
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

        if (clicked.type === null) {
            this.clickNode(null);
        }

        else if (clicked.type === 'syntax') {
            const clickedId = clicked.nodeEl.nodeId as number;
            this.clickNode(clickedId, event);
        }
    }

    private onPointerMove = (event: PointerEvent) => {
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
            this.clickNode(clickedId ?? null, event);
            return;
        }

        this.insertBoxAtRange(this.state.pointer.startWordToken, this.state.pointer.endWordToken);
        this.clearPointerState();
    }

    private getClickedNode(event: PointerEvent): ClickedData {
        const underPointer = document.elementFromPoint(event.clientX, event.clientY);
        if (!underPointer) return { type: null, nodeEl: null, didClickInput: false };

        const didClickInput = !!underPointer.closest('input, button, textarea');

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

    private clickNode(id: number | null, event?: PointerEvent) {
        const prevSelected = this.state.selectedNodeId;
        const clickedSame = (prevSelected === id) && (id !== null);
        const wasEditing = this.state.editing.isEditing;

        if (wasEditing && clickedSame) {
            return;
        }
        if (!wasEditing && clickedSame) {
            if (!event) throw new Error("Attempted to `startEditing()` with no `event` parameter");
            this.startEditing(event);
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
        this.updateSelectionPanel();
    }

    private updateSelectionPanel() {
        const id = this.state.selectedNodeId;
        if (id === null) {
            this.selectionActionsEl.remove();
            return;
        }

        const selectedNode = this.tree.getNode(id);
        if (selectedNode.type === 'word') {
            this.selectionActionsEl.remove();
            return;
        }

        const selectedElement = this.elementMapping.get(id) as SyntaxNodeEl;

        selectedElement.appendChild(this.selectionActionsEl);
    }

    private startEditing(event: PointerEvent) {
        let field = getField(event)!;

        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        this.state.editing = {
            isEditing: true,
            elements: element.startEdit(),
            type: element.type,
            field: null
        };

        if (field === null) {
            field = (element.type === 'word') ? 'word' : 'category';
        }
        const inputEl = this.state.editing.elements?.[field];
        requestAnimationFrame(() => inputEl?.focus());

        this.state.editing.field = field;

        function getField(event: PointerEvent): EditorState['editing']['field'] {
            const classNames = ['function', 'category', 'word', 'comment', 'word-comment'];

            const underPointer = document.elementFromPoint(event.clientX, event.clientY);
            const clicked = underPointer?.closest(`.${classNames.join(', .')}`);

            let foundClassName: string | null = null;
            for (const name of classNames) {
                if (clicked?.classList.contains(name)) {
                    foundClassName = name;
                }
            }
            if (foundClassName === 'word-comment') foundClassName = 'comment';

            return foundClassName as EditorState['editing']['field'];
        }
    }

    private finishEditing() {
        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        const node = this.tree.getNode(id);
        const previousJSON = this.snapshot();

        this.resetEditingState();

        const analysis = element.finishEdit();
        if (element.type === 'word') {
            const treeWasModified = this.tree.setWordNodeAtId(id, analysis);
            if (treeWasModified) {
                this.state.selectedNodeId = null;
            }
        }
        else {
            this.tree.setNodeAnalysis(node.id as number, analysis);
        }

        this.renderTree();
        this.registerTreeChange(previousJSON);
    }

    private resetEditingState() {
        this.state.editing = {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        };
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
        const previousJSON = this.snapshot();
        
        const parentId = this.tree.getParentId(id);

        if (keepChildren) {
            this.tree.promoteChildren(id);
        } else {
            this.tree.deleteNode(id);
        }

        const nextSelectedId = (parentId === 'root') ? null : parentId;
        this.state.selectedNodeId = null; // So renderTree doesn't try to select the deleted node
        this.renderTree();
        this.selectNode(nextSelectedId);
        this.registerTreeChange(previousJSON);
    }

    private insertBoxAtRange(startToken: number, endToken: number) {
        if (startToken > endToken) {
            [endToken, startToken] = [startToken, endToken];
        }
        const previousJSON = this.snapshot();
        const insertedData = this.tree.insertBoxAtRange(startToken, endToken);
        if (insertedData.status === 'error') return; // TODO: Message for user

        this.renderTree();
        this.selectNode(insertedData.newNodeId);
        this.registerTreeChange(previousJSON);
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

function cloneReducedJSON(json: ReducedJSON): ReducedJSON {
    return JSON.parse(JSON.stringify(json)) as ReducedJSON;
}

function sameReducedJSON(a: ReducedJSON, b: ReducedJSON): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
