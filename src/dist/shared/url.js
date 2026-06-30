const EDITOR_PARAM = "editor";
export function getEditorJSONFromURL() {
    const encodedEditor = getSearchParams().get(EDITOR_PARAM);
    if (!encodedEditor)
        return null;
    try {
        const parsed = JSON.parse(encodedEditor);
        return isReducedJSON(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
export function setEditorJSONInURL(json, mode = "replace") {
    const url = getCurrentURL();
    url.searchParams.set(EDITOR_PARAM, JSON.stringify(json));
    writeURL(url, mode);
}
export function clearEditorJSONFromURL(mode = "replace") {
    const url = getCurrentURL();
    url.searchParams.delete(EDITOR_PARAM);
    writeURL(url, mode);
}
function getSearchParams() {
    return getCurrentURL().searchParams;
}
function getCurrentURL() {
    return new URL(window.location.href);
}
function writeURL(url, mode) {
    if (mode === "push") {
        window.history.pushState(null, "", url);
        return;
    }
    window.history.replaceState(null, "", url);
}
function isReducedJSON(value) {
    return Array.isArray(value) && value.length > 0 && value.every(isReducedSyntaxNode);
}
function isReducedSyntaxNode(value) {
    if (!isRecord(value))
        return false;
    const content = value.cont;
    const comment = value.com;
    if (!isOptionalString(comment))
        return false;
    if (typeof content === "string")
        return true;
    if (!Array.isArray(content) || content.length === 0)
        return false;
    const category = value.cat;
    const syntaxFunction = value.fun;
    return (isNullableString(category)
        && isNullableString(syntaxFunction)
        && content.every(isReducedSyntaxNode));
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isOptionalString(value) {
    return value === undefined || value === null || typeof value === "string";
}
function isNullableString(value) {
    return value === null || typeof value === "string";
}
//# sourceMappingURL=url.js.map