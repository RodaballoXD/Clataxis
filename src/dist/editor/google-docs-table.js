export function createGoogleDocsTableClipboardData(json) {
    const words = [];
    const boxes = [];
    collectNodes(json, 0, 0);
    if (words.length === 0) {
        throw new Error('Cannot export an analysis without words');
    }
    const maxDepth = boxes.reduce((maximum, box) => Math.max(maximum, box.depth), -1);
    const rows = [];
    const wordComments = words.map((word) => word.comment ?? '');
    if (wordComments.some(Boolean))
        rows.push(createCommentRow(wordComments));
    rows.push(words.map(({ text }) => createCell(text, 1, ['left', 'right', 'top', 'bottom'])));
    const boxBoundaries = new Set();
    for (const box of boxes) {
        boxBoundaries.add(box.startToken);
        boxBoundaries.add(box.endToken + 1);
    }
    for (let depth = maxDepth; depth >= 0; depth--) {
        const boxesAtDepth = boxes.filter((box) => box.depth === depth);
        const boxesByStart = new Map(boxesAtDepth.map((box) => [box.startToken, box]));
        const row = [];
        let token = 0;
        while (token < words.length) {
            const box = boxesByStart.get(token);
            if (box) {
                const colspan = box.endToken - box.startToken + 1;
                const borders = ['left', 'right', 'bottom'];
                if (!(box.depth > 0 && box.depth < maxDepth && box.terminal))
                    borders.push('top');
                row.push(createCell(box.label, colspan, borders));
                token += colspan;
            }
            else {
                const borders = [];
                if (boxBoundaries.has(token))
                    borders.push('left');
                if (boxBoundaries.has(token + 1))
                    borders.push('right');
                if (depth === maxDepth || depth === 0)
                    borders.push('top');
                row.push(createCell('', 1, borders));
                token++;
            }
        }
        rows.push(row);
    }
    return {
        html: createTableHtml(rows, words.length),
        text: rows.map((row) => rowToPlainText(row, words.length)).join('\n')
    };
    function collectNodes(nodes, depth, tokenStart) {
        let nextToken = tokenStart;
        for (const node of nodes) {
            if (isBox(node)) {
                const startToken = nextToken;
                nextToken = collectNodes(node.cont, depth + 1, nextToken);
                boxes.push({
                    startToken,
                    endToken: nextToken - 1,
                    depth,
                    label: getBoxLabel(node),
                    terminal: node.cont.every(isWord)
                });
            }
            else {
                words.push({
                    text: typeof node === 'string' ? node : node.cont,
                    comment: typeof node === 'string' ? null : node.com
                });
                nextToken++;
            }
        }
        return nextToken;
    }
}
function createCell(text, colspan, borders) {
    return { text, colspan, borders };
}
function createCommentRow(comments) {
    return comments.map((comment, index) => {
        const borders = ['bottom'];
        if (comment) {
            borders.push('left', 'right', 'top');
        }
        else {
            if (comments[index - 1])
                borders.push('left');
            if (comments[index + 1])
                borders.push('right');
        }
        return createCell(comment, 1, borders);
    });
}
function isBox(node) {
    return typeof node !== 'string' && Array.isArray(node.cont);
}
function isWord(node) {
    return typeof node === 'string' || typeof node.cont === 'string';
}
function getBoxLabel(box) {
    if (box.cat && box.fun)
        return `${box.cat}/${box.fun}`;
    return box.cat ?? box.fun ?? '/';
}
function createTableHtml(rows, columnCount) {
    const columnGroup = Array.from({ length: columnCount }, () => '<col>').join('');
    const tableRows = rows.map((row) => {
        const cells = row.map(({ text, colspan, borders }) => {
            const span = colspan > 1 ? ` colspan="${colspan}"` : '';
            const content = text
                ? `<p dir="ltr" style="line-height:1.2;text-align: center;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">${escapeHtml(text)}</span></p>`
                : '<br>';
            const borderStyles = borders
                .map((edge) => `border-${edge}:solid #000000 0.54545475pt`)
                .join(';');
            const style = [
                borderStyles,
                'vertical-align:top',
                'padding:5pt 5pt 5pt 5pt',
                'overflow:hidden',
                'overflow-wrap:break-word'
            ].filter(Boolean).join(';');
            return `<td${span} style="${style};">${content}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    return `<meta charset="utf-8"><table style="border:none;border-collapse:collapse;"><colgroup>${columnGroup}</colgroup><tbody>${tableRows}</tbody></table>`;
}
function rowToPlainText(row, columnCount) {
    const cells = Array.from({ length: columnCount }, () => '');
    let column = 0;
    for (const cell of row) {
        cells[column] = cell.text;
        column += cell.colspan;
    }
    return cells.join('\t');
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
//# sourceMappingURL=google-docs-table.js.map