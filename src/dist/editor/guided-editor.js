import { GRAMMAR } from "../grammar/placeholder-grammar.js";
import { SyntaxEditor } from "./editor.js";
import { createGuidedEditorState } from "./guided-state.js";
export class GuidedSyntaxEditor extends SyntaxEditor {
    constructor(json, onChange, controls) {
        super(json, onChange, controls);
        this.supportsHistory = false;
        this.guidedState = createGuidedEditorState();
        this.onGuidedPanelClick = (event) => {
            if (!(event.target instanceof Element))
                return;
            const button = event.target.closest('button[data-guided-action]');
            if (!button || button.disabled)
                return;
            if (this.state.editing.isEditing)
                this.finishEditing(false);
            const action = button.dataset.guidedAction;
            if (action === 'choose-none') {
                this.guidedState = { stage: 'steps', targetNodePath: null, syntagmaType: null, stepIndex: 0 };
                this.selectNode(null);
            }
            else if (action === 'next') {
                this.goToNextGuidedStep();
            }
            else if (action === 'previous') {
                this.goToPreviousGuidedStep();
            }
            else if (action === 'choose-type' && button.dataset.syntagmaType) {
                this.guidedState = {
                    stage: 'steps',
                    targetNodePath: this.guidedState.stage === 'choose-type' ? this.guidedState.targetNodePath : null,
                    syntagmaType: button.dataset.syntagmaType,
                    stepIndex: 0
                };
            }
            this.renderTree();
        };
        this.guidedPanelEl = controls.guidedPanelEl;
    }
    mount(container) {
        this.guidedPanelEl.addEventListener('click', this.onGuidedPanelClick);
        super.mount(container);
    }
    destroy() {
        this.guidedPanelEl.removeEventListener('click', this.onGuidedPanelClick);
        super.destroy();
    }
    onTreeRendered() {
        this.validateGuidedState();
        this.updateGuidedFocus();
        this.renderGuidedPanel();
    }
    handleModePointerDown(_event, clicked) {
        if (this.guidedState.stage !== 'choose-target')
            return false;
        if (clicked.type === 'syntax') {
            const candidateNodeId = clicked.nodeEl.nodeId;
            this.guidedState = {
                stage: 'choose-target',
                candidateNodePath: this.tree.getNodePath(candidateNodeId)
            };
            this.selectNode(candidateNodeId);
            this.renderGuidedPanel();
        }
        return true;
    }
    canInteractWithNode(nodeId) {
        if (this.guidedState.stage === 'choose-target')
            return false;
        const targetId = this.getGuidedTargetNodeId();
        return targetId === null || this.isWithinScope(nodeId, targetId);
    }
    hideSelectionActionsForNode(nodeId) {
        return this.guidedState.stage === 'choose-target' || this.isTargetNode(nodeId);
    }
    canDeleteNode(nodeId) {
        return this.guidedState.stage !== 'choose-target'
            && !this.isTargetNode(nodeId)
            && super.canDeleteNode(nodeId);
    }
    canInsertBoxAtRange(startToken, endToken) {
        return this.guidedState.stage !== 'choose-target'
            && super.canInsertBoxAtRange(startToken, endToken);
    }
    getWordEditError(nodeId, proposedWord) {
        if (this.guidedState.stage === 'choose-target'
            || this.getGuidedTargetNodeId() === null
            || proposedWord.trim()
            || !this.canInteractWithNode(nodeId))
            return null;
        const target = this.tree.getNode(this.getGuidedTargetNodeId());
        const words = this.tree.getWordsFromTokenRange(target.startToken, target.endToken);
        return words.length === 1 && words[0].id === nodeId
            ? 'No se puede vaciar la última palabra del sintagma'
            : null;
    }
    goToNextGuidedStep() {
        if (this.guidedState.stage === 'choose-target') {
            if (this.guidedState.candidateNodePath === null)
                return;
            this.guidedState = { stage: 'choose-type', targetNodePath: this.guidedState.candidateNodePath };
            return;
        }
        if (this.guidedState.stage !== 'steps')
            return;
        const steps = this.getCurrentGuidedSteps();
        if (this.guidedState.stepIndex < steps.length - 1) {
            this.guidedState.stepIndex++;
        }
        else {
            this.guidedState = { stage: 'choose-target', candidateNodePath: null };
            this.selectNode(null);
        }
    }
    goToPreviousGuidedStep() {
        if (this.guidedState.stage === 'choose-type') {
            const targetNodeId = this.getGuidedTargetNodeId();
            this.guidedState = { stage: 'choose-target', candidateNodePath: this.guidedState.targetNodePath };
            this.selectNode(targetNodeId);
            return;
        }
        if (this.guidedState.stage !== 'steps')
            return;
        if (this.guidedState.stepIndex > 0) {
            this.guidedState.stepIndex--;
        }
        else if (this.guidedState.targetNodePath === null) {
            this.guidedState = { stage: 'choose-target', candidateNodePath: null };
            this.selectNode(null);
        }
        else {
            const targetNodeId = this.getGuidedTargetNodeId();
            this.guidedState = { stage: 'choose-type', targetNodePath: this.guidedState.targetNodePath };
            this.selectNode(targetNodeId);
        }
    }
    getCurrentGuidedSteps() {
        if (this.guidedState.stage !== 'steps')
            return [];
        if (this.guidedState.syntagmaType === null)
            return GRAMMAR.sentenceSteps;
        return this.getGuidedSyntagma(this.guidedState.syntagmaType)?.steps ?? [];
    }
    getGuidedSyntagma(value) {
        return GRAMMAR.guidedSyntagmas.find((syntagma) => syntagma.value === value);
    }
    renderGuidedPanel() {
        const panel = this.guidedPanelEl;
        panel.replaceChildren();
        if (this.guidedState.stage === 'choose-target') {
            this.addGuidedText(panel, 'h2', 'Elige qué analizar');
            this.addGuidedText(panel, 'p', 'Haz clic en una caja del árbol y pulsa Siguiente, o elige analizar la oración completa.');
            const candidateNodeId = this.getGuidedTargetNodeId();
            if (candidateNodeId !== null) {
                this.addGuidedText(panel, 'p', this.getNodeLabel(candidateNodeId));
            }
            const actions = this.createGuidedActions();
            actions.append(this.createGuidedButton('Anterior', 'previous', true), this.createGuidedButton('Oración completa', 'choose-none'), this.createGuidedButton('Siguiente', 'next', candidateNodeId === null));
            panel.appendChild(actions);
            return;
        }
        if (this.guidedState.stage === 'choose-type') {
            this.addGuidedText(panel, 'h2', '¿Qué tipo de sintagma es?');
            const targetNodeId = this.getGuidedTargetNodeId();
            if (targetNodeId !== null)
                this.addGuidedText(panel, 'p', this.getNodeLabel(targetNodeId));
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
        actions.append(this.createGuidedButton('Anterior', 'previous'), this.createGuidedButton('Siguiente', 'next'));
        panel.appendChild(actions);
    }
    createGuidedActions() {
        const actions = document.createElement('div');
        actions.className = 'guided-actions';
        return actions;
    }
    createGuidedButton(text, action, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.dataset.guidedAction = action;
        button.disabled = disabled;
        return button;
    }
    addGuidedText(parent, tag, text) {
        const element = document.createElement(tag);
        element.textContent = text;
        parent.appendChild(element);
    }
    getNodeLabel(id) {
        const node = this.tree.getNode(id);
        const words = this.tree.getWordsFromTokenRange(node.startToken, node.endToken).map((word) => word.word);
        return words.join(' ');
    }
    validateGuidedState() {
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        if (nodePath === null || this.tree.getBoxNodeIdAtPath(nodePath) !== null)
            return;
        this.guidedState = { stage: 'choose-target', candidateNodePath: null };
    }
    getGuidedTargetNodeId() {
        if (this.guidedState.stage === 'steps' && this.guidedState.targetNodePath === null)
            return null;
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        return nodePath === null ? null : this.tree.getBoxNodeIdAtPath(nodePath);
    }
    updateGuidedFocus() {
        const targetNodeId = this.guidedState.stage === 'choose-target' ? null : this.getGuidedTargetNodeId();
        for (const [nodeId, element] of this.elementMapping) {
            const inScope = targetNodeId === null || this.isWithinScope(nodeId, targetNodeId);
            element.classList.toggle('guided-outside', !inScope);
            element.classList.toggle('guided-focus', nodeId === targetNodeId);
        }
    }
    isWithinScope(nodeId, scopeId) {
        let currentId = nodeId;
        while (currentId !== 'root') {
            if (currentId === scopeId)
                return true;
            currentId = this.tree.getParentId(currentId);
        }
        return false;
    }
    isTargetNode(nodeId) {
        return this.guidedState.stage !== 'choose-target'
            && this.getGuidedTargetNodeId() === nodeId;
    }
}
//# sourceMappingURL=guided-editor.js.map