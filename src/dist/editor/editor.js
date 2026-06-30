import { SyntaxTree } from "./tree.js";
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
export class SyntaxEditor {
    constructor(json, onChange = () => { }, controls = null) {
        this.zoom = 1;
        this.undoStack = [];
        this.redoStack = [];
        this.elementMapping = new Map();
        this.state = {
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
        this.onPointerDown = (event) => {
            const clicked = this.getClickedNode(event);
            if (clicked.didClickInput)
                return;
            if (clicked.type === 'word') {
                const wordToken = this.tree.getNode(clicked.nodeEl.nodeId).token;
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
                const clickedId = clicked.nodeEl.nodeId;
                this.clickNode(clickedId, event);
            }
        };
        this.onPointerMove = (event) => {
            var _a;
            if (!this.state.pointer.isDragging || this.state.editing.isEditing)
                return;
            const MIN_PIXELS_MOVED = 20;
            const currentPos = this.getMousePosition(event);
            const didMove = (distance(this.state.pointer.startMousePosition, currentPos) > MIN_PIXELS_MOVED);
            (_a = this.state.pointer).didMove || (_a.didMove = didMove);
            let endWordToken;
            const clicked = this.getClickedNode(event);
            if (clicked.type !== 'word') {
                endWordToken = this.state.pointer.endWordToken ?? this.state.pointer.startWordToken;
            }
            else {
                endWordToken = this.tree.getNode(clicked.nodeEl.nodeId).token;
            }
            this.state.pointer.endWordToken = endWordToken;
            function distance(pos1, pos2) {
                const dx = pos1.x - pos2.x;
                const dy = pos1.y - pos2.y;
                return Math.sqrt(dx * dx + dy * dy);
            }
        };
        this.onPointerUp = (event) => {
            if (!this.state.pointer.isDragging)
                return;
            if (!this.state.pointer.didMove) {
                this.clearPointerState();
                const clicked = this.getClickedNode(event);
                if (clicked.didClickInput)
                    return;
                const clickedId = clicked.nodeEl?.nodeId;
                this.clickNode(clickedId ?? null, event);
                return;
            }
            this.insertBoxAtRange(this.state.pointer.startWordToken, this.state.pointer.endWordToken);
            this.clearPointerState();
        };
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node');
        this.appEl = document.getElementById('app');
        this.selectionActionsEl = this.createSelectionActions();
        this.onChange = onChange;
        this.controls = controls;
    }
    mount(container) {
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
    renderTree() {
        const json = this.tree.getJSON();
        this.elementMapping = this.rootEl.build(json);
        if (this.state.selectedNodeId !== null) {
            this.selectNode(this.state.selectedNodeId);
        }
    }
    notifyChange() {
        this.onChange(this.tree.toReducedJSON());
    }
    snapshot() {
        return cloneReducedJSON(this.tree.toReducedJSON());
    }
    restoreSnapshot(json) {
        this.state.selectedNodeId = null;
        this.resetEditingState();
        this.tree = new SyntaxTree(cloneReducedJSON(json));
        this.renderTree();
        this.notifyChange();
        this.updateHistoryButtons();
    }
    registerTreeChange(previousJSON) {
        const currentJSON = this.tree.toReducedJSON();
        if (sameReducedJSON(previousJSON, currentJSON))
            return;
        this.undoStack.push(cloneReducedJSON(previousJSON));
        this.redoStack = [];
        this.notifyChange();
        this.updateHistoryButtons();
    }
    undo() {
        const previous = this.undoStack.pop();
        if (!previous)
            return;
        this.redoStack.push(this.snapshot());
        this.restoreSnapshot(previous);
    }
    redo() {
        const next = this.redoStack.pop();
        if (!next)
            return;
        this.undoStack.push(this.snapshot());
        this.restoreSnapshot(next);
    }
    installControlListeners() {
        if (!this.controls)
            return;
        this.controls.zoomInButtonEl.addEventListener('click', () => this.changeZoom(ZOOM_STEP));
        this.controls.zoomOutButtonEl.addEventListener('click', () => this.changeZoom(-ZOOM_STEP));
        this.controls.undoButtonEl.addEventListener('click', () => this.undo());
        this.controls.redoButtonEl.addEventListener('click', () => this.redo());
    }
    changeZoom(delta) {
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom + delta));
        this.zoom = Math.round(nextZoom * 100) / 100;
        this.rootEl.style.zoom = String(this.zoom);
    }
    updateHistoryButtons() {
        if (!this.controls)
            return;
        this.controls.undoButtonEl.disabled = this.undoStack.length === 0;
        this.controls.redoButtonEl.disabled = this.redoStack.length === 0;
    }
    installListeners() {
        this.appEl.addEventListener('pointerdown', this.onPointerDown);
        this.appEl.addEventListener('pointermove', this.onPointerMove);
        this.appEl.addEventListener('pointerup', this.onPointerUp);
    }
    createSelectionActions() {
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
    getClickedNode(event) {
        const underPointer = document.elementFromPoint(event.clientX, event.clientY);
        if (!underPointer)
            return { type: null, nodeEl: null, didClickInput: false };
        const didClickInput = !!underPointer.closest('input, button, textarea');
        const wordContEl = underPointer?.closest('.word-node'); // whitespace of 'word-node' should return null
        const wordEl = underPointer?.closest('word-node');
        if (wordEl && wordContEl)
            return { type: 'word', nodeEl: wordEl, didClickInput };
        const syntaxEl = underPointer?.closest('syntax-node');
        if (syntaxEl && !wordEl)
            return { type: 'syntax', nodeEl: syntaxEl, didClickInput };
        return { type: null, nodeEl: null, didClickInput };
    }
    getMousePosition(event) {
        const rect = this.rootEl.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }
    clearPointerState() {
        this.state.pointer = {
            isDragging: false,
            pointerId: null,
            startWordToken: null,
            endWordToken: null,
            didMove: false,
            startMousePosition: null
        };
    }
    clickNode(id, event) {
        const prevSelected = this.state.selectedNodeId;
        const clickedSame = (prevSelected === id) && (id !== null);
        const wasEditing = this.state.editing.isEditing;
        if (wasEditing && clickedSame) {
            return;
        }
        if (!wasEditing && clickedSame) {
            if (!event)
                throw new Error("Attempted to `startEditing()` with no `event` parameter");
            this.startEditing(event);
            return;
        }
        if (wasEditing && !clickedSame) {
            this.finishEditing();
        }
        this.selectNode(id);
    }
    selectNode(id) {
        const oldSelectedId = this.state.selectedNodeId;
        if (oldSelectedId !== null) {
            const oldElement = this.elementMapping.get(oldSelectedId);
            oldElement.deselect();
        }
        if (id !== null) {
            const newElement = this.elementMapping.get(id);
            newElement.select();
        }
        this.state.selectedNodeId = id;
        this.updateSelectionPanel();
    }
    updateSelectionPanel() {
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
        const selectedElement = this.elementMapping.get(id);
        selectedElement.appendChild(this.selectionActionsEl);
    }
    startEditing(event) {
        let field = getField(event);
        const id = this.state.selectedNodeId;
        if (id === null)
            throw new Error("Cannot edit unselected node");
        const element = this.elementMapping.get(id);
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
        function getField(event) {
            const classNames = ['function', 'category', 'word', 'comment', 'word-comment'];
            const underPointer = document.elementFromPoint(event.clientX, event.clientY);
            const clicked = underPointer?.closest(`.${classNames.join(', .')}`);
            let foundClassName = null;
            for (const name of classNames) {
                if (clicked?.classList.contains(name)) {
                    foundClassName = name;
                }
            }
            if (foundClassName === 'word-comment')
                foundClassName = 'comment';
            return foundClassName;
        }
    }
    finishEditing() {
        const id = this.state.selectedNodeId;
        if (id === null)
            throw new Error("Cannot edit unselected node");
        const element = this.elementMapping.get(id);
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
            this.tree.setNodeAnalysis(node.id, analysis);
        }
        this.renderTree();
        this.registerTreeChange(previousJSON);
    }
    resetEditingState() {
        this.state.editing = {
            isEditing: false,
            type: null,
            field: null,
            elements: null
        };
    }
    deleteNode() {
        this.doDeleteAction(false);
    }
    promoteChildren() {
        this.doDeleteAction(true);
    }
    doDeleteAction(keepChildren) {
        const id = this.state.selectedNodeId;
        if (id === null)
            return;
        const selected = this.tree.getNode(id);
        if (selected.type === 'word')
            return;
        const previousJSON = this.snapshot();
        const parentId = this.tree.getParentId(id);
        if (keepChildren) {
            this.tree.promoteChildren(id);
        }
        else {
            this.tree.deleteNode(id);
        }
        const nextSelectedId = (parentId === 'root') ? null : parentId;
        this.state.selectedNodeId = null; // So renderTree doesn't try to select the deleted node
        this.renderTree();
        this.selectNode(nextSelectedId);
        this.registerTreeChange(previousJSON);
    }
    insertBoxAtRange(startToken, endToken) {
        if (startToken > endToken) {
            [endToken, startToken] = [startToken, endToken];
        }
        const previousJSON = this.snapshot();
        const insertedData = this.tree.insertBoxAtRange(startToken, endToken);
        if (insertedData.status === 'error')
            return; // TODO: Message for user
        this.renderTree();
        this.selectNode(insertedData.newNodeId);
        this.registerTreeChange(previousJSON);
    }
}
function cloneReducedJSON(json) {
    return JSON.parse(JSON.stringify(json));
}
function sameReducedJSON(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
//# sourceMappingURL=editor.js.map