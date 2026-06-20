import { exampleSentence } from "../shared/consts.js";

export function createEnterSentenceEl(onComenzar: (sentence: string) => void): HTMLDivElement {
    const containerEl = document.createElement('div');
    containerEl.id = 'enter-sentence-container';
    containerEl.className = 'sentence-screen';

    const panelEl = document.createElement('section');
    panelEl.className = 'sentence-panel';
    panelEl.setAttribute('aria-labelledby', 'sentence-screen-title');

    const titleEl = document.createElement('h1');
    titleEl.id = 'sentence-screen-title';
    titleEl.textContent = "Clataxis";

    const etymologyEl = document.createElement('p');
    etymologyEl.className = 'sentence-subtitle';
    etymologyEl.textContent = "De kládos y taxis";

    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'sentence-subtitle';
    descriptionEl.textContent = "Editor para análisis sintáctico online";

    const formEl = document.createElement('form');
    formEl.className = 'sentence-form';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = 'sentence-input';
    labelEl.textContent = "Oración";

    const fieldEl = document.createElement('div');
    fieldEl.className = 'sentence-field';

    const inputEl = document.createElement('input');
    inputEl.id = 'sentence-input';
    inputEl.name = 'sentence';
    inputEl.type = 'text';
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = true;
    inputEl.placeholder = `Introduce el texto a analizar. p. ej.: "${exampleSentence}"`;

    const buttonEl = document.createElement('button');
    buttonEl.id = 'start-button';
    buttonEl.type = 'submit';
    buttonEl.textContent = "Comenzar";

    formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        onComenzar(inputEl.value);
    });

    fieldEl.replaceChildren(inputEl, buttonEl);
    formEl.replaceChildren(labelEl, fieldEl);
    panelEl.replaceChildren(titleEl, etymologyEl, descriptionEl, formEl);
    containerEl.replaceChildren(panelEl);

    return containerEl;
}
