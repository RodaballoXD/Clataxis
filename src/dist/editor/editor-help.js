import { createIcon } from "../shared/icons.js";
const REOPEN_HINT_DURATION_MS = 2500;
const EDITOR_GUIDE_STEPS = [
    {
        heading: 'Crea una caja',
        description: 'Haz clic y arrastra desde la primera hasta la última palabra que quieras incluir en un sintagma u oración. Al soltar se creará una caja.'
    },
    {
        heading: 'Escribe el análsis de una caja',
        description: 'Haz doble clic en una caja para editar su análisis. Podrás modificar su categoría y función y añadir comentarios.'
    },
    {
        heading: 'Elimina una caja',
        description: 'Haz clic en una caja para seleccionarla. Utiliza los botones que aparecerán debajo para eliminarla, junto con su contenido o no.'
    },
    {
        heading: 'Ajusta el tamaño de una caja',
        description: 'Haz clic en una caja para seleccionarla. Arrastra sus bordes para cambiar su tamaño.'
    },
    {
        heading: 'Edita la oración',
        description: 'Haz doble clic en la oración para editar una palabra. Puedes reemplazarla, añadir nuevas palabras separándolas con espacios o eliminarla. También puedes añadir comentarios.'
    },
    {
        heading: 'Deshaz y rehaz cambios',
        description: 'Utiliza los botones de deshacer y rehacer para revertir o recuperar cambios recientes.'
    },
    {
        heading: 'Usa atajos de teclado',
        description: 'Ctrl + Z para deshacer, Ctrl + Y para rehacer, Enter para terminar una edición... Coloca el cursor sobre cualquier botón para ver su atajo de teclado.'
    }
];
export function createEditorHelp(options) {
    const containerEl = document.createElement('div');
    containerEl.className = 'editor-help';
    const panelEl = document.createElement('section');
    panelEl.id = 'editor-help-panel';
    panelEl.className = 'editor-help-panel';
    panelEl.setAttribute('aria-labelledby', 'editor-help-heading');
    const closeButtonEl = document.createElement('button');
    closeButtonEl.className = 'editor-help-close';
    closeButtonEl.type = 'button';
    closeButtonEl.appendChild(createIcon('M6 6l12 12M18 6 6 18', 'editor-help-icon'));
    closeButtonEl.setAttribute('aria-label', 'Cerrar guía del editor');
    closeButtonEl.addEventListener('click', () => {
        setOpen(false);
        helpButtonEl.focus();
    });
    const progressEl = document.createElement('p');
    progressEl.className = 'editor-help-progress';
    progressEl.setAttribute('aria-live', 'polite');
    progressEl.setAttribute('aria-atomic', 'true');
    const headingEl = document.createElement('h2');
    headingEl.id = 'editor-help-heading';
    const descriptionEl = document.createElement('p');
    descriptionEl.className = 'editor-help-description';
    descriptionEl.setAttribute('aria-live', 'polite');
    descriptionEl.setAttribute('aria-atomic', 'true');
    const previousButtonEl = document.createElement('button');
    previousButtonEl.className = 'editor-help-step editor-help-previous';
    previousButtonEl.type = 'button';
    previousButtonEl.appendChild(createIcon('M15 18l-6-6 6-6', 'editor-help-icon'));
    previousButtonEl.setAttribute('aria-label', 'Pista anterior');
    previousButtonEl.addEventListener('click', () => showStep(currentStep - 1));
    const nextButtonEl = document.createElement('button');
    nextButtonEl.className = 'editor-help-step editor-help-next';
    nextButtonEl.type = 'button';
    nextButtonEl.appendChild(createIcon('M9 18l6-6-6-6', 'editor-help-icon'));
    nextButtonEl.setAttribute('aria-label', 'Pista siguiente');
    nextButtonEl.addEventListener('click', () => showStep(currentStep + 1));
    const helpButtonEl = document.createElement('button');
    helpButtonEl.className = 'editor-help-button';
    helpButtonEl.type = 'button';
    helpButtonEl.appendChild(createIcon('M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m-.01 4h.01', 'editor-help-icon'));
    helpButtonEl.setAttribute('aria-label', 'Abrir guía del editor');
    helpButtonEl.setAttribute('aria-controls', panelEl.id);
    helpButtonEl.addEventListener('click', () => {
        setOpen(true);
        closeButtonEl.focus();
    });
    const reopenHintEl = document.createElement('p');
    reopenHintEl.className = 'editor-help-reopen-hint';
    reopenHintEl.textContent = 'Puedes volver a abrir esta guía aquí.';
    reopenHintEl.setAttribute('role', 'status');
    panelEl.append(closeButtonEl, progressEl, headingEl, descriptionEl, previousButtonEl, nextButtonEl);
    containerEl.append(panelEl, helpButtonEl, reopenHintEl);
    let currentStep = 0;
    let isOpen = options.initiallyOpen;
    let reopenHintTimeout = null;
    function showStep(stepIndex) {
        currentStep = Math.max(0, Math.min(stepIndex, EDITOR_GUIDE_STEPS.length - 1));
        const step = EDITOR_GUIDE_STEPS[currentStep];
        progressEl.textContent = `${currentStep + 1} de ${EDITOR_GUIDE_STEPS.length}`;
        headingEl.textContent = step.heading;
        descriptionEl.textContent = step.description;
        previousButtonEl.disabled = currentStep === 0;
        nextButtonEl.disabled = currentStep === EDITOR_GUIDE_STEPS.length - 1;
    }
    function handleKeyDown(event) {
        const targetIsEditable = event.target instanceof Element
            && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), .monaco-editor');
        if (!isOpen || targetIsEditable) {
            return false;
        }
        if (event.key === 'ArrowLeft') {
            showStep(currentStep - 1);
        }
        else if (event.key === 'ArrowRight') {
            showStep(currentStep + 1);
        }
        else {
            return false;
        }
        event.preventDefault();
        return true;
    }
    function setOpen(nextIsOpen) {
        if (isOpen === nextIsOpen)
            return;
        isOpen = nextIsOpen;
        panelEl.hidden = !isOpen;
        helpButtonEl.hidden = isOpen;
        helpButtonEl.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
            hideReopenHint();
        }
        else {
            showReopenHint();
        }
        options.onOpenChange(isOpen);
    }
    function showReopenHint() {
        if (reopenHintTimeout !== null) {
            window.clearTimeout(reopenHintTimeout);
        }
        reopenHintEl.hidden = false;
        reopenHintTimeout = window.setTimeout(hideReopenHint, REOPEN_HINT_DURATION_MS);
    }
    function hideReopenHint() {
        if (reopenHintTimeout !== null) {
            window.clearTimeout(reopenHintTimeout);
            reopenHintTimeout = null;
        }
        reopenHintEl.hidden = true;
    }
    showStep(currentStep);
    panelEl.hidden = !isOpen;
    helpButtonEl.hidden = isOpen;
    helpButtonEl.setAttribute('aria-expanded', String(isOpen));
    reopenHintEl.hidden = true;
    if (!isOpen)
        showReopenHint();
    return {
        element: containerEl,
        focus: () => closeButtonEl.focus(),
        handleKeyDown
    };
}
//# sourceMappingURL=editor-help.js.map