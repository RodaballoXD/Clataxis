export function createEditorInterface(onReturnToSentenceScreen: () => void): { interfaceContainerEl: HTMLDivElement, rootContainerEl: HTMLElement } {
    const interfaceContainerEl = document.createElement('div');
    interfaceContainerEl.id = 'editor-container';
    interfaceContainerEl.className = 'editor-screen';

    // TODO: Add buttons and interface

    const rootContainerEl = document.createElement('section');
    rootContainerEl.id = 'editor-root-container';

    interfaceContainerEl.appendChild(rootContainerEl);

    return { interfaceContainerEl, rootContainerEl };
}