import { createEditorInterface } from "./editor/editor-screen.js";
import { SyntaxEditor } from "./editor/editor.js";
import { sentenceToReducedJSON } from "./editor/tree.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";
import { clearEditorJSONFromURL, getEditorJSONFromURL, setEditorJSONInURL } from "./shared/url.js";
export class App {
    constructor(appEl) {
        this.activeScreen = 'sentence';
        this.activeEditor = null;
        this.onBrowserNavigation = () => {
            const editorJSON = getEditorJSONFromURL();
            if (editorJSON) {
                this.setScreen('editor', editorJSON, 'none');
            }
            else {
                this.setScreen('sentence', undefined, 'none');
            }
        };
        this.appEl = appEl;
        window.addEventListener('popstate', this.onBrowserNavigation);
        const editorJSON = getEditorJSONFromURL();
        if (editorJSON) {
            this.setScreen('editor', editorJSON, 'none');
        }
        else {
            this.setScreen('sentence', undefined, 'none');
        }
    }
    setScreen(screen, json, urlMode = 'none') {
        this.activeScreen = screen;
        this.activeEditor?.destroy();
        this.activeEditor = null;
        this.appEl.replaceChildren();
        if (screen === 'sentence') {
            if (urlMode !== 'none') {
                clearEditorJSONFromURL(urlMode);
            }
            this.mountSentenceScreen();
        }
        else {
            if (!json)
                throw new Error("setScreen cannot create editor without json parameter");
            this.mountEditorScreen(json, urlMode);
        }
    }
    mountSentenceScreen() {
        const onComenzar = (sentence) => {
            const json = sentenceToReducedJSON(sentence);
            if (!json)
                return;
            this.setScreen('editor', json, 'push');
        };
        const enterSentenceEl = createEnterSentenceEl(onComenzar);
        this.appEl.appendChild(enterSentenceEl);
    }
    mountEditorScreen(json, urlMode) {
        const onReturnToSentenceScreen = () => {
            this.setScreen('sentence', undefined, 'push');
        };
        const editorContainerEls = createEditorInterface(onReturnToSentenceScreen);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        if (urlMode !== 'none') {
            setEditorJSONInURL(json, urlMode);
        }
        const editor = new SyntaxEditor(json, setEditorJSONInURL, editorContainerEls);
        this.activeEditor = editor;
        editor.mount(editorContainerEls.rootContainerEl);
    }
}
//# sourceMappingURL=app.js.map