import { createEditorInterface, type EditorInterfaceEls, type EditorMode } from "./editor/editor-screen.js";
import { SyntaxEditor } from "./editor/editor.js";
import type { ReducedJSON } from "./editor/tree.js";
import { sentenceToReducedJSON } from "./editor/tree.js";
import { reducedJSONToSyntaxRepr } from "./editor/tree-format.js";
import { TextSyntaxEditor } from "./editor/text-editor.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";
import { clearEditorJSONFromURL, getEditorJSONFromURL, setEditorJSONInURL } from "./shared/url.js";

export class App {
    private activeScreen: Screen = 'sentence';
    private activeEditor: SyntaxEditor | null = null;
    private activeTextEditor: TextSyntaxEditor | null = null;
    private appEl: HTMLDivElement;
    private currentEditorJSON: ReducedJSON | null = null;
    private editorMode: EditorMode = 'tree';
    private editorHelpOpen = true;
    private editorHelp: EditorInterfaceEls['editorHelp'] | null = null;
    private undoStack: ReducedJSON[] = [];
    private redoStack: ReducedJSON[] = [];

    constructor(appEl: HTMLDivElement) {
        this.appEl = appEl;
        window.addEventListener('popstate', this.onBrowserNavigation);
        document.addEventListener('keydown', this.onKeyDown, true);

        const editorJSON = getEditorJSONFromURL();
        if (editorJSON) {
            this.setScreen('editor', editorJSON, 'none');
        } else {
            this.setScreen('sentence', undefined, 'none');
        }
    }

    private setScreen(screen: Screen, json?: ReducedJSON, urlMode: URLMode = 'none') {
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
        } else {
            if (!json) throw new Error("setScreen cannot create editor without json parameter");
            this.currentEditorJSON = json;
            this.editorMode = 'tree';
            this.editorHelpOpen = true;
            this.mountEditorScreen(json, urlMode, this.editorMode);
        }
    }

    private onBrowserNavigation = () => {
        const editorJSON = getEditorJSONFromURL();
        if (editorJSON) {
            this.setScreen('editor', editorJSON, 'none');
        } else {
            this.setScreen('sentence', undefined, 'none');
        }
    }

    private mountSentenceScreen() {
        const onComenzar = (sentence: string) => {
            const json = sentenceToReducedJSON(sentence);
            if (!json) return;
            this.setScreen('editor', json, 'push');
        };
        const enterSentenceEl = createEnterSentenceEl(onComenzar);

        this.appEl.appendChild(enterSentenceEl);
    }

    private switchEditorMode(mode: EditorMode) {
        if (mode === this.editorMode || !this.currentEditorJSON) return;

        this.mountEditorMode(mode);
    }

    private mountEditorMode(mode: EditorMode) {
        const json = this.currentEditorJSON;
        if (!json) return;

        const zoomLevel = this.activeEditor?.zoomLevel ?? 1;
        this.activeEditor?.destroy();
        this.activeEditor = null;
        this.activeTextEditor?.destroy();
        this.activeTextEditor = null;
        this.editorMode = mode;
        this.appEl.replaceChildren();
        this.mountEditorScreen(json, 'none', mode, zoomLevel);
    }

    private mountEditorScreen(json: ReducedJSON, urlMode: URLMode, mode: EditorMode, zoomLevel = 1) {
        const onReturnToSentenceScreen = () => {
            this.setScreen('sentence', undefined, 'push');
        }
        const editorContainerEls = createEditorInterface(
            onReturnToSentenceScreen,
            (nextMode) => this.switchEditorMode(nextMode),
            mode,
            () => this.activeEditor?.commitPendingEdit(),
            {
                initiallyOpen: this.editorHelpOpen,
                onOpenChange: (isOpen) => {
                    this.editorHelpOpen = isOpen;
                }
            }
        );
        this.editorHelp = editorContainerEls.editorHelp;
        editorContainerEls.undoButtonEl.addEventListener('click', this.undo);
        editorContainerEls.redoButtonEl.addEventListener('click', this.redo);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        if (this.editorHelpOpen) editorContainerEls.editorHelp.focus();
        this.updateHistoryButtons(editorContainerEls.undoButtonEl, editorContainerEls.redoButtonEl);
        if (urlMode !== 'none') {
            setEditorJSONInURL(json, urlMode);
        }

        if (mode === 'tree') {
            const onChange = (nextJSON: ReducedJSON) => this.recordAnalysisChange(nextJSON);
            const editor = new SyntaxEditor(json, onChange, editorContainerEls, zoomLevel);
            this.activeEditor = editor;
            editor.mount(editorContainerEls.rootContainerEl);
            return;
        }

        const initialText = reducedJSONToSyntaxRepr(json, 4).repr;
        const textEditor = new TextSyntaxEditor(
            initialText,
            (nextJSON) => {
                this.recordAnalysisChange(nextJSON);
            },
            editorContainerEls
        );
        this.activeTextEditor = textEditor;
        textEditor.mount(editorContainerEls.rootContainerEl);
    }

    private recordAnalysisChange(nextJSON: ReducedJSON) {
        if (!this.currentEditorJSON || sameReducedJSON(this.currentEditorJSON, nextJSON)) return;

        this.undoStack.push(cloneReducedJSON(this.currentEditorJSON));
        this.redoStack = [];
        this.currentEditorJSON = cloneReducedJSON(nextJSON);
        setEditorJSONInURL(this.currentEditorJSON);
        this.updateHistoryButtons();
    }

    private undo = () => {
        const previous = this.undoStack.pop();
        if (!previous || !this.currentEditorJSON) return;

        this.redoStack.push(cloneReducedJSON(this.currentEditorJSON));
        this.currentEditorJSON = previous;
        setEditorJSONInURL(previous);
        this.mountEditorMode(this.editorMode);
    };

    private redo = () => {
        const next = this.redoStack.pop();
        if (!next || !this.currentEditorJSON) return;

        this.undoStack.push(cloneReducedJSON(this.currentEditorJSON));
        this.currentEditorJSON = next;
        setEditorJSONInURL(next);
        this.mountEditorMode(this.editorMode);
    };

    private updateHistoryButtons(undoButtonEl?: HTMLButtonElement, redoButtonEl?: HTMLButtonElement) {
        undoButtonEl ??= this.appEl.querySelector<HTMLButtonElement>('.editor-history-controls button:first-child') ?? undefined;
        redoButtonEl ??= this.appEl.querySelector<HTMLButtonElement>('.editor-history-controls button:last-child') ?? undefined;
        if (!undoButtonEl || !redoButtonEl) return;

        const historyDisabled = this.editorMode !== 'text'
            && this.activeEditor !== null
            && !this.activeEditor.supportsHistory;
        undoButtonEl.disabled = historyDisabled || this.undoStack.length === 0;
        redoButtonEl.disabled = historyDisabled || this.redoStack.length === 0;
    }

    private onKeyDown = (event: KeyboardEvent) => {
        if (this.editorMode === 'text' && this.editorHelp?.handleKeyDown(event)) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        if (this.editorMode !== 'text') {
            if (!this.activeEditor || this.activeEditor.state.editing.isEditing) return;
            if (!this.activeEditor.supportsHistory) {
                event.preventDefault();
                return;
            }
        } else if (event.target instanceof HTMLTextAreaElement) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === 'z') {
            event.preventDefault();
            if (event.shiftKey) this.redo();
            else this.undo();
        } else if (key === 'y') {
            event.preventDefault();
            this.redo();
        }
    };
}

type Screen = 'sentence' | 'editor';
type URLMode = 'none' | 'push' | 'replace';
function cloneReducedJSON(json: ReducedJSON): ReducedJSON {
    return JSON.parse(JSON.stringify(json)) as ReducedJSON;
}

function sameReducedJSON(a: ReducedJSON, b: ReducedJSON): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
