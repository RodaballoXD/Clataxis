import { exampleSentence } from "../shared/consts.js";
import { createButton } from "../shared/button.js";
import { renderMarkdown } from "./markdown.js";

function createAboutDialog(): { dialogEl: HTMLDialogElement; loadContent: () => Promise<void> } {
    const dialogEl = document.createElement('dialog');
    dialogEl.className = 'about-dialog';
    dialogEl.setAttribute('aria-label', 'Información sobre Clataxis');

    const contentEl = document.createElement('div');
    contentEl.className = 'about-content';

    const headerEl = document.createElement('div');
    headerEl.className = 'about-header';

    const closeButtonEl = createButton('Cerrar información sobre Clataxis', 'M6 6l12 12M18 6 6 18', 'about-close-icon');
    closeButtonEl.className = 'about-close';
    closeButtonEl.addEventListener('click', () => dialogEl.close());
    headerEl.replaceChildren(closeButtonEl);

    const markdownContentEl = document.createElement('div');
    markdownContentEl.className = 'about-markdown';
    const statusEl = document.createElement('p');
    statusEl.setAttribute('role', 'status');
    statusEl.textContent = 'Cargando información…';
    markdownContentEl.appendChild(statusEl);

    contentEl.replaceChildren(headerEl, markdownContentEl);
    dialogEl.appendChild(contentEl);

    let isLoaded = false;
    let isLoading = false;
    const loadContent = async () => {
        if (isLoaded || isLoading) return;
        isLoading = true;
        statusEl.textContent = 'Cargando información…';
        markdownContentEl.replaceChildren(statusEl);

        try {
            const response = await fetch(new URL('./about-page.md', import.meta.url));
            if (!response.ok) throw new Error(`Could not load about page (${response.status})`);
            const markdown = await response.text();
            markdownContentEl.replaceChildren(renderMarkdown(markdown));
            dialogEl.removeAttribute('aria-label');
            dialogEl.setAttribute('aria-labelledby', 'about-page-title');
            isLoaded = true;
        } catch (error) {
            console.error('Could not load the about page.', error);
            statusEl.setAttribute('role', 'alert');
            statusEl.textContent = 'No se pudo cargar la información. Cierra y vuelve a abrir esta ventana para intentarlo de nuevo.';
            markdownContentEl.replaceChildren(statusEl);
        } finally {
            isLoading = false;
        }
    };

    return { dialogEl, loadContent };
}

export function createEnterSentenceEl(onComenzar: (sentence: string) => void): HTMLDivElement {
    const containerEl = document.createElement('div');
    containerEl.id = 'enter-sentence-container';
    containerEl.className = 'sentence-screen';

    const headerEl = document.createElement('header');
    headerEl.className = 'home-header';

    const brandEl = document.createElement('a');
    brandEl.className = 'home-brand';
    brandEl.href = './';
    brandEl.setAttribute('aria-label', 'Clataxis, inicio');

    const brandIconEl = document.createElement('img');
    brandIconEl.className = 'home-brand-icon';
    brandIconEl.src = './favicon.svg';
    brandIconEl.alt = '';

    const brandNameEl = document.createElement('span');
    brandNameEl.textContent = 'Clataxis';
    brandEl.replaceChildren(brandIconEl, brandNameEl);

    const aboutButtonEl = document.createElement('button');
    aboutButtonEl.className = 'about-button';
    aboutButtonEl.type = 'button';
    aboutButtonEl.textContent = 'Acerca de Clataxis';

    const aboutDialog = createAboutDialog();
    aboutButtonEl.addEventListener('click', () => {
        aboutDialog.dialogEl.showModal();
        void aboutDialog.loadContent();
    });
    headerEl.replaceChildren(brandEl, aboutButtonEl);

    const mainEl = document.createElement('main');
    mainEl.className = 'sentence-main';

    const panelEl = document.createElement('section');
    panelEl.className = 'sentence-panel';
    panelEl.setAttribute('aria-labelledby', 'sentence-screen-title');

    const titleEl = document.createElement('h1');
    titleEl.id = 'sentence-screen-title';
    titleEl.textContent = 'Clataxis';

    const etymologyEl = document.createElement('p');
    etymologyEl.className = 'sentence-etymology';
    etymologyEl.textContent = 'De kládos y taxis';

    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'sentence-description';
    descriptionEl.textContent = 'Editor en línea para el análisis sintáctico. Escribe una oración y construye su análisis.';

    const formEl = document.createElement('form');
    formEl.className = 'sentence-form';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = 'sentence-input';
    labelEl.textContent = 'Tu oración';

    const fieldEl = document.createElement('div');
    fieldEl.className = 'sentence-field';

    const inputEl = document.createElement('input');
    inputEl.id = 'sentence-input';
    inputEl.name = 'sentence';
    inputEl.type = 'text';
    inputEl.autocomplete = 'off';
    inputEl.spellcheck = true;
    inputEl.placeholder = `Por ejemplo: «${exampleSentence}»`;

    const buttonEl = document.createElement('button');
    buttonEl.id = 'start-button';
    buttonEl.type = 'submit';
    buttonEl.textContent = 'Comenzar';

    formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        onComenzar(inputEl.value);
    });

    fieldEl.replaceChildren(inputEl, buttonEl);
    formEl.replaceChildren(labelEl, fieldEl);
    panelEl.replaceChildren(titleEl, etymologyEl, descriptionEl, formEl);
    mainEl.appendChild(panelEl);
    containerEl.replaceChildren(headerEl, mainEl, aboutDialog.dialogEl);

    return containerEl;
}
