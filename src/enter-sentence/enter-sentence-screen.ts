export function createEnterSentenceEl(onComenzar: (sentence: string) => void): HTMLDivElement {
    const containerEl = document.createElement('div');
    containerEl.setAttribute('id', 'enter-sentence-container');

    const inputEl = document.createElement('input');
    inputEl.id = 'sentence-input';
    inputEl.placeholder = 'Introduce una oración y haz click en Comenzar';

    const buttonEl = document.createElement('button');
    buttonEl.id = 'button';
    buttonEl.textContent = 'Comenzar';
    buttonEl.addEventListener('click', () => {
        onComenzar(inputEl.value);
    });
    
    containerEl.replaceChildren(inputEl, buttonEl);

    return containerEl;
}