import { syntaxReprToReducedJSON, reducedJSONToSyntaxRepr } from "./tree-format.js";
import { SyntaxTree } from "./tree.js";
export class TextSyntaxEditor {
    constructor(initialText, onValidChange, controls) {
        this.onInput = () => {
            const draft = this.textareaEl.value;
            try {
                const json = new SyntaxTree(syntaxReprToReducedJSON(draft)).toReducedJSON();
                this.controls.notificationEl.textContent = '';
                this.controls.compactButtonEl.disabled = false;
                this.controls.indentButtonEl.disabled = false;
                this.onValidChange(json);
            }
            catch {
                this.controls.notificationEl.textContent = 'La sintaxis no es válida. El análisis no se ha actualizado.';
                this.controls.compactButtonEl.disabled = true;
                this.controls.indentButtonEl.disabled = true;
            }
        };
        this.compact = () => this.format(null);
        this.indent = () => this.format(4);
        this.textareaEl = document.createElement('textarea');
        this.textareaEl.className = 'syntax-text-editor';
        this.textareaEl.setAttribute('aria-label', 'Código del análisis sintáctico');
        this.textareaEl.setAttribute('spellcheck', 'false');
        this.textareaEl.value = initialText;
        this.onValidChange = onValidChange;
        this.controls = controls;
    }
    mount(container) {
        container.appendChild(this.textareaEl);
        this.textareaEl.addEventListener('input', this.onInput);
        this.controls.compactButtonEl.addEventListener('click', this.compact);
        this.controls.indentButtonEl.addEventListener('click', this.indent);
        this.onInput();
    }
    destroy() {
        this.textareaEl.removeEventListener('input', this.onInput);
        this.controls.compactButtonEl.removeEventListener('click', this.compact);
        this.controls.indentButtonEl.removeEventListener('click', this.indent);
    }
    format(indent) {
        try {
            const json = new SyntaxTree(syntaxReprToReducedJSON(this.textareaEl.value)).toReducedJSON();
            this.textareaEl.value = reducedJSONToSyntaxRepr(json, indent).repr;
            this.textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        catch {
            this.controls.notificationEl.textContent = 'La sintaxis no es válida. El análisis no se ha actualizado.';
        }
    }
}
//# sourceMappingURL=text-editor.js.map