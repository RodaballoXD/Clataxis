import { createIcon } from "./icons.js";

export function createButton(label: string, iconPath?: string, iconClassName = 'editor-action-icon'): HTMLButtonElement {
    const buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.title = label;
    buttonEl.setAttribute('aria-label', label);
    if (iconPath) buttonEl.appendChild(createIcon(iconPath, iconClassName));
    return buttonEl;
}
