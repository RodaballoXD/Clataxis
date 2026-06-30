export function createEditorInterface(onReturnToSentenceScreen) {
    const interfaceContainerEl = document.createElement('div');
    interfaceContainerEl.id = 'editor-container';
    interfaceContainerEl.className = 'editor-screen';
    const homeButtonEl = createButton('Volver', 'Volver a introducir oración');
    homeButtonEl.id = 'editor-home-button';
    homeButtonEl.className = 'editor-floating-button';
    homeButtonEl.addEventListener('click', onReturnToSentenceScreen);
    const zoomControlsEl = document.createElement('div');
    zoomControlsEl.className = 'editor-floating-panel editor-zoom-controls';
    const zoomOutButtonEl = createButton('−', 'Reducir zoom');
    const zoomInButtonEl = createButton('+', 'Aumentar zoom');
    zoomControlsEl.replaceChildren(zoomOutButtonEl, zoomInButtonEl);
    const rootContainerEl = document.createElement('section');
    rootContainerEl.id = 'editor-root-container';
    const historyPanelEl = document.createElement('div');
    historyPanelEl.className = 'editor-history-panel';
    const notificationEl = document.createElement('div');
    notificationEl.className = 'editor-notification';
    notificationEl.setAttribute('role', 'status');
    notificationEl.setAttribute('aria-live', 'polite');
    const historyControlsEl = document.createElement('div');
    historyControlsEl.className = 'editor-floating-panel editor-history-controls';
    const undoButtonEl = createButton('↶', 'Deshacer');
    const redoButtonEl = createButton('↷', 'Rehacer');
    historyControlsEl.replaceChildren(undoButtonEl, redoButtonEl);
    historyPanelEl.replaceChildren(notificationEl, historyControlsEl);
    interfaceContainerEl.replaceChildren(homeButtonEl, zoomControlsEl, rootContainerEl, historyPanelEl);
    return {
        interfaceContainerEl,
        rootContainerEl,
        zoomInButtonEl,
        zoomOutButtonEl,
        undoButtonEl,
        redoButtonEl,
        notificationEl
    };
}
function createButton(text, label) {
    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.textContent = text;
    buttonEl.title = label;
    buttonEl.setAttribute('aria-label', label);
    return buttonEl;
}
//# sourceMappingURL=editor-screen.js.map