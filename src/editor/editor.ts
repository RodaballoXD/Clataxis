import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import type { EditorInterfaceEls } from "./editor-screen.js";
import type { AnalysisData, NodeId, ReducedJSON, SyntaxNode, WordNode } from "./tree.js";
import { SyntaxTree } from "./tree.js";
import { FieldAutocomplete } from "./autocomplete.js";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export class SyntaxEditor {
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    appEl: HTMLDivElement;
    private selectionActionsEl: HTMLDivElement;
    private onChange: (json: ReducedJSON) => void;
    private controls: EditorInterfaceEls;
    private zoom: number = 1;
    private undoStack: ReducedJSON[] = [];
    private redoStack: ReducedJSON[] = [];
    private notificationTimeout: number | null = null;
    private autocomplete = new FieldAutocomplete();
    private elementMapping: Map<NodeId, AnyNodeEl> = new Map();
    private autoScrollAnimationFrame: number | null = null;
    private lastPointerX = 0;
    private lastPointerY = 0;

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

    constructor(json: ReducedJSON, onChange: (json: ReducedJSON) => void = () => {}, controls: EditorInterfaceEls) {
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
        this.appEl.removeEventListener('pointercancel', this.onPointerCancel);
        document.removeEventListener('keydown', this.onKeyDown, true);
        this.autocomplete.destroy();
        if (this.notificationTimeout !== null) {
            window.clearTimeout(this.notificationTimeout);
        }
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
        this.showNotification('Deshecho');
    }

    private redo() {
        const next = this.redoStack.pop();
        if (!next) return;

        this.undoStack.push(this.snapshot());
        this.restoreSnapshot(next);
        this.showNotification('Rehecho');
    }

    private installControlListeners() {
        this.controls.zoomInButtonEl.addEventListener('click', () => this.changeZoom(ZOOM_STEP));
        this.controls.zoomOutButtonEl.addEventListener('click', () => this.changeZoom(-ZOOM_STEP));
        this.controls.undoButtonEl.addEventListener('click', () => this.undo());
        this.controls.redoButtonEl.addEventListener('click', () => this.redo());
    }

    private changeZoom(delta: number) {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta));
        this.zoom = Math.round(nextZoom * 100) / 100;
        this.rootEl.style.zoom = String(this.zoom);
        this.showNotification(`Zoom ${this.zoom.toFixed(1).replace(/\.0$/, '')}x`);
    }

    private updateHistoryButtons() {
        this.controls.undoButtonEl.disabled = this.undoStack.length === 0;
        this.controls.redoButtonEl.disabled = this.redoStack.length === 0;
    }

    private installListeners() {
        this.appEl.addEventListener('pointerdown', this.onPointerDown);
        this.appEl.addEventListener('pointermove', this.onPointerMove);
        this.appEl.addEventListener('pointerup', this.onPointerUp);
        this.appEl.addEventListener('pointercancel', this.onPointerCancel);
        document.addEventListener('keydown', this.onKeyDown, true);
    }

    private createSelectionActions(): HTMLDivElement {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'node-action-buttons';
        actionsEl.setAttribute('aria-label', 'Acciones del nodo seleccionado');

        const deleteButtonEl = document.createElement('button');
        deleteButtonEl.type = 'button';
        deleteButtonEl.textContent = '🗑';
        deleteButtonEl.title = 'Eliminar caja (Supr)';
        deleteButtonEl.addEventListener('click', (event) => {
            event.stopPropagation();
            this.deleteNode();
        });

        const promoteButtonEl = document.createElement('button');
        promoteButtonEl.type = 'button';
        promoteButtonEl.textContent = '⤴';
        promoteButtonEl.title = 'Quitar caja (Retroceso)';
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

    private onPointerCancel = (event: PointerEvent) => {
        if (!this.state.pointer.isDragging) return;
        if (this.appEl.hasPointerCapture(event.pointerId)) {
            this.appEl.releasePointerCapture(event.pointerId);
        }
        this.clearPointerState();
        this.clearDragHighlight();
        this.startAutoScroll();
    };

    private onKeyDown = (event: KeyboardEvent) => {
        if (this.state.editing.isEditing) {
            if (this.autocomplete.handleKeyDown(event)) {
                return;
            }
            if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault();
                this.finishEditing();
                return;
            }
            this.handleEditingFieldNavigation(event);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
            event.preventDefault();
            this.redo();
            return;
        }

        const selectedId = this.state.selectedNodeId;
        const selectedNode = (selectedId !== null) ? this.tree.getNode(selectedId) : null;
        const boxIsSelected = (selectedNode && selectedNode.type === 'box');
        if (boxIsSelected) {
            event.preventDefault();
            if (event.key === 'Enter') {
                this.startEditing();
            }
            else if (event.key === 'Backspace') {
                this.promoteChildren();
            }
            else if (event.key === 'Delete') {
                this.deleteNode();
            }
            else if (event.key === 'Escape') {
                this.selectNode(null);
            }
            return;
        }
    };

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
            this.clearDragHighlight();
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
        if (!this.state.pointer.isDragging) return;

        const MIN_PIXELS_MOVED = 20;
        
        const currentPos = this.getMousePosition(event);
        const rect = this.appEl.getBoundingClientRect();
        this.lastPointerX = event.clientX - rect.left;
        this.lastPointerY = event.clientY - rect.top;
        const didMove = (distance(this.state.pointer.startMousePosition, currentPos) > MIN_PIXELS_MOVED);
        const didJustStartMoving = (didMove && !this.state.pointer.didMove);
        this.state.pointer.didMove ||= didMove;
        if (didJustStartMoving) {
            if (this.state.editing.isEditing) this.finishEditing();
            this.selectNode(null);
            this.startAutoScroll();
        }

        this.updateDragSelection(event.clientX, didJustStartMoving);

        function distance(pos1: Position, pos2: Position): number {
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    private onPointerUp = (event: PointerEvent) => {
        if (!this.state.pointer.isDragging) return;

        if (!this.state.pointer.didMove) {
            const clicked = this.getClickedNode(event);
            if (clicked.didClickInput) return;
            const clickedId = clicked.nodeEl?.nodeId as number;
            this.clickNode(clickedId ?? null, event);
            this.clearPointerState();
            this.clearDragHighlight();
            return;
        }

        if (this.state.editing.isEditing) this.finishEditing();

        this.insertBoxAtRange(this.state.pointer.startWordToken, this.state.pointer.endWordToken);
        this.clearPointerState();
        this.clearDragHighlight();
        this.stopAutoScroll();
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

    private updateDragSelection(clientX: number, forceHighlightUpdate?: boolean) {
        if (!this.state.pointer.isDragging) return;
        const pointer = this.state.pointer;

        const underPointer = document.elementFromPoint(clientX, this.lastPointerY);
        let endWordToken = pointer.endWordToken as number | null ?? pointer.startWordToken;

        if (underPointer) {
            const wordContEl = underPointer.closest('.word-node') as HTMLDivElement | null;
            const wordEl = underPointer.closest('word-node') as WordNodeEl | null;
            if (wordEl && wordContEl) {
                endWordToken = (this.tree.getNode(wordEl.nodeId) as WordNode).token;
            }
        }

        const didChangeDragged = (pointer.endWordToken !== endWordToken);
        pointer.endWordToken = endWordToken;
        if (didChangeDragged || forceHighlightUpdate) {
            this.updateDragHighlight();
        }
    }

    private clearDragHighlight() {
        document.querySelectorAll('.drag-target').forEach((element) => {
            element.classList.remove('drag-target');
        });
    }

    private updateDragHighlight() {
        this.clearDragHighlight();
        if (!this.state.pointer.isDragging) return;

        let start = this.state.pointer.startWordToken;
        let end = this.state.pointer.endWordToken;
        if (start > end) [ start, end ] = [ end, start ];
        
        const draggedWords = this.tree.getWordsFromTokenRange(start, end);
        for (const word of draggedWords) {
            const wordEl = this.elementMapping.get(word.id) as WordNodeEl;
            wordEl.classList.add('drag-target');
        }
    }

    private clickNode(id: number | null, event?: PointerEvent) {
        const prevSelected = this.state.selectedNodeId;
        const clickedSame = (prevSelected === id) && (id !== null);
        const wasEditing = this.state.editing.isEditing;

        if (!wasEditing && clickedSame) {
            if (!event) throw new Error("`startEditing()` should be called with `event` parameter here");
            this.startEditing(event);
            return;
        }

        if (wasEditing) {
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
        if (selectedNode.type === 'word' || this.state.editing.isEditing) {
            this.selectionActionsEl.remove();
            return;
        }

        const selectedElement = this.elementMapping.get(id) as SyntaxNodeEl;

        selectedElement.appendChild(this.selectionActionsEl);
    }

    private showNotification(message: string, duration = 1800) {
        this.controls.notificationEl.textContent = message;
        if (this.notificationTimeout !== null) {
            window.clearTimeout(this.notificationTimeout);
        }
        this.notificationTimeout = window.setTimeout(() => {
            this.controls.notificationEl.textContent = '';
            this.notificationTimeout = null;
        }, duration);
    }

    private handleEditingFieldNavigation(event: KeyboardEvent) {
        if (!(event.target instanceof HTMLInputElement)) return;

        const inputs = this.getEditingInputElements();
        const currentIndex = inputs.findIndex((input) => input === event.target);
        if (currentIndex < 0) throw new Error("handleEditingFieldNavigation: event.target is not in the list of editing input elements");

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const caret = event.target.selectionStart ?? 0;
            const atStart = (caret <= 0);
            const atEnd = (caret >= (event.target.value.length));
            if (event.key === 'ArrowLeft' && atStart) {
                event.preventDefault();
                this.focusEditingInput(currentIndex - 1, true);
            }
            else if (event.key === 'ArrowRight' && atEnd) {
                event.preventDefault();
                this.focusEditingInput(currentIndex + 1, false);
            }
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusEditingInput(currentIndex - 1, true);
        }
        else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusEditingInput(currentIndex + 1, false);
        }
    }

    private getEditingInputElements(): HTMLInputElement[] {
        const elements = this.state.editing.elements;
        if (!elements) return [];

        if (this.state.editing.type === 'word') {
            return [elements.comment, elements.word].filter((input): input is HTMLInputElement => !!input);
        }

        return [elements.category, elements.function, elements.comment].filter((input): input is HTMLInputElement => !!input);
    }

    private focusEditingInput(index: number, atEnd: boolean) {
        const inputs = this.getEditingInputElements();
        if (index < 0 || index >= inputs.length) return; // TODO: Navigate between words

        const input = inputs[index];
        input.focus();
        const position = (atEnd) ? input.value.length : 0;
        input.setSelectionRange(position, position);
    }

    private startEditing(event?: PointerEvent) {
        let field = (event) ? getField(event) : null;
        const didFindField = !!field;

        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        this.state.editing = {
            isEditing: true,
            elements: element.startEdit(),
            type: element.type,
            field: null
        };
        this.autocomplete.connect(this.state.editing.elements);

        if (field === null) {
            field = (element.type === 'word') ? 'word' : 'function';
        }
        const inputEl = this.state.editing.elements?.[field];
        if (inputEl) { 
            requestAnimationFrame(() => {
                inputEl.focus();
                if (didFindField) inputEl.setSelectionRange(0, inputEl.value.length);
                else inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            });
        }
        this.state.editing.field = field;
        this.updateSelectionPanel();
        this.showNotification('Editando caja');

        function getField(event: PointerEvent): EditorState['editing']['field'] {
            const classNames = ['function', 'category', 'word', 'comment', 'word-comment'];

            const underPointer = document.elementFromPoint(event.clientX, event.clientY);
            const clicked = underPointer?.closest(`.${classNames.join(', .')}`);

            let foundClassName: string | null = null;
            for (const name of classNames) {
                if (clicked?.classList.contains(name)) {
                    foundClassName = name;
                    break;
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
        this.showNotification('Caja editada');
    }

    private resetEditingState() {
        this.autocomplete.connect(null);
        this.state.editing = {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        };
    }

    private deleteNode() {
        this.doDeleteAction(false);
        this.showNotification('Caja eliminada');
    }

    private promoteChildren() {
        this.doDeleteAction(true);
        this.showNotification('Caja quitada');
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
        if (insertedData.status === 'error') {
            this.showNotification('No se pudo crear la caja');
            return;
        }

        this.renderTree();
        this.selectNode(insertedData.newNodeId);
        this.startEditing();
        this.registerTreeChange(previousJSON);
        this.showNotification('Caja creada');
    }

    private startAutoScroll() {
        if (this.autoScrollAnimationFrame !== null) return;

        const tick = () => {
            if (!this.state.pointer.didMove) {
                this.autoScrollAnimationFrame = null;
                return;
            }
            this.updateAutoScroll();
            this.autoScrollAnimationFrame = requestAnimationFrame(tick);
        };
        tick();
    }

    private stopAutoScroll() {
        if (this.autoScrollAnimationFrame !== null) {
            cancelAnimationFrame(this.autoScrollAnimationFrame);
            this.autoScrollAnimationFrame = null;
        }
    }

    private updateAutoScroll() {
        const EDGE = 40;
        const rect = this.appEl.getBoundingClientRect();

        let speed = 0;
        if (this.lastPointerX < rect.left + EDGE) {
            speed = this.lastPointerX - EDGE;
        }
        else if (this.lastPointerX > rect.right - EDGE) {
            speed = EDGE - (rect.right - this.lastPointerX);
        }

        this.appEl.scrollLeft += speed * 0.5;
        this.updateDragSelection(this.lastPointerX + rect.left);
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
