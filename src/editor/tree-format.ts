import type { ReducedJSON, ReducedSyntaxBox, ReducedSyntaxNode, VeryReducedWord } from "./tree.js";

export function reducedJSONToSyntaxRepr(reducedJSON: ReducedJSON, indent: number | null): { repr: string, shouldEncapsulate: boolean } {
    const repr = formatSequence(reducedJSON, 0);
    return { repr, shouldEncapsulate: reducedJSON.some(isBox) };

    function formatSequence(nodes: ReducedJSON, depth: number): string {
        if (nodes.length === 0) throw new Error('reducedJSONToSyntaxRepr: reducedJSON is empty');

        if (nodes.every(isWord)) {
            const words = nodes as VeryReducedWord[];
            if (words.every((word) => typeof word === 'string' || !word.com)) {
                return `"${words.map((word) => escape(typeof word === 'string' ? word : word.cont)).join(' ')}"`;
            }
            return words.map(formatWord).join(' ');
        }

        const padding = ' '.repeat((indent ?? 0) * depth);
        return nodes.map((node) => `${padding}${formatNode(node, depth)}`).join(indent === null ? '' : '\n');
    }

    function formatNode(node: ReducedSyntaxNode, depth: number): string {
        if (isWord(node)) return formatWord(node);

        const box = node as ReducedSyntaxBox;
        const spaceMaybe = (indent === null) ? '' : ' ';
        const comment = box.com ? `${spaceMaybe}[${escape(box.com)}]` : '';
        const prefix = `${analysis(box)}${comment}`;
        const contentsAreWords = box.cont.every(isWord);
        const content = formatSequence(box.cont, depth + 1);

        if (contentsAreWords) return `${prefix}${spaceMaybe}${content}`;

        const body = (indent === null)
            ? `(${content})`
            : `(\n${content}\n${' '.repeat(indent * depth)})`;
        return `${prefix}${spaceMaybe}${body}`;
    }

    function formatWord(word: VeryReducedWord): string {
        if (typeof word === 'string') return `"${escape(word)}"`;
        const spaceMaybe = (indent === null) ? '' : ' ';
        const comment = word.com ? `${spaceMaybe}[${escape(word.com)}]` : '';
        return `"${escape(word.cont)}"${comment}`;
    }

    function analysis(box: ReducedSyntaxBox): string {
        if (!box.fun && !box.cat) return '/';
        if (!box.fun) return `${escape(box.cat!)}/`;
        if (!box.cat) return `${escape(box.fun)}`;
        return `${escape(box.cat)}/${escape(box.fun)}`;
    }

    function isWord(node: ReducedSyntaxNode): node is VeryReducedWord {
        return typeof node === 'string' || typeof node.cont === 'string';
    }

    function isBox(node: ReducedSyntaxNode): node is ReducedSyntaxBox {
        return typeof node !== 'string' && Array.isArray(node.cont);
    }
}

export function syntaxReprToReducedJSON(syntaxRepr: string): ReducedJSON {
    let index = 0;

    const skipWhitespace = () => {
        while (/\s/.test(syntaxRepr[index] ?? '') && index < syntaxRepr.length) index++;
    };

    const readEscapedUntil = (terminator: string): string => {
        const opening = terminator === ']' ? '[' : terminator;
        if (syntaxRepr[index] !== opening) {
            throw new SyntaxError(`Expected '${opening}' at position ${index}`);
        }
        index++;
        let value = '';
        while (index < syntaxRepr.length) {
            const char = syntaxRepr[index++];
            if (char === '\\') {
                if (index >= syntaxRepr.length) throw new SyntaxError('Incomplete escape at end of input');
                value += syntaxRepr[index++];
            } else if (char === terminator) {
                return value;
            } else {
                value += char;
            }
        }
        throw new SyntaxError(`Unterminated '${terminator}' value`);
    };

    const parseLabel = (rawLabel: string): { cat: string | null, fun: string | null } => {
        let separator = -1;
        for (let labelIndex = 0; labelIndex < rawLabel.length; labelIndex++) {
            if (rawLabel[labelIndex] === '\\') {
                labelIndex++;
            } else if (rawLabel[labelIndex] === '/') {
                separator = labelIndex;
                break;
            }
        }

        const decode = (value: string) => value.replace(/\\(.)/g, '$1');
        if (separator === -1) return { cat: null, fun: decode(rawLabel) };

        const cat = decode(rawLabel.slice(0, separator)) || null;
        const fun = decode(rawLabel.slice(separator + 1)) || null;
        return { cat, fun };
    };

    const parseSequence = (insideBox = false): ReducedJSON => {
        const nodes: ReducedJSON = [];
        while (true) {
            skipWhitespace();
            if (index >= syntaxRepr.length) {
                if (insideBox) throw new SyntaxError('Unclosed box');
                return nodes;
            }
            if (syntaxRepr[index] === ')') {
                if (!insideBox) throw new SyntaxError(`Unexpected ')' at position ${index}`);
                index++;
                if (nodes.length === 0) throw new SyntaxError('Box contents cannot be empty');
                return nodes;
            }

            const parsed = parseNode();
            if (Array.isArray(parsed)) nodes.push(...parsed);
            else nodes.push(parsed);
        }
    };

    const parseQuotedWords = (): ReducedSyntaxNode[] => {
        const phrase = readEscapedUntil('"');
        skipWhitespace();
        let comment: string | null = null;
        if (syntaxRepr[index] === '[') comment = readEscapedUntil(']');

        const words = phrase.trim() ? phrase.trim().split(/\s+/) : [''];
        if (comment !== null) {
            if (words.length !== 1) throw new SyntaxError('A commented word cannot contain spaces');
            return [{ cont: words[0], com: comment }];
        }
        return words;
    };

    const parseNode = (): ReducedSyntaxNode | ReducedSyntaxNode[] => {
        if (syntaxRepr[index] === '(') {
            index++;
            return parseSequence(true);
        }
        if (syntaxRepr[index] === '"') {
            const words = parseQuotedWords();
            return words.length === 1 ? words[0] : words;
        }

        const labelStart = index;
        while (index < syntaxRepr.length) {
            const char = syntaxRepr[index];
            if (char === '\\') {
                index += 2;
            } else if (char === '[' || char === '(' || char === '"') {
                break;
            } else if (char === ')') {
                throw new SyntaxError(`Unexpected ')' at position ${index}`);
            } else {
                index++;
            }
        }
        if (index >= syntaxRepr.length) throw new SyntaxError('Expected a box body');

        const { cat, fun } = parseLabel(syntaxRepr.slice(labelStart, index).trim());
        let comment: string | null | undefined;
        if (syntaxRepr[index] === '[') comment = readEscapedUntil(']');
        skipWhitespace();
        let cont: ReducedJSON;
        if (syntaxRepr[index] === '(') {
            index++;
            cont = parseSequence(true);
        } else if (syntaxRepr[index] === '"') {
            cont = parseQuotedWords();
        } else {
            throw new SyntaxError(`Expected '(' or a quoted terminal at position ${index}`);
        }
        const box: ReducedSyntaxBox = { cat, fun, cont };
        if (comment !== undefined) box.com = comment;
        return box;
    };

    return parseSequence();
}

function escape(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/\[/g, '\\[').replace(/\]/g, '\\]')
        .replace(/\(/g, '\\(').replace(/\)/g, '\\)')
        .replace(/\"/g, '\\"')
        .replace(/\//g, '\\/');
}
