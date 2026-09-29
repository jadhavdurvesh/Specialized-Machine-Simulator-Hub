import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('simulator-connection.js', 'dist/simulator-connection.js');
const htmlPath = 'dist/index.html';
const html = await readFile(htmlPath, 'utf8');
const tag = '<script src="/simulator-connection.js"></script>';
const output = html.includes(tag) ? html : html.replace('</body>', `${tag}</body>`);
await writeFile(htmlPath, output, 'utf8');
