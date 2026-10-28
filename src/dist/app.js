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
        this.editorHelpOpen = true;
        this.editorHelp = null;
        this.undoStack = [];
        this.redoStack = [];
        this.onBrowserNavigation = () => {
            const editorJSON = getEditorJSONFromURL();
            if (editorJSON) {
                this.setScreen('editor', editorJSON, 'none');
            }
            else {
                this.setScreen('sentence', undefined, 'none');
            }
        };
        this.undo = () => {
            const previous = this.undoStack.pop();
            if (!previous || !this.currentEditorJSON)
                return;
            this.redoStack.push(cloneReducedJSON(this.currentEditorJSON));
            this.currentEditorJSON = previous;
            setEditorJSONInURL(previous);
            this.mountEditorMode(this.editorMode);
        };
        this.redo = () => {
            const next = this.redoStack.pop();
            if (!next || !this.currentEditorJSON)
                return;
            this.undoStack.push(cloneReducedJSON(this.currentEditorJSON));
            this.currentEditorJSON = next;
            setEditorJSONInURL(next);
            this.mountEditorMode(this.editorMode);
        };
        this.onKeyDown = (event) => {
            if (this.editorMode === 'text' && this.editorHelp?.handleKeyDown(event))
                return;
            if (!(event.ctrlKey || event.metaKey))
                return;
            if (this.editorMode !== 'text') {
                if (!this.activeEditor || this.activeEditor.state.editing.isEditing)
                    return;
                if (!this.activeEditor.supportsHistory) {
                    event.preventDefault();
                    return;
                }
            }
            else if (event.target instanceof HTMLTextAreaElement) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === 'z') {
                event.preventDefault();
                if (event.shiftKey)
                    this.redo();
                else
                    this.undo();
            }
            else if (key === 'y') {
                event.preventDefault();
                this.redo();
            }
        };
        this.appEl = appEl;
        window.addEventListener('popstate', this.onBrowserNavigation);
        document.addEventListener('keydown', this.onKeyDown, true);
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
        this.editorHelp = null;
        this.undoStack = [];
        this.redoStack = [];
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
            this.editorHelpOpen = true;
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
        this.mountEditorMode(mode);
    }
    mountEditorMode(mode) {
        const json = this.currentEditorJSON;
        if (!json)
            return;
        const zoomLevel = this.activeEditor?.zoomLevel ?? 1;
        this.activeEditor?.destroy();
        this.activeEditor = null;
        this.activeTextEditor?.destroy();
        this.activeTextEditor = null;
        this.editorMode = mode;
        this.appEl.replaceChildren();
        this.mountEditorScreen(json, 'none', mode, zoomLevel);
    }
    mountEditorScreen(json, urlMode, mode, zoomLevel = 1) {
        const onReturnToSentenceScreen = () => {
            this.setScreen('sentence', undefined, 'push');
        };
        const editorContainerEls = createEditorInterface(onReturnToSentenceScreen, (nextMode) => this.switchEditorMode(nextMode), mode, () => this.activeEditor?.commitPendingEdit(), {
            initiallyOpen: this.editorHelpOpen,
            onOpenChange: (isOpen) => {
                this.editorHelpOpen = isOpen;
            }
        });
        this.editorHelp = editorContainerEls.editorHelp;
        editorContainerEls.undoButtonEl.addEventListener('click', this.undo);
        editorContainerEls.redoButtonEl.addEventListener('click', this.redo);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        if (this.editorHelpOpen)
            editorContainerEls.editorHelp.focus();
        this.updateHistoryButtons(editorContainerEls.undoButtonEl, editorContainerEls.redoButtonEl);
        if (urlMode !== 'none') {
            setEditorJSONInURL(json, urlMode);
        }
        if (mode === 'tree') {
            const onChange = (nextJSON) => this.recordAnalysisChange(nextJSON);
            const editor = new SyntaxEditor(json, onChange, editorContainerEls, zoomLevel);
            this.activeEditor = editor;
            editor.mount(editorContainerEls.rootContainerEl);
            return;
        }
        const initialText = reducedJSONToSyntaxRepr(json, 4).repr;
        const textEditor = new TextSyntaxEditor(initialText, (nextJSON) => {
            this.recordAnalysisChange(nextJSON);
        }, editorContainerEls);
        this.activeTextEditor = textEditor;
        textEditor.mount(editorContainerEls.rootContainerEl);
    }
    recordAnalysisChange(nextJSON) {
        if (!this.currentEditorJSON || sameReducedJSON(this.currentEditorJSON, nextJSON))
            return;
        this.undoStack.push(cloneReducedJSON(this.currentEditorJSON));
        this.redoStack = [];
        this.currentEditorJSON = cloneReducedJSON(nextJSON);
        setEditorJSONInURL(this.currentEditorJSON);
        this.updateHistoryButtons();
    }
    updateHistoryButtons(undoButtonEl, redoButtonEl) {
        undoButtonEl ?? (undoButtonEl = this.appEl.querySelector('.editor-history-controls button:first-child') ?? undefined);
        redoButtonEl ?? (redoButtonEl = this.appEl.querySelector('.editor-history-controls button:last-child') ?? undefined);
        if (!undoButtonEl || !redoButtonEl)
            return;
        const historyDisabled = this.editorMode !== 'text'
            && this.activeEditor !== null
            && !this.activeEditor.supportsHistory;
        undoButtonEl.disabled = historyDisabled || this.undoStack.length === 0;
        redoButtonEl.disabled = historyDisabled || this.redoStack.length === 0;
    }
}
function cloneReducedJSON(json) {
    return JSON.parse(JSON.stringify(json));
}
function sameReducedJSON(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
//# sourceMappingURL=app.js.map