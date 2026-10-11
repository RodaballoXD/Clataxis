import { GRAMMAR, type GuidedStepDefinition, type GuidedSyntagmaDefinition } from "../grammar/placeholder-grammar.js";
import type { EditorInterfaceEls } from "./editor-screen.js";
import { SyntaxEditor } from "./editor.js";
import type { ClickedData } from "./editor.js";
import type { NodeId, ReducedJSON, SyntaxNode } from "./tree.js";
import { createGuidedEditorState, type GuidedEditorState } from "./guided-state.js";

export class GuidedSyntaxEditor extends SyntaxEditor {
    override readonly supportsHistory = false;
    private guidedState: GuidedEditorState = createGuidedEditorState();
    private guidedPanelEl: HTMLElement;

    constructor(
        json: ReducedJSON,
        onChange: (json: ReducedJSON) => void,
        controls: EditorInterfaceEls
    ) {
        super(json, onChange, controls);
        this.guidedPanelEl = controls.guidedPanelEl;
    }

    override mount(container: HTMLElement) {
        this.guidedPanelEl.addEventListener('click', this.onGuidedPanelClick);
        super.mount(container);
    }

    override destroy() {
        this.guidedPanelEl.removeEventListener('click', this.onGuidedPanelClick);
        super.destroy();
    }

    protected override onTreeRendered() {
        this.validateGuidedState();
        this.updateGuidedFocus();
        this.renderGuidedPanel();
    }

    protected override handleModePointerDown(_event: PointerEvent, clicked: ClickedData): boolean {
        if (this.guidedState.stage !== 'choose-target') return false;
        if (clicked.type === 'syntax') {
            const candidateNodeId = clicked.nodeEl.nodeId as number;
            this.guidedState = {
                stage: 'choose-target',
                candidateNodePath: this.tree.getNodePath(candidateNodeId)
            };
            this.selectNode(candidateNodeId);
            this.renderGuidedPanel();
        }
        return true;
    }

    protected override canInteractWithNode(nodeId: NodeId): boolean {
        if (this.guidedState.stage === 'choose-target') return false;
        const targetId = this.getGuidedTargetNodeId();
        return targetId === null || this.isWithinScope(nodeId, targetId);
    }

    protected override hideSelectionActionsForNode(nodeId: number): boolean {
        return this.guidedState.stage === 'choose-target' || this.isTargetNode(nodeId);
    }

    protected override canDeleteNode(nodeId: number): boolean {
        return this.guidedState.stage !== 'choose-target'
            && !this.isTargetNode(nodeId)
            && super.canDeleteNode(nodeId);
    }

    protected override canInsertBoxAtRange(startToken: number, endToken: number): boolean {
        return this.guidedState.stage !== 'choose-target'
            && super.canInsertBoxAtRange(startToken, endToken);
    }

    protected override getWordEditError(nodeId: number, proposedWord: string): string | null {
        if (this.guidedState.stage === 'choose-target'
            || this.getGuidedTargetNodeId() === null
            || proposedWord.trim()
            || !this.canInteractWithNode(nodeId)) return null;

        const target = this.tree.getNode(this.getGuidedTargetNodeId() as number) as SyntaxNode;
        const words = this.tree.getWordsFromTokenRange(target.startToken, target.endToken);
        return words.length === 1 && words[0].id === nodeId
            ? 'No se puede vaciar la última palabra del sintagma'
            : null;
    }

    private onGuidedPanelClick = (event: MouseEvent) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>('button[data-guided-action]');
        if (!button || button.disabled) return;

        if (this.state.editing.isEditing) this.finishEditing(false);

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

        this.renderTree();
    };

    private goToNextGuidedStep() {
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
        if (this.guidedState.stage !== 'steps') return [];
        if (this.guidedState.syntagmaType === null) return GRAMMAR.sentenceSteps;
        return this.getGuidedSyntagma(this.guidedState.syntagmaType)?.steps ?? [];
    }

    private getGuidedSyntagma(value: string): GuidedSyntagmaDefinition | undefined {
        return GRAMMAR.guidedSyntagmas.find((syntagma) => syntagma.value === value);
    }

    private renderGuidedPanel() {
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
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        if (nodePath === null || this.tree.getBoxNodeIdAtPath(nodePath) !== null) return;
        this.guidedState = { stage: 'choose-target', candidateNodePath: null };
    }

    private getGuidedTargetNodeId(): number | null {
        if (this.guidedState.stage === 'steps' && this.guidedState.targetNodePath === null) return null;
        const nodePath = this.guidedState.stage === 'choose-target'
            ? this.guidedState.candidateNodePath
            : this.guidedState.targetNodePath;
        return nodePath === null ? null : this.tree.getBoxNodeIdAtPath(nodePath);
    }

    private updateGuidedFocus() {
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

    private isTargetNode(nodeId: number): boolean {
        return this.guidedState.stage !== 'choose-target'
            && this.getGuidedTargetNodeId() === nodeId;
    }
}
