import { SyntaxEditor } from "./editor/editor.js";
import { ReducedJSON, sentenceToReducedJSON } from "./editor/tree.js";
import { createEnterSentenceEl } from "./enter-sentence/enter-sentence-screen.js";

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
        const enterSentenceEl = createEnterSentenceEl((sentence: string) => {
            const json = sentenceToReducedJSON(sentence);
            if (!json) return;
            this.setScreen('editor', json);
        });

        this.appEl.appendChild(enterSentenceEl);
    }

    private mountEditorScreen(json: ReducedJSON) {
        const editor = new SyntaxEditor(json);
        editor.mount(this.appEl);
    }
}

type Screen = 'sentence' | 'editor';