import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const siteDirectory = resolve(projectRoot, 'build', 'site');
const contentTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.map', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.ttf', 'font/ttf'],
    ['.wasm', 'application/wasm'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2']
]);

const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    } catch {
        response.writeHead(400).end('Bad request');
        return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = resolve(siteDirectory, `.${requestedPath}`);
    const relativePath = relative(siteDirectory, filePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    readFile(filePath, (error, contents) => {
        if (error) {
            if (error.code === 'ENOENT' || error.code === 'EISDIR') {
                response.writeHead(404).end('Not found');
                return;
            }
            response.writeHead(500).end('Internal server error');
            return;
        }

        response.writeHead(200, {
            'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream',
            'Content-Length': contents.length
        });
        response.end(request.method === 'HEAD' ? undefined : contents);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Local site: http://127.0.0.1:${port}`);
});
