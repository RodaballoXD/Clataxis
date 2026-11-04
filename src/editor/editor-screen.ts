import { createIcon } from "../shared/icons.js";
import { createButton } from "../shared/button.js";

export function createEditorInterface(
    onReturnToSentenceScreen: () => void,
    onModeChange: (mode: EditorMode) => void,
    mode: EditorMode,
    onBeforeAction: () => void,
    onCopyLink: () => void,
    onCopyToGoogleDocs: () => void
): EditorInterfaceEls {
    const interfaceContainerEl = document.createElement('div');
    interfaceContainerEl.id = 'editor-container';
    interfaceContainerEl.className = 'editor-screen';
    interfaceContainerEl.dataset.mode = mode;

    const modeSelectorEl = document.createElement('div');
    modeSelectorEl.className = 'editor-mode-selector';
    const modeMenuButtonEl = createButton('Abrir menú de edición', 'M4 6h16M4 12h16M4 18h16', 'editor-menu-icon');
    modeMenuButtonEl.className = 'editor-mode-menu-button';
    modeMenuButtonEl.setAttribute('aria-haspopup', 'true');
    modeMenuButtonEl.setAttribute('aria-expanded', 'false');
    modeMenuButtonEl.setAttribute('aria-controls', 'editor-mode-dropdown');

    const modeDropdownEl = document.createElement('div');
    modeDropdownEl.id = 'editor-mode-dropdown';
    modeDropdownEl.className = 'editor-mode-dropdown';
    modeDropdownEl.hidden = true;
    modeDropdownEl.setAttribute('role', 'group');
    modeDropdownEl.setAttribute('aria-label', 'Modos de edición');

    const treeModeButtonEl = createModeButton('Árbol', 'M12 20v-5m0 0H7m5 0h5M7 15v-4m10 0v4M7 11v-3m10 0v3M4 8h6m4 0h6', mode === 'tree');
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

    const returnButtonEl = createButton('Volver a introducir oración', 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6', 'editor-mode-icon');
    returnButtonEl.className = 'editor-return-button';
    const returnButtonLabelEl = document.createElement('span');
    returnButtonLabelEl.textContent = 'Volver';
    returnButtonEl.appendChild(returnButtonLabelEl);
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
        if (!copyMenuEl.contains(event.target as Node)) setCopyDropdownOpen(false);
    });
    interfaceContainerEl.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (modeMenuButtonEl.getAttribute('aria-expanded') === 'true') {
            event.preventDefault();
            setModeDropdownOpen(false);
            modeMenuButtonEl.focus();
        } else if (copyMenuButtonEl.getAttribute('aria-expanded') === 'true') {
            event.preventDefault();
            setCopyDropdownOpen(false);
            copyMenuButtonEl.focus();
        }
    });
    modeSelectorEl.append(modeMenuButtonEl, modeDropdownEl);

    const copyMenuEl = document.createElement('div');
    copyMenuEl.className = 'editor-copy-menu';
    const copyMenuButtonEl = createButton(
        'Abrir menú para copiar',
        'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
        'editor-copy-icon'
    );
    copyMenuButtonEl.className = 'editor-copy-docs-button';
    copyMenuButtonEl.setAttribute('aria-haspopup', 'true');
    copyMenuButtonEl.setAttribute('aria-expanded', 'false');
    copyMenuButtonEl.setAttribute('aria-controls', 'editor-copy-dropdown');

    const copyDropdownEl = document.createElement('div');
    copyDropdownEl.id = 'editor-copy-dropdown';
    copyDropdownEl.className = 'editor-copy-dropdown';
    copyDropdownEl.hidden = true;
    copyDropdownEl.setAttribute('role', 'group');
    copyDropdownEl.setAttribute('aria-label', 'Opciones para copiar');

    const copyLinkButtonEl = createButton(
        'Copiar enlace',
        'M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71 M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71',
        'editor-mode-icon'
    );
    copyLinkButtonEl.className = 'editor-copy-option';
    const copyLinkLabelEl = document.createElement('span');
    copyLinkLabelEl.textContent = 'Copiar enlace';
    copyLinkButtonEl.appendChild(copyLinkLabelEl);
    copyLinkButtonEl.addEventListener('click', () => {
        setCopyDropdownOpen(false);
        onBeforeAction();
        onCopyLink();
    });

    const copyToGoogleDocsButtonEl = createButton(
        'Copiar como tabla',
        'M3 4h18v16H3z M3 10h18 M9 4v16 M15 4v16',
        'editor-mode-icon'
    );
    copyToGoogleDocsButtonEl.className = 'editor-copy-option';
    const copyTableLabelEl = document.createElement('span');
    copyTableLabelEl.textContent = 'Copiar como tabla';
    copyToGoogleDocsButtonEl.appendChild(copyTableLabelEl);
    copyToGoogleDocsButtonEl.addEventListener('click', () => {
        setCopyDropdownOpen(false);
        onBeforeAction();
        onCopyToGoogleDocs();
    });
    copyDropdownEl.append(copyLinkButtonEl, copyToGoogleDocsButtonEl);
    copyMenuButtonEl.addEventListener('click', () => {
        const isOpen = copyMenuButtonEl.getAttribute('aria-expanded') === 'true';
        setCopyDropdownOpen(!isOpen);
    });
    copyMenuEl.append(copyMenuButtonEl, copyDropdownEl);

    const copyTextButtonEl = createButton(
        'Copiar texto del editor',
        'M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2 M9 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
        'editor-copy-text-icon'
    );
    copyTextButtonEl.className = 'editor-copy-text-button';
    copyTextButtonEl.disabled = true;

    const textControlsEl = document.createElement('div');
    textControlsEl.className = 'editor-floating-panel editor-text-controls';
    const compactButtonEl = createButton(
        'Compactar el análisis. Ideal para compartirlo con un LLM',
        'M8 4H5a2 2 0 0 0-2 2v3m18 0V6a2 2 0 0 0-2-2h-3M3 15v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M8 8l-3 4 3 4m8-8 3 4-3 4'
    );
    const indentButtonEl = createButton(
        'Embellecer e indentar el análisis',
        'M4 6h16M10 10h10M10 14h10M4 18h16M4 10l3 2-3 2'
    );
    textControlsEl.replaceChildren(compactButtonEl, indentButtonEl);

    const topRightControlsEl = document.createElement('div');
    topRightControlsEl.className = 'editor-top-right-controls';
    topRightControlsEl.append(copyMenuEl, textControlsEl, copyTextButtonEl);

    function setModeDropdownOpen(isOpen: boolean) {
        modeDropdownEl.hidden = !isOpen;
        modeMenuButtonEl.setAttribute('aria-expanded', String(isOpen));
    }

    function setCopyDropdownOpen(isOpen: boolean) {
        copyDropdownEl.hidden = !isOpen;
        copyMenuButtonEl.setAttribute('aria-expanded', String(isOpen));
        copyMenuButtonEl.setAttribute('aria-label', isOpen ? 'Cerrar opciones para copiar' : 'Abrir menú para copiar');
        copyMenuButtonEl.title = isOpen ? 'Cerrar opciones para copiar' : 'Abrir menú para copiar';
    }

    function closeModeDropdown() {
        setModeDropdownOpen(false);
    }

    const zoomControlsEl = document.createElement('div');
    zoomControlsEl.className = 'editor-floating-panel editor-zoom-controls';

    const zoomOutButtonEl = createButton('Reducir zoom (-)', 'M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12 M15 15l5 5 M7.5 10.5h6');
    const zoomInButtonEl = createButton('Aumentar zoom (+)', 'M10.5 4.5a6 6 0 1 0 0 12a6 6 0 0 0 0-12 M15 15l5 5 M10.5 7.5v6 M7.5 10.5h6');
    zoomControlsEl.replaceChildren(zoomOutButtonEl, zoomInButtonEl);

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

    const undoButtonEl = createButton('Deshacer (Ctrl+z)', 'M9 14l-4-4 4-4 M5 10h8a6 6 0 0 1 6 6v2');
    const redoButtonEl = createButton('Rehacer (Ctrl+y)', 'M15 6l4 4-4 4 M19 10h-8a6 6 0 0 0-6 6v2');
    undoButtonEl.addEventListener('click', onBeforeAction);
    redoButtonEl.addEventListener('click', onBeforeAction);
    historyControlsEl.replaceChildren(undoButtonEl, redoButtonEl);
    historyPanelEl.replaceChildren(notificationEl, historyControlsEl);

    interfaceContainerEl.replaceChildren(
        modeSelectorEl,
        topRightControlsEl,
        zoomControlsEl,
        guidedPanelEl,
        rootContainerEl,
        historyPanelEl
    );

    return {
        interfaceContainerEl,
        topRightControlsEl,
        rootContainerEl,
        guidedPanelEl,
        zoomInButtonEl,
        zoomOutButtonEl,
        compactButtonEl,
        indentButtonEl,
        undoButtonEl,
        redoButtonEl,
        notificationEl,
        copyToGoogleDocsButtonEl,
        copyTextButtonEl
    };
}

function createModeButton(label: string, iconPath: string, isActive: boolean): HTMLButtonElement {
    const buttonEl = createButton(`Cambiar al editor de ${label.toLowerCase()}`, iconPath, 'editor-mode-icon');
    buttonEl.className = 'editor-mode-option';
    buttonEl.setAttribute('aria-pressed', String(isActive));

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const checkEl = createIcon('M5 12l4 4L19 6', 'editor-mode-check');
    buttonEl.append(labelEl, checkEl);
    return buttonEl;
}

export interface EditorInterfaceEls {
    interfaceContainerEl: HTMLDivElement;
    topRightControlsEl: HTMLDivElement;
    rootContainerEl: HTMLElement;
    guidedPanelEl: HTMLElement;
    zoomInButtonEl: HTMLButtonElement;
    zoomOutButtonEl: HTMLButtonElement;
    compactButtonEl: HTMLButtonElement;
    indentButtonEl: HTMLButtonElement;
    undoButtonEl: HTMLButtonElement;
    redoButtonEl: HTMLButtonElement;
    notificationEl: HTMLDivElement;
    copyToGoogleDocsButtonEl: HTMLButtonElement;
    copyTextButtonEl: HTMLButtonElement;
}

export type EditorMode = 'tree' | 'text';
