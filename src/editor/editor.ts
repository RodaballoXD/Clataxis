import { AnyNodeEl, InputFieldEls, RootNodeEl, SyntaxNodeEl, WordNodeData, WordNodeEl } from "./elements.js";
import type { EditorInterfaceEls } from "./editor-screen.js";
import type { AnalysisData, NodeId, ReducedJSON, SyntaxNode, WordNode } from "./tree.js";
import { SyntaxTree } from "./tree.js";
import { FieldAutocomplete } from "./autocomplete.js";
import { GRAMMAR, type GuidedStepDefinition, type GuidedSyntagmaDefinition } from "../grammar/placeholder-grammar.js";
import type { GuidedEditorState } from "./guided-state.js";

const ZOOM_STEPS = [0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

export class SyntaxEditor {
    tree: SyntaxTree;
    rootEl: RootNodeEl;
    appEl: HTMLDivElement;
    private selectionActionsEl: HTMLDivElement;
    private onChange: (json: ReducedJSON) => void;
    private controls: EditorInterfaceEls;
    private zoom: number = 1;
    private notificationTimeout: number | null = null;
    private autocomplete = new FieldAutocomplete();
    private elementMapping: Map<NodeId, AnyNodeEl> = new Map();
    private autoScrollAnimationFrame: number | null = null;
    private lastPointerX = 0;
    private lastPointerY = 0;
    private guidedState: GuidedEditorState | null;

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
        guidedState: GuidedEditorState | null = null
    ) {
        this.tree = new SyntaxTree(json);
        this.rootEl = document.createElement('root-node') as RootNodeEl;
        this.appEl = document.getElementById('app') as HTMLDivElement;
        this.selectionActionsEl = this.createSelectionActions();
        this.onChange = onChange;
        this.controls = controls;
        this.guidedState = guidedState;
        this.validateGuidedState();
    }

    mount(container: HTMLElement) {
        container.appendChild(this.rootEl);
        this.renderTree();
        this.installListeners();
        this.installControlListeners();
        this.renderGuidedPanel();
    }

    destroy() {
        this.appEl.removeEventListener('pointerdown', this.onPointerDown);
        this.appEl.removeEventListener('pointermove', this.onPointerMove);
        this.appEl.removeEventListener('pointerup', this.onPointerUp);
        this.appEl.removeEventListener('pointercancel', this.onPointerCancel);
        document.removeEventListener('keydown', this.onKeyDown, true);
        this.controls.guidedPanelEl.removeEventListener('click', this.onGuidedPanelClick);
        this.autocomplete.destroy();
        if (this.notificationTimeout !== null) {
            window.clearTimeout(this.notificationTimeout);
        }
    }

    private renderTree() {
        this.validateGuidedState();
        const json = this.tree.getJSON();
        this.elementMapping = this.rootEl.build(json);
        if (this.state.selectedNodeId !== null) {
            this.selectNode(this.state.selectedNodeId);
        }
        this.updateGuidedFocus();
        this.renderGuidedPanel();
    }

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
        this.controls.zoomInButtonEl.addEventListener('click', () => this.changeZoom(true));
        this.controls.zoomOutButtonEl.addEventListener('click', () => this.changeZoom(false));
        this.controls.guidedPanelEl.addEventListener('click', this.onGuidedPanelClick);
    }

    private onGuidedPanelClick = (event: MouseEvent) => {
        if (!this.guidedState || !(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>('button[data-guided-action]');
        if (!button || button.disabled) return;

        const action = button.dataset.guidedAction;
        if (action === 'choose-none') {
            this.guidedState = { stage: 'steps', targetNodePath: null, syntagmaType: null, stepIndex: 0 };
            this.selectNode(null);
        } else if (action === 'next') {
            this.goToNextGuidedStep();
        } else if (action === 'previous') {
            this.goToPreviousGuidedStep();
        } else if (action === 'choose-type' && button.dataset.syntagmaType) {
            this.guidedState = {
                stage: 'steps',
                targetNodePath: this.guidedState.stage === 'choose-type' ? this.guidedState.targetNodePath : null,
                syntagmaType: button.dataset.syntagmaType,
                stepIndex: 0
            };
        }

        this.updateGuidedFocus();
        this.renderGuidedPanel();
    };

    private goToNextGuidedStep() {
        if (!this.guidedState) return;
        if (this.guidedState.stage === 'choose-target') {
            if (this.guidedState.candidateNodePath === null) return;
            this.guidedState = { stage: 'choose-type', targetNodePath: this.guidedState.candidateNodePath };
            return;
        }
        if (this.guidedState.stage !== 'steps') return;

        const steps = this.getCurrentGuidedSteps();
        if (this.guidedState.stepIndex < steps.length - 1) {
            this.guidedState.stepIndex++;
        } else {
            this.guidedState = { stage: 'choose-target', candidateNodePath: null };
            this.selectNode(null);
        }
    }

    private goToPreviousGuidedStep() {
        if (!this.guidedState) return;
        if (this.guidedState.stage === 'choose-type') {
            const targetNodeId = this.getGuidedTargetNodeId();
            this.guidedState = { stage: 'choose-target', candidateNodePath: this.guidedState.targetNodePath };
            this.selectNode(targetNodeId);
            return;
        }
        if (this.guidedState.stage !== 'steps') return;

        if (this.guidedState.stepIndex > 0) {
            this.guidedState.stepIndex--;
        } else if (this.guidedState.targetNodePath === null) {
            this.guidedState = { stage: 'choose-target', candidateNodePath: null };
            this.selectNode(null);
        } else {
            const targetNodeId = this.getGuidedTargetNodeId();
            this.guidedState = { stage: 'choose-type', targetNodePath: this.guidedState.targetNodePath };
            this.selectNode(targetNodeId);
        }
    }

    private getCurrentGuidedSteps(): GuidedStepDefinition[] {
        if (!this.guidedState || this.guidedState.stage !== 'steps') return [];
        if (this.guidedState.syntagmaType === null) return GRAMMAR.sentenceSteps;
        return this.getGuidedSyntagma(this.guidedState.syntagmaType)?.steps ?? [];
    }

    private getGuidedSyntagma(value: string): GuidedSyntagmaDefinition | undefined {
        return GRAMMAR.guidedSyntagmas.find((syntagma) => syntagma.value === value);
    }

    private renderGuidedPanel() {
        const panel = this.controls.guidedPanelEl;
        panel.replaceChildren();
        panel.hidden = !this.guidedState;
        if (!this.guidedState) return;

        if (this.guidedState.stage === 'choose-target') {
            this.addGuidedText(panel, 'h2', 'Elige qué analizar');
            this.addGuidedText(panel, 'p', 'Haz clic en una caja del árbol y pulsa Siguiente, o elige analizar la oración completa.');
            const candidateNodeId = this.getGuidedTargetNodeId();
            if (candidateNodeId !== null) {
                this.addGuidedText(panel, 'p', this.getNodeLabel(candidateNodeId));
            }
            const actions = this.createGuidedActions();
            actions.append(
                this.createGuidedButton('Anterior', 'previous', true),
                this.createGuidedButton('Oración completa', 'choose-none'),
                this.createGuidedButton('Siguiente', 'next', candidateNodeId === null)
            );
            panel.appendChild(actions);
            return;
        }

        if (this.guidedState.stage === 'choose-type') {
            this.addGuidedText(panel, 'h2', '¿Qué tipo de sintagma es?');
            const targetNodeId = this.getGuidedTargetNodeId();
            if (targetNodeId !== null) this.addGuidedText(panel, 'p', this.getNodeLabel(targetNodeId));
            const types = document.createElement('div');
            types.className = 'guided-type-options';
            for (const syntagma of GRAMMAR.guidedSyntagmas) {
                const button = this.createGuidedButton(`${syntagma.value} · ${syntagma.fullName}`, 'choose-type');
                button.dataset.syntagmaType = syntagma.value;
                types.appendChild(button);
            }
            panel.appendChild(types);
            const actions = this.createGuidedActions();
            actions.appendChild(this.createGuidedButton('Anterior', 'previous'));
            panel.appendChild(actions);
            return;
        }

        const steps = this.getCurrentGuidedSteps();
        const currentStep = steps[this.guidedState.stepIndex];
        const title = this.guidedState.syntagmaType
            ? `Análisis de ${this.guidedState.syntagmaType}`
            : 'Análisis de oración simple';
        this.addGuidedText(panel, 'h2', title);
        this.addGuidedText(panel, 'p', `Paso ${this.guidedState.stepIndex + 1} de ${steps.length}`);
        this.addGuidedText(panel, 'p', currentStep?.description ?? 'No hay pasos definidos.');
        const actions = this.createGuidedActions();
        actions.append(
            this.createGuidedButton('Anterior', 'previous'),
            this.createGuidedButton('Siguiente', 'next')
        );
        panel.appendChild(actions);
    }

    private createGuidedActions(): HTMLDivElement {
        const actions = document.createElement('div');
        actions.className = 'guided-actions';
        return actions;
    }

    private createGuidedButton(text: string, action: string, disabled = false): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.dataset.guidedAction = action;
        button.disabled = disabled;
        return button;
    }

    private addGuidedText(parent: HTMLElement, tag: 'h2' | 'p', text: string) {
        const element = document.createElement(tag);
        element.textContent = text;
        parent.appendChild(element);
    }

    private getNodeLabel(id: number): string {
        const node = this.tree.getNode(id) as SyntaxNode;
        const words = this.tree.getWordsFromTokenRange(node.startToken, node.endToken).map((word) => word.word);
        return words.join(' ');
    }

    private validateGuidedState() {
        if (!this.guidedState) return;
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        if (nodePath === null || this.tree.getBoxNodeIdAtPath(nodePath) !== null) return;
        this.guidedState = { stage: 'choose-target', candidateNodePath: null };
    }

    private getGuidedTargetNodeId(): number | null {
        if (!this.guidedState || this.guidedState.stage === 'steps' && this.guidedState.targetNodePath === null) return null;
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        return nodePath === null ? null : this.tree.getBoxNodeIdAtPath(nodePath);
    }

    private updateGuidedFocus() {
        if (!this.guidedState) return;
        const targetNodeId = this.guidedState.stage === 'choose-target' ? null : this.getGuidedTargetNodeId();

        for (const [nodeId, element] of this.elementMapping) {
            const inScope = targetNodeId === null || this.isWithinScope(nodeId, targetNodeId);
            element.classList.toggle('guided-outside', !inScope);
            element.classList.toggle('guided-focus', nodeId === targetNodeId);
        }
    }

    private isWithinScope(nodeId: NodeId, scopeId: number): boolean {
        let currentId = nodeId;
        while (currentId !== 'root') {
            if (currentId === scopeId) return true;
            currentId = this.tree.getParentId(currentId);
        }
        return false;
    }

    private canInteractWithNode(nodeId: NodeId): boolean {
        if (!this.guidedState) return true;
        if (this.guidedState.stage === 'choose-target') return false;
        const targetId = this.getGuidedTargetNodeId();
        return targetId === null || this.isWithinScope(nodeId, targetId);
    }

    private isTargetNode(nodeId: number): boolean {
        return !!this.guidedState
            && this.guidedState.stage !== 'choose-target'
            && this.getGuidedTargetNodeId() === nodeId;
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
        const clicked = this.getClickedNode(event);
        if (clicked.didClickInput) return;

        if (this.guidedState?.stage === 'choose-target') {
            if (clicked.type === 'syntax') {
                const candidateNodeId = clicked.nodeEl.nodeId as number;
                this.guidedState = { stage: 'choose-target', candidateNodePath: this.tree.getNodePath(candidateNodeId) };
                this.selectNode(candidateNodeId);
                this.renderGuidedPanel();
            }
            return;
        }
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

        if (this.guidedState?.stage === 'choose-target' || this.isTargetNode(id)) {
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
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusEditingInput(currentIndex + 1, false);
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            let nextIndex = (event.shiftKey) ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex < 0) nextIndex = inputs.length - 1;
            if (nextIndex >= inputs.length) nextIndex = 0;
            this.focusEditingInput(nextIndex, event.shiftKey);
            return;
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
        if (!this.canInteractWithNode(id)) return;

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

        if (element.type === 'word'
            && this.wouldRemoveGuidedBoundaryWord(id, this.state.editing.elements?.word?.value ?? '')) {
            this.resetEditingState();
            element.finishEdit();
            this.renderTree();
            this.showNotification('No se puede vaciar la última palabra del sintagma');
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
        if (this.guidedState?.stage === 'choose-target' || this.isTargetNode(id)) return;
        if (!this.canInteractWithNode(id)) return;
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
        if (this.guidedState?.stage === 'choose-target') return;
        const guidedTargetNodeId = this.getGuidedTargetNodeId();
        if (this.guidedState && guidedTargetNodeId !== null) {
            const words = this.tree.getWordsFromTokenRange(startToken, endToken);
            if (words.length === 0 || words.some((word) => !this.canInteractWithNode(word.id))) return;
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

    private wouldRemoveGuidedBoundaryWord(nodeId: number, proposedWord: string): boolean {
        if (!this.guidedState || this.guidedState.stage === 'choose-target'
            || this.getGuidedTargetNodeId() === null || proposedWord.trim()) return false;
        if (!this.canInteractWithNode(nodeId)) return false;

        const target = this.tree.getNode(this.getGuidedTargetNodeId() as number) as SyntaxNode;
        const words = this.tree.getWordsFromTokenRange(target.startToken, target.endToken);
        return words.length === 1 && words[0].id === nodeId;
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

function sameReducedJSON(a: ReducedJSON, b: ReducedJSON): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function cloneReducedJSON(json: ReducedJSON): ReducedJSON {
    return JSON.parse(JSON.stringify(json)) as ReducedJSON;
}
