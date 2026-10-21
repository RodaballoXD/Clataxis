import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import type { EditorInterfaceEls } from "./editor-screen.js";
import type { AnalysisData, NodeId, ReducedJSON, SyntaxNode, WordNode } from "./tree.js";
import { SyntaxTree } from "./tree.js";
import { FieldAutocomplete } from "./autocomplete.js";

const ZOOM_STEPS = [0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

export class SyntaxEditor {
    readonly supportsHistory: boolean = true;
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    appEl: HTMLDivElement;
    private selectionActionsEl: HTMLDivElement;
    private onChange: (json: ReducedJSON) => void;
    private controls: EditorInterfaceEls;
    private zoom: number = 1;
    private notificationTimeout: number | null = null;
    private autocomplete = new FieldAutocomplete();
    protected elementMapping: Map<NodeId, AnyNodeEl> = new Map();
    private autoScrollAnimationFrame: number | null = null;
    private lastPointerX = 0;
    private lastPointerY = 0;
    private resizeDrag: ResizeDragData | null = null;

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

    constructor(
        json: ReducedJSON,
        onChange: (json: ReducedJSON) => void = () => {},
        controls: EditorInterfaceEls,
        initialZoom = 1
    ) {
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node') as RootNodeEl;
        this.zoom = initialZoom;
        this.appEl = document.getElementById('app') as HTMLDivElement;
        this.selectionActionsEl = this.createSelectionActions();
        this.onChange = onChange;
        this.controls = controls;
    }

    mount(container: HTMLElement) {
        container.appendChild(this.rootEl);
        this.rootEl.style.zoom = String(this.zoom);
        this.renderTree();
        this.installListeners();
        this.installControlListeners();
    }

    get zoomLevel(): number {
        return this.zoom;
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

    protected renderTree() {
        const json = this.tree.getJSON();
        this.elementMapping = this.rootEl.build(json);
        this.onTreeRendered();
        if (this.state.selectedNodeId !== null) {
            this.selectNode(this.state.selectedNodeId);
        }
    }

    protected onTreeRendered() {}

    private notifyChange() {
        this.onChange(this.tree.toReducedJSON());
    }

    private snapshot(): ReducedJSON {
        return cloneReducedJSON(this.tree.toReducedJSON());
    }

    private registerTreeChange(previousJSON: ReducedJSON) {
        const currentJSON = this.tree.toReducedJSON();
        if (sameReducedJSON(previousJSON, currentJSON)) return;

        this.notifyChange();
    }

    private installControlListeners() {
        this.controls.zoomInButtonEl.addEventListener('click', () => {
            this.commitPendingEdit();
            this.changeZoom(true);
        });
        this.controls.zoomOutButtonEl.addEventListener('click', () => {
            this.commitPendingEdit();
            this.changeZoom(false);
        });
    }

    protected handleModePointerDown(_event: PointerEvent, _clicked: ClickedData): boolean {
        return false;
    }

    protected handleModeKeyDown(_event: KeyboardEvent): boolean {
        return false;
    }

    protected canInteractWithNode(_nodeId: NodeId): boolean {
        return true;
    }

    protected canResizeNode(nodeId: number): boolean {
        return this.canInteractWithNode(nodeId);
    }

    protected hideSelectionActionsForNode(_nodeId: number): boolean {
        return false;
    }

    protected canDeleteNode(nodeId: number): boolean {
        return this.canInteractWithNode(nodeId);
    }

    protected canInsertBoxAtRange(startToken: number, endToken: number): boolean {
        const words = this.tree.getWordsFromTokenRange(startToken, endToken);
        return words.length > 0 && words.every((word) => this.canInteractWithNode(word.id));
    }

    protected getWordEditError(_nodeId: number, _proposedWord: string): string | null {
        return null;
    }

    private changeZoom(isIn: boolean) {
        const currentIndex = ZOOM_STEPS.indexOf(this.zoom);
        const nextIndex = (isIn) ? Math.min(currentIndex + 1, ZOOM_STEPS.length - 1) : Math.max(currentIndex - 1, 0);
        const nextZoom = ZOOM_STEPS[nextIndex];
        this.zoom = Math.round(nextZoom * 100) / 100;

        const scrollbarProgress = this.getScrollbarProgress();
        this.rootEl.style.zoom = String(this.zoom);
        this.appEl.scrollLeft = scrollbarProgress * (this.appEl.scrollWidth - this.appEl.clientWidth);
        this.showNotification(`Zoom ${this.zoom.toFixed(2).replace(/\.0$/, '')}x`);
    }

    private getScrollbarProgress(): number {
        const scrollLeft = this.appEl.scrollLeft;
        const scrollWidth = this.appEl.scrollWidth - this.appEl.clientWidth;
        if (scrollWidth <= 0) return 0.5;
        return scrollLeft / scrollWidth;
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
        deleteButtonEl.title = 'Eliminar caja (Suprimir)';
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
        if (this.resizeDrag?.pointerId === event.pointerId) {
            this.cancelResizeDrag();
            return;
        }
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

        if (event.key === 'Escape' && this.resizeDrag !== null) {
            event.preventDefault();
            this.cancelResizeDrag();
            return;
        }

        if (this.handleModeKeyDown(event)) return;

        if (event.key === '+') {
            event.preventDefault();
            this.changeZoom(true);
            return;
        }
        if (event.key === '-') {
            event.preventDefault();
            this.changeZoom(false);
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

        if (event.key === 'Escape' && this.state.pointer.isDragging) {
            this.clearPointerState();
            this.clearDragHighlight();
            this.stopAutoScroll();
            return;
        }
    };

    private onPointerDown = (event: PointerEvent) => {
        if (event.target instanceof Element) {
            const handle = event.target.closest<HTMLButtonElement>('.resize-handle');
            const syntaxEl = handle?.closest('syntax-node') as SyntaxNodeEl | null;
            if (handle && syntaxEl) {
                const nodeId = syntaxEl.nodeId;
                const node = this.tree.getNode(nodeId);
                const edge = handle.classList.contains('start') ? 'start' : 'end';
                if (node.type === 'box'
                    && this.state.selectedNodeId === nodeId
                    && !this.state.editing.isEditing
                    && this.canResizeNode(nodeId)) {
                    event.preventDefault();
                    this.resizeDrag = { nodeId, edge, pointerId: event.pointerId };
                    this.appEl.setPointerCapture(event.pointerId);
                }
                return;
            }
        }

        const clicked = this.getClickedNode(event);
        if (clicked.didClickInput) return;

        if (this.handleModePointerDown(event, clicked)) return;
        if (clicked.nodeEl && !this.canInteractWithNode(clicked.nodeEl.nodeId)) return;
        
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
        if (this.resizeDrag !== null) return;
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
        if (this.resizeDrag?.pointerId === event.pointerId) {
            this.finishResizeDrag(event);
            return;
        }
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

    private finishResizeDrag(event: PointerEvent) {
        const resize = this.resizeDrag;
        if (!resize) return;

        this.resizeDrag = null;
        if (this.appEl.hasPointerCapture(event.pointerId)) {
            this.appEl.releasePointerCapture(event.pointerId);
        }

        const token = this.getWordTokenAtClientX(event.clientX);
        if (token === null) {
            this.showNotification('No se pudo determinar la palabra de destino');
            return;
        }

        const previousJSON = this.snapshot();
        const result = this.tree.resizeNode(resize.nodeId, token, resize.edge);
        if (typeof result === 'string') {
            this.showNotification(result);
            return;
        }
        if (!result) {
            this.showNotification('La caja no cambió');
            return;
        }

        this.renderTree();
        this.registerTreeChange(previousJSON);
        this.showNotification('Caja redimensionada');
    }

    private cancelResizeDrag() {
        const resize = this.resizeDrag;
        if (!resize) return;

        this.resizeDrag = null;
        if (this.appEl.hasPointerCapture(resize.pointerId)) {
            this.appEl.releasePointerCapture(resize.pointerId);
        }
    }

    private getWordTokenAtClientX(clientX: number): number | null {
        const root = this.tree.getJSON();
        const words = this.tree.getWordsFromTokenRange(root.startToken, root.endToken);
        if (words.length === 0) return null;

        let nearestToken: number | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const word of words) {
            const wordEl = this.elementMapping.get(word.id) as WordNodeEl | undefined;
            if (!wordEl) continue;
            const rect = wordEl.getBoundingClientRect();
            const distance = Math.abs(clientX - (rect.left + rect.right) / 2);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestToken = word.token;
            }
        }
        return nearestToken;
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
                if (!this.canInteractWithNode(wordEl.nodeId)) return;
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

    protected selectNode(id: number | null) {
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
        selectedElement.classList.toggle(
            'resize-disabled',
            this.state.editing.isEditing || !this.canResizeNode(id)
        );
        if (this.state.editing.isEditing || this.hideSelectionActionsForNode(id)) {
            this.selectionActionsEl.remove();
            return;
        }

        selectedElement.appendChild(this.selectionActionsEl);
    }

    protected showNotification(message: string, duration = 1800) {
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
            if (this.state.editing.type === 'word') {
                if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                if (event.target.selectionStart !== event.target.selectionEnd) return;

                const caret = event.target.selectionStart ?? 0;
                const atEdge = event.key === 'ArrowLeft'
                    ? caret <= 0
                    : caret >= event.target.value.length;
                if (!atEdge) return;

                const direction = event.key === 'ArrowRight' ? 1 : -1;
                if (this.navigateToNeighborWord(direction, event.target)) {
                    event.preventDefault();
                }
            }
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusEditingInput(currentIndex - 1, true);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusEditingInput(currentIndex + 1, false);
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            this.focusNextEditingInput(event.target, event.shiftKey);
            return;
        }
    }

    private navigateToNeighborWord(direction: -1 | 1, input: HTMLInputElement): boolean {
        const currentId = this.state.selectedNodeId;
        if (currentId === null) return false;

        const root = this.tree.getJSON();
        const words = this.tree.getWordsFromTokenRange(root.startToken, root.endToken);
        const currentIndex = words.findIndex((word) => word.id === currentId);
        const neighbor = words[currentIndex + direction];
        if (currentIndex < 0 || !neighbor || !this.canInteractWithNode(neighbor.id)) return false;

        const field = input === this.state.editing.elements?.comment ? 'comment' : 'word';
        const editedWord = this.state.editing.elements?.word?.value ?? '';
        if (this.getWordEditError(currentId, editedWord) !== null) {
            this.finishEditing();
            return true;
        }

        const trimmedWord = editedWord.trim();
        const replacementCount = trimmedWord ? trimmedWord.split(/\s+/).length : 0;
        this.finishEditing();

        const updatedRoot = this.tree.getJSON();
        const updatedWords = this.tree.getWordsFromTokenRange(updatedRoot.startToken, updatedRoot.endToken);
        const destinationIndex = currentIndex + (direction < 0 ? -1 : replacementCount);
        const destination = updatedWords[destinationIndex];
        if (!destination) return true;

        this.selectNode(destination.id);
        this.startEditing(undefined, field, (direction === -1));
        return true;
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
        if (index < 0 || index >= inputs.length) return;

        const input = inputs[index];
        input.focus();
        const position = (atEnd) ? input.value.length : 0;
        input.setSelectionRange(position, position);
    }

    private focusNextEditingInput(currentInput: HTMLInputElement, shiftKey = false) {
        const inputs = this.getEditingInputElements();
        const currentIndex = inputs.indexOf(currentInput);
        if (currentIndex < 0) return;

        const direction = shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + direction + inputs.length) % inputs.length;
        this.focusEditingInput(nextIndex, shiftKey);
    }

    private startEditing(event?: PointerEvent, preferredField?: EditorState['editing']['field'], caretAtEnd = true) {
        let field = (event) ? getField(event) : null;
        const didFindField = !!field;

        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");
        if (!this.canInteractWithNode(id)) return;

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        this.state.editing = {
            isEditing: true,
            elements: element.startEdit(),
            type: element.type,
            field: null
        };
        this.autocomplete.connect(
            this.state.editing.elements,
            (input) => this.focusNextEditingInput(input)
        );

        if (preferredField !== undefined) {
            field = preferredField;
        }
        if (field === null) {
            field = (element.type === 'word') ? 'word' : 'function';
        }
        const inputEl = this.state.editing.elements?.[field];
        if (inputEl) {
            requestAnimationFrame(() => {
                inputEl.focus();
                if (didFindField) inputEl.setSelectionRange(0, inputEl.value.length);
                else {
                    const position = caretAtEnd ? inputEl.value.length : 0;
                    inputEl.setSelectionRange(position, position);
                }
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

    commitPendingEdit() {
        if (this.state.editing.isEditing) this.finishEditing();
    }

    protected finishEditing(shouldRender = true) {
        const id = this.state.selectedNodeId;
        if (id === null) throw new Error("Cannot edit unselected node");

        const element = this.elementMapping.get(id) as SyntaxNodeEl | WordNodeEl;
        const node = this.tree.getNode(id);
        const previousJSON = this.snapshot();

        const wordEditError = element.type === 'word'
            ? this.getWordEditError(id, this.state.editing.elements?.word?.value ?? '')
            : null;
        if (wordEditError !== null) {
            this.resetEditingState();
            element.finishEdit();
            if (shouldRender) this.renderTree();
            this.showNotification(wordEditError);
            return;
        }

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

        if (shouldRender) this.renderTree();
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
        if (!this.canDeleteNode(id)) return;
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
        if (!this.canInsertBoxAtRange(startToken, endToken)) return;
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

export type ClickedData = { type: null, nodeEl: null, didClickInput: boolean } | { type: 'word', nodeEl: WordNodeEl, didClickInput: boolean } | { type: 'syntax', nodeEl: SyntaxNodeEl, didClickInput: boolean };

interface Position {
    x: number;
    y: number;
}

interface ResizeDragData {
    nodeId: number;
    edge: 'start' | 'end';
    pointerId: number;
}

function sameReducedJSON(a: ReducedJSON, b: ReducedJSON): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function cloneReducedJSON(json: ReducedJSON): ReducedJSON {
    return JSON.parse(JSON.stringify(json)) as ReducedJSON;
}
