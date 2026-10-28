import { createIcon } from "./icons.js";
export function createButton(label, iconPath, iconClassName = 'editor-action-icon') {
    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.title = label;
    buttonEl.setAttribute('aria-label', label);
    if (iconPath)
        buttonEl.appendChild(createIcon(iconPath, iconClassName));
    return buttonEl;
}
//# sourceMappingURL=button.js.map