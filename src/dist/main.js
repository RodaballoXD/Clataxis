import { App } from "./app.js";
import { RootNodeEl, SyntaxNodeEl, WordNodeEl } from "./editor/elements.js";
customElements.define('root-node', RootNodeEl);
customElements.define('syntax-node', SyntaxNodeEl);
customElements.define('word-node', WordNodeEl);
const appEl = document.getElementById('app');
new App(appEl);
//# sourceMappingURL=main.js.map