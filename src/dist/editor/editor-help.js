import { createIcon } from "../shared/icons.js";
const REOPEN_HINT_DURATION_MS = 2500;
const EDITOR_GUIDE_STEPS = [
    {
        heading: 'Crea una caja',
        description: 'En el árbol, arrastra desde la primera palabra hasta la última que quieras agrupar. Al soltar, se crea una caja y puedes escribir su etiqueta.'
    },
    {
        heading: 'Edita una caja',
        description: 'Haz clic una vez en una caja para seleccionarla y vuelve a hacer clic para editar sus campos. Pulsa Intro para terminar la edición.'
    },
    {
        heading: 'Ajusta o quita una caja',
        description: 'Selecciona una caja y arrastra uno de sus bordes para cambiar las palabras que abarca. Usa «Quitar caja» para conservar su contenido o «Eliminar caja y su contenido» para borrarlo todo.'
    },
    {
        heading: 'Deshaz cambios y ajusta la vista',
        description: 'Usa los botones de deshacer y rehacer, o Ctrl+Z y Ctrl+Y. Los botones + y − cambian el zoom del árbol.'
    },
    {
        heading: 'Prueba el editor de texto',
        description: 'Abre el menú de la esquina superior izquierda y elige «Texto» para editar el análisis directamente. «Compactar» e «Indentar» cambian su formato; si la sintaxis no es válida, el análisis no se actualiza.'
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
    return containerEl;
}
//# sourceMappingURL=editor-help.js.map