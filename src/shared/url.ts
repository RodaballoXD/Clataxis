import type { ReducedJSON, ReducedSyntaxNode } from "../editor/tree.js";

const EDITOR_PARAM = "editor";
type URLWriteMode = "push" | "replace";

export function getEditorJSONFromURL(): ReducedJSON | null {
    const encodedEditor = getSearchParams().get(EDITOR_PARAM);
    if (!encodedEditor) return null;

    try {
        const parsed = JSON.parse(encodedEditor) as unknown;
        return isReducedJSON(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function setEditorJSONInURL(json: ReducedJSON, mode: URLWriteMode = "replace") {
    const url = getCurrentURL();
    url.searchParams.set(EDITOR_PARAM, JSON.stringify(json));
    writeURL(url, mode);
}

export function clearEditorJSONFromURL(mode: URLWriteMode = "replace") {
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
    if (mode === "push") {
        window.history.pushState(null, "", url);
        return;
    }
    window.history.replaceState(null, "", url);
}

function isReducedJSON(value: unknown): value is ReducedJSON {
    return Array.isArray(value) && value.length > 0 && value.every(isReducedSyntaxNode);
}

function isReducedSyntaxNode(value: unknown): value is ReducedSyntaxNode {
    if (!isRecord(value)) return false;

    const content = value.cont;
    const comment = value.com;
    if (!isOptionalString(comment)) return false;

    if (typeof content === "string") return true;
    if (!Array.isArray(content) || content.length === 0) return false;

    const category = value.cat;
    const syntaxFunction = value.fun;
    return (
        isNullableString(category)
        && isNullableString(syntaxFunction)
        && content.every(isReducedSyntaxNode)
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}
