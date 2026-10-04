import { createEditorInterface } from "./editor/editor-screen.js";
import { SyntaxEditor } from "./editor/editor.js";
import { sentenceToReducedJSON } from "./editor/tree.js";
import { reducedJSONToSyntaxRepr } from "./editor/tree-format.js";
import { TextSyntaxEditor } from "./editor/text-editor.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";
import { clearEditorJSONFromURL, getEditorJSONFromURL, setEditorJSONInURL } from "./shared/url.js";
export class App {
    constructor(appEl) {
        this.activeScreen = 'sentence';
        this.activeEditor = null;
        this.activeTextEditor = null;
        this.currentEditorJSON = null;
        this.editorMode = 'tree';
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
        this.activeTextEditor?.destroy();
        this.activeTextEditor = null;
        this.appEl.replaceChildren();
        if (screen === 'sentence') {
            this.currentEditorJSON = null;
            this.editorMode = 'tree';
            if (urlMode !== 'none') {
                clearEditorJSONFromURL(urlMode);
            }
            this.mountSentenceScreen();
        }
        else {
            if (!json)
                throw new Error("setScreen cannot create editor without json parameter");
            this.currentEditorJSON = json;
            this.editorMode = 'tree';
            this.mountEditorScreen(json, urlMode, this.editorMode);
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
    switchEditorMode(mode) {
        if (mode === this.editorMode || !this.currentEditorJSON)
            return;
        this.activeEditor?.destroy();
        this.activeEditor = null;
        this.activeTextEditor?.destroy();
        this.activeTextEditor = null;
        this.editorMode = mode;
        this.appEl.replaceChildren();
        this.mountEditorScreen(this.currentEditorJSON, 'none', mode);
    }
    mountEditorScreen(json, urlMode, mode) {
        const onReturnToSentenceScreen = () => {
            this.setScreen('sentence', undefined, 'push');
        };
        const editorContainerEls = createEditorInterface(onReturnToSentenceScreen, (nextMode) => this.switchEditorMode(nextMode), mode);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        if (urlMode !== 'none') {
            setEditorJSONInURL(json, urlMode);
        }
        if (mode === 'tree') {
            const editor = new SyntaxEditor(json, (nextJSON) => {
                this.currentEditorJSON = nextJSON;
                setEditorJSONInURL(nextJSON);
            }, editorContainerEls);
            this.activeEditor = editor;
            editor.mount(editorContainerEls.rootContainerEl);
            return;
        }
        const initialText = reducedJSONToSyntaxRepr(json, 4).repr;
        const textEditor = new TextSyntaxEditor(initialText, (nextJSON) => {
            this.currentEditorJSON = nextJSON;
            setEditorJSONInURL(nextJSON);
        }, editorContainerEls);
        this.activeTextEditor = textEditor;
        textEditor.mount(editorContainerEls.rootContainerEl);
    }
}
//# sourceMappingURL=app.js.map