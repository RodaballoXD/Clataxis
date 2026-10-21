import { createIcon } from "../shared/icons.js";

export function createEditorInterface(
    onReturnToSentenceScreen: () => void,
    onModeChange: (mode: EditorMode) => void,
    mode: EditorMode,
    onBeforeAction: () => void
): EditorInterfaceEls {
    const interfaceContainerEl = document.createElement('div');
    interfaceContainerEl.id = 'editor-container';
    interfaceContainerEl.className = 'editor-screen';
    interfaceContainerEl.dataset.mode = mode;

    const modeSelectorEl = document.createElement('div');
    modeSelectorEl.className = 'editor-mode-selector';
    const modeMenuButtonEl = createButton('', 'Abrir menú de edición');
    modeMenuButtonEl.className = 'editor-mode-menu-button';
    modeMenuButtonEl.setAttribute('aria-haspopup', 'true');
    modeMenuButtonEl.setAttribute('aria-expanded', 'false');
    modeMenuButtonEl.setAttribute('aria-controls', 'editor-mode-dropdown');
    modeMenuButtonEl.appendChild(createIcon('M4 6h16M4 12h16M4 18h16', 'editor-menu-icon'));

    const modeDropdownEl = document.createElement('div');
    modeDropdownEl.id = 'editor-mode-dropdown';
    modeDropdownEl.className = 'editor-mode-dropdown';
    modeDropdownEl.hidden = true;
    modeDropdownEl.setAttribute('role', 'group');
    modeDropdownEl.setAttribute('aria-label', 'Modos de edición');

    const treeModeButtonEl = createModeButton('Árbol', 'M12 4v5m0 0H7m5 0h5M7 9v4m10-4v4M7 13v3m10-3v3M4 16h6m4 0h6', mode === 'tree');
    const textModeButtonEl = createModeButton('Texto', 'M4 6h16M4 10h16M4 14h12M4 18h12', mode === 'text');
    treeModeButtonEl.addEventListener('click', () => {
        closeModeDropdown();
        if (mode !== 'tree') {
            onBeforeAction();
            onModeChange('tree');
        }
    });
    textModeButtonEl.addEventListener('click', () => {
        closeModeDropdown();
        if (mode !== 'text') {
            onBeforeAction();
            onModeChange('text');
        }
    });

    const separatorEl = document.createElement('div');
    separatorEl.className = 'editor-mode-separator';
    separatorEl.setAttribute('role', 'separator');

    const returnButtonEl = createButton('Volver', 'Volver a introducir oración');
    returnButtonEl.className = 'editor-return-button';
    returnButtonEl.prepend(createIcon('M19 12H5m0 0 6 6m-6-6 6-6', 'editor-mode-icon'));
    returnButtonEl.addEventListener('click', () => {
        closeModeDropdown();
        onBeforeAction();
        onReturnToSentenceScreen();
    });
    modeDropdownEl.append(treeModeButtonEl, textModeButtonEl, separatorEl, returnButtonEl);

    modeMenuButtonEl.addEventListener('click', () => {
        const isOpen = modeMenuButtonEl.getAttribute('aria-expanded') === 'true';
        setModeDropdownOpen(!isOpen);
    });
    interfaceContainerEl.addEventListener('click', (event) => {
        if (!modeSelectorEl.contains(event.target as Node)) setModeDropdownOpen(false);
    });
    interfaceContainerEl.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modeMenuButtonEl.getAttribute('aria-expanded') === 'true') {
            event.preventDefault();
            setModeDropdownOpen(false);
            modeMenuButtonEl.focus();
        }
    });
    modeSelectorEl.append(modeMenuButtonEl, modeDropdownEl);

    function setModeDropdownOpen(isOpen: boolean) {
        modeDropdownEl.hidden = !isOpen;
        modeMenuButtonEl.setAttribute('aria-expanded', String(isOpen));
    }

    function closeModeDropdown() {
        setModeDropdownOpen(false);
    }

    const zoomControlsEl = document.createElement('div');
    zoomControlsEl.className = 'editor-floating-panel editor-zoom-controls';

    const zoomOutButtonEl = createButton('', 'Reducir zoom');
    zoomOutButtonEl.appendChild(createIcon('M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12 M15 15l5 5 M7.5 10.5h6', 'editor-action-icon'));
    const zoomInButtonEl = createButton('', 'Aumentar zoom');
    zoomInButtonEl.appendChild(createIcon('M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12 M15 15l5 5 M10.5 7.5v6 M7.5 10.5h6', 'editor-action-icon'));
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
    guidedPanelEl.hidden = true;
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

    const undoButtonEl = createButton('', 'Deshacer (Ctrl+z)');
    undoButtonEl.appendChild(createIcon('M9 14l-4-4 4-4 M5 10h8a6 6 0 0 1 6 6v2', 'editor-action-icon'));
    const redoButtonEl = createButton('', 'Rehacer (Ctrl+y)');
    redoButtonEl.appendChild(createIcon('M15 6l4 4-4 4 M19 10h-8a6 6 0 0 0-6 6v2', 'editor-action-icon'));
    undoButtonEl.addEventListener('click', onBeforeAction);
    redoButtonEl.addEventListener('click', onBeforeAction);
    historyControlsEl.replaceChildren(undoButtonEl, redoButtonEl);
    historyPanelEl.replaceChildren(notificationEl, historyControlsEl);

    interfaceContainerEl.replaceChildren(
        modeSelectorEl,
        zoomControlsEl,
        textControlsEl,
        guidedPanelEl,
        rootContainerEl,
        historyPanelEl
    );

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

function createButton(text: string, label: string): HTMLButtonElement {
    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.textContent = text;
    buttonEl.title = label;
    buttonEl.setAttribute('aria-label', label);
    return buttonEl;
}

function createModeButton(label: string, iconPath: string, isActive: boolean): HTMLButtonElement {
    const buttonEl = createButton(label, `Cambiar al editor de ${label.toLowerCase()}`);
    buttonEl.className = 'editor-mode-option';
    buttonEl.setAttribute('aria-pressed', String(isActive));

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const checkEl = createIcon('M5 12l4 4L19 6', 'editor-mode-check');
    buttonEl.replaceChildren(createIcon(iconPath, 'editor-mode-icon'), labelEl, checkEl);
    return buttonEl;
}

export interface EditorInterfaceEls {
    interfaceContainerEl: HTMLDivElement;
    rootContainerEl: HTMLElement;
    guidedPanelEl: HTMLElement;
    zoomInButtonEl: HTMLButtonElement;
    zoomOutButtonEl: HTMLButtonElement;
    compactButtonEl: HTMLButtonElement;
    indentButtonEl: HTMLButtonElement;
    undoButtonEl: HTMLButtonElement;
    redoButtonEl: HTMLButtonElement;
    notificationEl: HTMLDivElement;
}

export type EditorMode = 'tree' | 'text';
