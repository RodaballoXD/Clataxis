export function renderMarkdown(markdown) {
    const fragment = document.createDocumentFragment();
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    for (let index = 0; index < lines.length;) {
        const line = lines[index];
        if (!line.trim()) {
            index++;
            continue;
        }
        if (line.trimStart().startsWith('<!--')) {
            while (index < lines.length && !lines[index].includes('-->'))
                index++;
            index++;
            continue;
        }
        const headingMatch = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
        if (headingMatch) {
            const heading = document.createElement(`h${headingMatch[1].length}`);
            appendInlineMarkdown(headingMatch[2], heading);
            fragment.appendChild(heading);
            index++;
            continue;
        }
        if (/^\s*[-*+]\s+/.test(line)) {
            const list = document.createElement('ul');
            while (index < lines.length) {
                const itemMatch = /^\s*[-*+]\s+(.+)$/.exec(lines[index]);
                if (!itemMatch)
                    break;
                const item = document.createElement('li');
                appendInlineMarkdown(itemMatch[1], item);
                list.appendChild(item);
                index++;
            }
            fragment.appendChild(list);
            continue;
        }
        const paragraphLines = [];
        while (index < lines.length && lines[index].trim()) {
            if (paragraphLines.length && isBlockStart(lines[index]))
                break;
            paragraphLines.push(lines[index]);
            index++;
        }
        const paragraph = document.createElement('p');
        paragraphLines.forEach((paragraphLine, lineIndex) => {
            appendInlineMarkdown(paragraphLine.trimEnd(), paragraph);
            if (lineIndex < paragraphLines.length - 1) {
                if (/ {2,}$/.test(paragraphLine)) {
                    paragraph.appendChild(document.createElement('br'));
                }
                else {
                    paragraph.appendChild(document.createTextNode(' '));
                }
            }
        });
        fragment.appendChild(paragraph);
    }
    const title = fragment.querySelector('h1');
    if (title)
        title.id = 'about-page-title';
    return fragment;
}
function isBlockStart(line) {
    return /^(#{1,6})\s+/.test(line)
        || /^\s*[-*+]\s+/.test(line)
        || line.trimStart().startsWith('<!--');
}
function appendInlineMarkdown(source, parent) {
    for (let index = 0; index < source.length;) {
        const remaining = source.slice(index);
        const marker = remaining.startsWith('***') ? '***'
            : remaining.startsWith('**') ? '**'
                : remaining.startsWith('*') ? '*'
                    : remaining.startsWith('`') ? '`'
                        : '';
        if (marker) {
            const end = source.indexOf(marker, index + marker.length);
            if (end > index + marker.length) {
                const element = document.createElement(marker === '`' ? 'code' : marker === '*' ? 'em' : 'strong');
                if (marker === '***') {
                    const emphasis = document.createElement('em');
                    appendInlineMarkdown(source.slice(index + marker.length, end), emphasis);
                    element.appendChild(emphasis);
                }
                else if (marker === '`') {
                    element.textContent = source.slice(index + marker.length, end);
                }
                else {
                    appendInlineMarkdown(source.slice(index + marker.length, end), element);
                }
                parent.appendChild(element);
                index = end + marker.length;
                continue;
            }
        }
        if (source[index] === '[') {
            const labelEnd = source.indexOf('](', index + 1);
            const urlEnd = labelEnd >= 0 ? source.indexOf(')', labelEnd + 2) : -1;
            if (labelEnd >= 0 && urlEnd > labelEnd + 2) {
                const url = source.slice(labelEnd + 2, urlEnd);
                if (isSafeLink(url)) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    appendInlineMarkdown(source.slice(index + 1, labelEnd), link);
                    parent.appendChild(link);
                    index = urlEnd + 1;
                    continue;
                }
            }
        }
        const nextToken = findNextInlineToken(source, index + 1);
        parent.appendChild(document.createTextNode(source.slice(index, nextToken)));
        index = nextToken;
    }
}
function findNextInlineToken(source, start) {
    for (let index = start; index < source.length; index++) {
        if (source[index] === '*' || source[index] === '`' || source[index] === '[')
            return index;
    }
    return source.length;
}
function isSafeLink(url) {
    try {
        const parsedUrl = new URL(url, document.baseURI);
        return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'mailto:';
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=markdown.js.map