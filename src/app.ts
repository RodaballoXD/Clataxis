import { createEditorInterface } from "./editor/editor-screen.js";
import { SyntaxEditor } from "./editor/editor.js";
import { ReducedJSON, sentenceToReducedJSON } from "./editor/tree.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";
import { longReducedJSON } from "./shared/consts.js";

export class App {
    private activeScreen: Screen = 'sentence';
    private appEl: HTMLDivElement;

    constructor(appEl: HTMLDivElement) {
        this.appEl = appEl;
        this.setScreen('sentence');
    }

    private setScreen(screen: Screen, json?: ReducedJSON) {
        this.activeScreen = screen;

        this.appEl.replaceChildren();
        if (screen === 'sentence') {
            this.mountSentenceScreen();
        } else {
            if (!json) throw new Error("setScreen cannot create editor without json parameter");
            this.mountEditorScreen(json);
        }
    }

    private mountSentenceScreen() {
        const onComenzar = (sentence: string) => {
            // const json = sentenceToReducedJSON(sentence);
            const json = longReducedJSON;
            if (!json) return;
            this.setScreen('editor', json);
        };
        const enterSentenceEl = createEnterSentenceEl(onComenzar);

        this.appEl.appendChild(enterSentenceEl);
    }

    private mountEditorScreen(json: ReducedJSON) {
        const onReturnToSentenceScreen = () => {
            // TODO
        }
        const editorContainerEls = createEditorInterface(onReturnToSentenceScreen);
        this.appEl.appendChild(editorContainerEls.interfaceContainerEl);
        const editor = new SyntaxEditor(json);
        editor.mount(editorContainerEls.rootContainerEl);
    }
}

type Screen = 'sentence' | 'editor';