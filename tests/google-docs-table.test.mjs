import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createGoogleDocsTableClipboardData } from '../src/dist/editor/google-docs-table.js';
import { syntaxReprToReducedJSON } from '../src/dist/editor/tree-format.js';

const fixturesDirectory = path.resolve('examples/table/test');
const fixtureNames = (await readdir(fixturesDirectory)).sort();

for (const fixtureName of fixtureNames) {
    const title = fixtureName === '1'
        ? 'Google Docs table matches fixture 1 apart from its source/reference label mismatch'
        : `Google Docs table matches fixture ${fixtureName}`;

    test(title, async () => {
        const fixtureDirectory = path.join(fixturesDirectory, fixtureName);
        const [source, expectedHtml] = await Promise.all([
            readFile(path.join(fixtureDirectory, '.clalang'), 'utf8'),
            readFile(path.join(fixtureDirectory, '.html'), 'utf8')
        ]);
        const json = syntaxReprToReducedJSON(source);
        const actualHtml = createGoogleDocsTableClipboardData(json).html;
        const actualTable = readTable(actualHtml);
        const expectedTable = readTable(expectedHtml);

        if (fixtureName === '1') {
            assert.deepEqual(
                [expectedTable[2][0].text, expectedTable[2][1].text],
                ['N', 'Det'],
                'fixture 1 reference labels Mi as N and gato as Det'
            );
            expectedTable[2][0].text = 'Det';
            expectedTable[2][1].text = 'N';
        }

        assert.deepEqual(actualTable, expectedTable);
    });
}

function readTable(html) {
    const tableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
    assert.ok(tableMatch, 'expected HTML to contain a table');

    return [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) =>
        [...row.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map(([, attributes, content]) => ({
            text: decodeEntities(content.replace(/<[^>]*>/g, '')).trim(),
            colspan: Number(attributes.match(/\bcolspan="(\d+)"/i)?.[1] ?? 1),
            borders: ['left', 'right', 'top', 'bottom'].filter((edge) =>
                new RegExp(`border-${edge}:`).test(attributes)
            )
        }))
    );
}

function decodeEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, '\u00a0');
}
