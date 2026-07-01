import { SyntaxTree } from "../editor/tree.js";
import type { ReducedJSON } from "../editor/tree.js";

const EDITOR_PARAM = 'editor';
type URLWriteMode = 'push' | 'replace';

export function getEditorJSONFromURL(): ReducedJSON | null {
    const encodedEditor = getSearchParams().get(EDITOR_PARAM);
    if (!encodedEditor) return null;

    try {
        const parsed = JSON.parse(encodedEditor) as ReducedJSON;
        return new SyntaxTree(parsed).toReducedJSON();
    } catch {
        return null;
    }
}

export function setEditorJSONInURL(json: ReducedJSON, mode: URLWriteMode = 'replace') {
    const url = getCurrentURL();
    url.searchParams.set(EDITOR_PARAM, JSON.stringify(json));
    writeURL(url, mode);
}

export function clearEditorJSONFromURL(mode: URLWriteMode = 'replace') {
    const url = getCurrentURL();
    url.searchParams.delete(EDITOR_PARAM);
    writeURL(url, mode);
}

function getSearchParams(): URLSearchParams {
    return getCurrentURL().searchParams;
}

function getCurrentURL(): URL {
    return new URL(window.location.href);
}

function writeURL(url: URL, mode: URLWriteMode) {
    if (mode === 'push') {
        window.history.pushState(null, '', url);
        return;
    }
    window.history.replaceState(null, '', url);
}
