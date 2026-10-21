export function createIcon(path, className) {
    const iconEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconEl.setAttribute('viewBox', '0 0 24 24');
    iconEl.setAttribute('class', className);
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.setAttribute('focusable', 'false');
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', path);
    iconEl.appendChild(pathEl);
    return iconEl;
}
//# sourceMappingURL=icons.js.map