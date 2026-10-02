import { SyntaxTree } from "../editor/tree.js";
import { reducedJSONToSyntaxRepr, syntaxReprToReducedJSON } from "../editor/tree-format.js";
const EDITOR_PARAM = 'editor';
export function getEditorJSONFromURL() {
    const encodedEditor = getSearchParams().get(EDITOR_PARAM);
    if (!encodedEditor)
        return null;
    try {
        const parsed = syntaxReprToReducedJSON(encodedEditor);
        return new SyntaxTree(parsed).toReducedJSON();
    }
    catch {
        return null;
    }
}
export function setEditorJSONInURL(json, mode = 'replace') {
    const url = getCurrentURL();
    url.searchParams.set(EDITOR_PARAM, reducedJSONToSyntaxRepr(json, null).repr);
    writeURL(url, mode);
}
export function clearEditorJSONFromURL(mode = 'replace') {
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
    if (mode === 'push') {
        window.history.pushState(null, '', url);
        return;
    }
    window.history.replaceState(null, '', url);
}
//# sourceMappingURL=url.js.map