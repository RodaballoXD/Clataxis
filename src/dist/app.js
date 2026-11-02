import { createEditorInterface } from "./editor/editor-screen.js";
import { SyntaxEditor } from "./editor/editor.js";
import { sentenceToReducedJSON } from "./editor/tree.js";
import { reducedJSONToSyntaxRepr } from "./editor/tree-format.js";
import { TextSyntaxEditor } from "./editor/text-editor.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";
import { clearEditorJSONFromURL, getEditorJSONFromURL, setEditorJSONInURL } from "./shared/url.js";
const EDITOR_HELP_DISMISSED_STORAGE_KEY = 'clataxis:editor-help-dismissed';
export class App {
    constructor(appEl) {
        this.activeEditor = null;
        this.activeTextEditor = null;
        this.currentEditorJSON = null;
        this.treeEditorViewState = null;
        this.editorMode = 'tree';
        this.editorHelpState = { isOpen: true, step: 0 };
        this.editorHelpDismissed = false;
        this.editorHelpInitialHintPending = false;
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
        this.onEditorHelpDismissed = () => {
            if (this.editorHelpDismissed)
                return;
            try {
                window.localStorage.setItem(EDITOR_HELP_DISMISSED_STORAGE_KEY, 'true');
            }
            catch (error) {
                console.warn('Could not save editor-help preference to localStorage.', error);
            }
            this.editorHelpDismissed = true;
        };
        this.undo = () => {
            const previous = this.undoStack.pop();
            if (!previous || !this.currentEditorJSON)
                return;
            this.redoStack.push(cloneReducedJSON(this.currentEditorJSON));
            this.currentEditorJSON = previous;
            setEditorJSONInURL(previous);
            this.setActiveAnalysis(previous);
            this.updateHistoryButtons();
        };
        this.redo = () => {
            const next = this.redoStack.pop();
            if (!next || !this.currentEditorJSON)
                return;
            this.undoStack.push(cloneReducedJSON(this.currentEditorJSON));
            this.currentEditorJSON = next;
            setEditorJSONInURL(next);
            this.setActiveAnalysis(next);
            this.updateHistoryButtons();
        };
        this.onKeyDown = (event) => {
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
        try {
            this.editorHelpDismissed = window.localStorage.getItem(EDITOR_HELP_DISMISSED_STORAGE_KEY) === 'true';
        }
        catch (error) {
            console.warn('Could not read editor-help preference from localStorage.', error);
        }
        this.editorHelpState = { isOpen: !this.editorHelpDismissed, step: 0 };
        window.addEventListener('popstate', this.onBrowserNavigation);
        document.addEventListener('keydown', this.onKeyDown, true);
        const editorJSON = getEditorJSONFromURL();
        if (editorJSON) {
            if (!this.editorHelpDismissed) {
                this.editorHelpState = { isOpen: false, step: 0 };
                this.editorHelpInitialHintPending = true;
            }
            this.setScreen('editor', editorJSON, 'none');
        }
        else {
            this.setScreen('sentence', undefined, 'none');
        }
    }
    setScreen(screen, json, urlMode = 'none') {
        this.destroyActiveEditors();
        this.undoStack = [];
        this.redoStack = [];
        this.treeEditorViewState = null;
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
            this.editorHelpState = { ...this.editorHelpState, isOpen: !this.editorHelpDismissed };
            this.editorHelpInitialHintPending = !this.editorHelpDismissed;
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
        const viewState = this.activeEditor?.getViewState() ?? this.treeEditorViewState ?? undefined;
        if (this.activeEditor)
            this.treeEditorViewState = viewState ?? null;
        this.destroyActiveEditors();
        this.editorMode = mode;
        this.appEl.replaceChildren();
        this.mountEditorScreen(json, 'none', mode, viewState);
    }
    mountEditorScreen(json, urlMode, mode, viewState) {
        const onReturnToSentenceScreen = () => {
            this.setScreen('sentence', undefined, 'push');
        };
        const editorContainerEls = createEditorInterface(onReturnToSentenceScreen, (nextMode) => this.switchEditorMode(nextMode), mode, () => this.activeEditor?.commitPendingEdit());
        editorContainerEls.undoButtonEl.addEventListener('click', this.undo);
        editorContainerEls.redoButtonEl.addEventListener('click', this.redo);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        this.updateHistoryButtons(editorContainerEls.undoButtonEl, editorContainerEls.redoButtonEl);
        if (urlMode !== 'none') {
            setEditorJSONInURL(json, urlMode);
        }
        if (mode === 'tree') {
            const onChange = (nextJSON) => this.recordAnalysisChange(nextJSON);
            const editor = new SyntaxEditor(json, onChange, editorContainerEls, viewState, this.editorHelpState, this.onEditorHelpDismissed, this.editorHelpInitialHintPending);
            this.editorHelpInitialHintPending = false;
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
    destroyActiveEditors() {
        if (this.activeEditor) {
            const helpState = this.activeEditor.getEditorHelpState();
            if (helpState)
                this.editorHelpState = helpState;
        }
        this.activeEditor?.destroy();
        this.activeEditor = null;
        this.activeTextEditor?.destroy();
        this.activeTextEditor = null;
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
    setActiveAnalysis(json) {
        if (this.editorMode === 'tree') {
            if (!this.activeEditor)
                throw new Error('Cannot update analysis without an active tree editor');
            this.activeEditor.setAnalysis(json);
            return;
        }
        if (!this.activeTextEditor)
            throw new Error('Cannot update analysis without an active text editor');
        this.activeTextEditor.setAnalysis(json);
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