import { syntaxReprToReducedJSON, reducedJSONToSyntaxRepr } from "./tree-format.js";
import { SyntaxTree, type ReducedJSON } from "./tree.js";
import type { EditorInterfaceEls } from "./editor-screen.js";

const LANGUAGE_ID = 'clataxis-syntax';
const THEME_ID = 'clataxis-light';

let monacoPromise: Promise<MonacoApi> | null = null;
let monacoConfigured = false;

export class TextSyntaxEditor {
    private editorContainerEl: HTMLDivElement;
    private editor: MonacoStandaloneEditor | null = null;
    private changeSubscription: { dispose(): void } | null = null;
    private isDestroyed = false;
    private onValidChange: (json: ReducedJSON) => void;
    private controls: EditorInterfaceEls;

    constructor(
        initialText: string,
        onValidChange: (json: ReducedJSON) => void,
        controls: EditorInterfaceEls
    ) {
        this.editorContainerEl = document.createElement('div');
        this.editorContainerEl.className = 'syntax-monaco-editor';
        this.onValidChange = onValidChange;
        this.controls = controls;
        this.initialText = initialText;
    }

    private initialText: string;

    mount(container: HTMLElement) {
        container.appendChild(this.editorContainerEl);
        this.controls.compactButtonEl.addEventListener('click', this.compact);
        this.controls.indentButtonEl.addEventListener('click', this.indent);
        void this.initialize();
    }

    destroy() {
        this.isDestroyed = true;
        this.changeSubscription?.dispose();
        this.editor?.dispose();
        this.controls.compactButtonEl.removeEventListener('click', this.compact);
        this.controls.indentButtonEl.removeEventListener('click', this.indent);
    }

    private async initialize() {
        try {
            const monaco = await loadMonaco();
            if (this.isDestroyed) return;

            configureMonaco(monaco);
            this.editor = monaco.editor.create(this.editorContainerEl, {
                value: this.initialText,
                language: LANGUAGE_ID,
                theme: THEME_ID,
                ariaLabel: 'Código del análisis sintáctico',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                tabSize: 4,
                insertSpaces: true,
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                parameterHints: { enabled: false },
                hover: { enabled: false },
                lightbulb: { enabled: false },
                codeLens: false,
                bracketPairColorization: {
                    enabled: true,
                    independentColorPoolPerBracketType: true
                },
                matchBrackets: 'always'
            });
            this.changeSubscription = this.editor.onDidChangeModelContent(this.onInput);
            this.onInput();
        } catch {
            if (this.isDestroyed) return;
            this.controls.notificationEl.textContent = 'No se pudo cargar el editor de texto.';
            this.controls.compactButtonEl.disabled = true;
            this.controls.indentButtonEl.disabled = true;
        }
    }

    private onInput = () => {
        const draft = this.editor?.getValue();
        if (draft === undefined) return;

        try {
            const json = new SyntaxTree(syntaxReprToReducedJSON(draft)).toReducedJSON();
            this.controls.notificationEl.textContent = '';
            this.controls.compactButtonEl.disabled = false;
            this.controls.indentButtonEl.disabled = false;
            this.onValidChange(json);
        } catch {
            this.controls.notificationEl.textContent = 'La sintaxis no es válida. El análisis no se ha actualizado.';
            this.controls.compactButtonEl.disabled = true;
            this.controls.indentButtonEl.disabled = true;
        }
    };

    private compact = () => this.format(null);
    private indent = () => this.format(4);

    private format(indent: number | null) {
        if (!this.editor) return;

        try {
            const json = new SyntaxTree(syntaxReprToReducedJSON(this.editor.getValue())).toReducedJSON();
            this.editor.setValue(reducedJSONToSyntaxRepr(json, indent).repr);
        } catch {
            this.controls.notificationEl.textContent = 'La sintaxis no es válida. El análisis no se ha actualizado.';
        }
    }
}

function loadMonaco(): Promise<MonacoApi> {
    if (window.monaco) return Promise.resolve(window.monaco);
    if (monacoPromise) return monacoPromise;

    monacoPromise = new Promise((resolve, reject) => {
        const amdRequire = window.require;
        if (!amdRequire) {
            reject(new Error('Monaco loader is unavailable'));
            return;
        }

        const vsPath = new URL('./vs', document.baseURI).href;
        amdRequire.config({ paths: { vs: vsPath } });
        amdRequire(['vs/editor/editor.main'], () => {
            if (!window.monaco) {
                reject(new Error('Monaco editor did not initialize'));
                return;
            }
            resolve(window.monaco);
        }, reject);
    });

    return monacoPromise;
}

function configureMonaco(monaco: MonacoApi) {
    if (monacoConfigured) return;

    monaco.languages.register({ id: LANGUAGE_ID });
    monaco.languages.setLanguageConfiguration(LANGUAGE_ID, {
        brackets: [['(', ')'], ['[', ']'], ['{', '}']]
    });
    monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
        tokenizer: {
            root: [
                [/\s+/, ''],
                [/\[(?:\\.|[^\]\\])*(?:\]|$)/, 'comment'],
                [/"/, { token: '', next: '@string' }],
                [/((?:\\.|[^\\/()[\]"])+)(\/)((?:\\.|[^()[\]"])*)(?=\s*(?:\[[^\]]*\]\s*)?(?:\(|"))/, ['category', 'delimiter', 'function']],
                [/((?:\\.|[^()[\]"])+)(?=\s*(?:\[[^\]]*\]\s*)?(?:\(|"))/, 'function'],
                [/[(){}]/, 'delimiter.parenthesis'],
                [/./, '']
            ],
            string: [
                [/\\./, ''],
                [/"/, { token: '', next: '@pop' }],
                [/[^"\\]+/, '']
            ]
        }
    });
    monaco.editor.defineTheme(THEME_ID, {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'category', foreground: '7A4A1A', fontStyle: 'bold' },
            { token: 'function', foreground: '2F6B7F', fontStyle: 'bold' },
            { token: 'comment', foreground: '5B5B5B' }
        ],
        colors: {
            'editorBracketHighlight.foreground1': '#B5473C',
            'editorBracketHighlight.foreground2': '#287A8A',
            'editorBracketHighlight.foreground3': '#8A641F',
            'editorBracketHighlight.foreground4': '#527A45',
            'editorBracketHighlight.foreground5': '#875D8F',
            'editorBracketHighlight.foreground6': '#436C9A'
        }
    });
    monacoConfigured = true;
}

interface MonacoAmdRequire {
    config(options: { paths: Record<string, string> }): void;
    (modules: string[], onLoad: () => void, onError?: (error: Error) => void): void;
}

interface MonacoStandaloneEditor {
    getValue(): string;
    setValue(value: string): void;
    onDidChangeModelContent(listener: () => void): { dispose(): void };
    dispose(): void;
}

interface MonacoApi {
    editor: {
        create(container: HTMLElement, options: Record<string, unknown>): MonacoStandaloneEditor;
        defineTheme(themeId: string, theme: Record<string, unknown>): void;
    };
    languages: {
        register(language: { id: string }): void;
        setLanguageConfiguration(languageId: string, configuration: Record<string, unknown>): { dispose(): void };
        setMonarchTokensProvider(languageId: string, language: Record<string, unknown>): { dispose(): void };
    };
}

declare global {
    interface Window {
        monaco?: MonacoApi;
        require?: MonacoAmdRequire;
    }
}