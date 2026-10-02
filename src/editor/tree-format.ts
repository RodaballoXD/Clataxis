import type { ReducedJSON, ReducedSyntaxBox, ReducedSyntaxNode, VeryReducedWord } from "./tree.js";

export function reducedJSONToSyntaxRepr(reducedJSON: ReducedJSON, indent: number | null): { repr: string, shouldEncapsulate: boolean } {
    if (reducedJSON.length === 0) throw new Error('reducedJSONToSyntaxRepr: reducedJSON is empty');

    if (reducedJSON.every((boxOrWord) => typeof boxOrWord === 'string')) {
        return { repr: `"${reducedJSON.map((word) => escape(word as string)).join(' ')}"`, shouldEncapsulate: false };
    }

    const spaceMaybe = (indent === null) ? '' : ' ';

    return { repr: reducedJSON.map((boxOrWord) => {

        const isBox = Object.keys(boxOrWord).includes('fun');
        if (isBox) {
            const box = boxOrWord as ReducedSyntaxBox;
            const content = reducedJSONToSyntaxRepr(box.cont, indent);
            let contentRepr = content.repr;
            if (content.shouldEncapsulate) {
                contentRepr = (indent === null)
                  ? `(${contentRepr})`
                  : `(${ ('\n' + contentRepr).replace(/\n/g, `\n${' '.repeat(indent)}`) }\n)`;
            }
            return `${analysis(box)}${spaceMaybe}${(box.com) ? `[${escape(box.com)}]${spaceMaybe}` : ''}(${contentRepr})`;
        }
        const word = boxOrWord as VeryReducedWord;
        if (typeof word === 'string') return `"${escape(word)}"`;
        if (!word.com) return `"${escape(word.cont)}"`;
        return `"${escape(word.cont)}"${spaceMaybe}[${escape(word.com)}]`;

        function analysis(box: ReducedSyntaxBox): string {
            if (!box.fun && !box.cat) return '/';
            if (!box.fun) return `${escape(box.cat!)}/`;
            if (!box.cat) return `${escape(box.fun)}`;
            return `${escape(box.cat)}/${escape(box.fun)}`;
        }

    }).join(indent === null ? '' : `\n${' '.repeat(indent)}`),
    shouldEncapsulate: (reducedJSON.length > 1 && !Object.keys(reducedJSON[0]).includes('fun')) };
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
