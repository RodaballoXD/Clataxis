import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteDirectory = resolve(projectRoot, 'build', 'site');

rmSync(siteDirectory, { recursive: true, force: true });
mkdirSync(siteDirectory, { recursive: true });

copyFileSync(resolve(projectRoot, 'src', 'index.html'), resolve(siteDirectory, 'index.html'));
copyFileSync(resolve(projectRoot, 'src', 'favicon.svg'), resolve(siteDirectory, 'favicon.svg'));
copyDirectory(resolve(projectRoot, 'src', 'styles'), resolve(siteDirectory, 'styles'));
copyDirectory(resolve(projectRoot, 'src', 'dist'), resolve(siteDirectory, 'dist'));
copyDirectory(resolve(projectRoot, 'node_modules', 'monaco-editor', 'min', 'vs'), resolve(siteDirectory, 'vs'));

console.log(`Static site assembled at ${siteDirectory}`);

function copyDirectory(source, destination) {
    mkdirSync(destination, { recursive: true });

    for (const entry of readdirSync(source, { withFileTypes: true })) {
        const sourcePath = join(source, entry.name);
        const destinationPath = join(destination, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(sourcePath, destinationPath);
        } else if (entry.isFile()) {
            copyFileSync(sourcePath, destinationPath);
        } else {
            throw new Error(`Unsupported file type in site assets: ${sourcePath}`);
        }
    }
}
