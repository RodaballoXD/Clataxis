export function createEditorInterface(onReturnToSentenceScreen, onModeChange, mode, onBeforeAction) {
    const interfaceContainerEl = document.createElement('div');
    interfaceContainerEl.id = 'editor-container';
    interfaceContainerEl.className = 'editor-screen';
    interfaceContainerEl.dataset.mode = mode;
    const homeButtonEl = createButton('Volver', 'Volver a introducir oración');
    homeButtonEl.id = 'editor-home-button';
    homeButtonEl.className = 'editor-floating-button';
    homeButtonEl.addEventListener('click', () => {
        onBeforeAction();
        onReturnToSentenceScreen();
    });
    const modeSelectorEl = document.createElement('div');
    modeSelectorEl.className = 'editor-mode-selector';
    modeSelectorEl.setAttribute('role', 'group');
    modeSelectorEl.setAttribute('aria-label', 'Modo de edición');
    const treeModeButtonEl = createButton('Árbol', 'Cambiar al editor de árbol');
    const textModeButtonEl = createButton('Texto', 'Cambiar al editor de texto');
    const guidedModeButtonEl = createButton('Guiado', 'Cambiar al modo guiado');
    treeModeButtonEl.setAttribute('aria-pressed', String(mode === 'tree'));
    textModeButtonEl.setAttribute('aria-pressed', String(mode === 'text'));
    guidedModeButtonEl.setAttribute('aria-pressed', String(mode === 'guided'));
    treeModeButtonEl.classList.toggle('is-active', mode === 'tree');
    textModeButtonEl.classList.toggle('is-active', mode === 'text');
    guidedModeButtonEl.classList.toggle('is-active', mode === 'guided');
    treeModeButtonEl.addEventListener('click', () => {
        onBeforeAction();
        onModeChange('tree');
    });
    textModeButtonEl.addEventListener('click', () => {
        onBeforeAction();
        onModeChange('text');
    });
    guidedModeButtonEl.addEventListener('click', () => {
        onBeforeAction();
        onModeChange('guided');
    });
    modeSelectorEl.replaceChildren(treeModeButtonEl, textModeButtonEl, guidedModeButtonEl);
    const zoomControlsEl = document.createElement('div');
    zoomControlsEl.className = 'editor-floating-panel editor-zoom-controls';
    const zoomOutButtonEl = createButton('−', 'Reducir zoom');
    const zoomInButtonEl = createButton('+', 'Aumentar zoom');
    zoomControlsEl.replaceChildren(zoomOutButtonEl, zoomInButtonEl);
    const textControlsEl = document.createElement('div');
    textControlsEl.className = 'editor-floating-panel editor-text-controls';
    const compactButtonEl = createButton('Compactar', 'Compactar el código');
    const indentButtonEl = createButton('Indentar', 'Embellecer e indentar el código');
    textControlsEl.replaceChildren(compactButtonEl, indentButtonEl);
    const rootContainerEl = document.createElement('section');
    rootContainerEl.id = 'editor-root-container';
    const guidedPanelEl = document.createElement('section');
    guidedPanelEl.className = 'guided-panel';
    guidedPanelEl.hidden = mode !== 'guided';
    guidedPanelEl.setAttribute('aria-live', 'polite');
    guidedPanelEl.setAttribute('aria-label', 'Análisis guiado');
    const historyPanelEl = document.createElement('div');
    historyPanelEl.className = 'editor-history-panel';
    const notificationEl = document.createElement('div');
    notificationEl.className = 'editor-notification';
    notificationEl.setAttribute('role', 'status');
    notificationEl.setAttribute('aria-live', 'polite');
    const historyControlsEl = document.createElement('div');
    historyControlsEl.className = 'editor-floating-panel editor-history-controls';
    const undoButtonEl = createButton('↶', 'Deshacer (Ctrl+z)');
    const redoButtonEl = createButton('↷', 'Rehacer (Ctrl+y)');
    undoButtonEl.addEventListener('click', onBeforeAction);
    redoButtonEl.addEventListener('click', onBeforeAction);
    historyControlsEl.replaceChildren(undoButtonEl, redoButtonEl);
    historyPanelEl.replaceChildren(notificationEl, historyControlsEl);
    interfaceContainerEl.replaceChildren(homeButtonEl, modeSelectorEl, zoomControlsEl, textControlsEl, guidedPanelEl, rootContainerEl, historyPanelEl);
    return {
        interfaceContainerEl,
        rootContainerEl,
        guidedPanelEl,
        zoomInButtonEl,
        zoomOutButtonEl,
        compactButtonEl,
        indentButtonEl,
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