import { mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('simulator-connection.js', 'dist/simulator-connection.js');
await cp('printer-extension.js', 'dist/printer-extension.js');
const htmlPath = 'dist/index.html';
const html = await readFile(htmlPath, 'utf8');
const connectionTag = '<script src="/simulator-connection.js"></script>';
const printerTag = '<script src="/printer-extension.js"></script>';
let output = html.includes(printerTag) ? html : html.replace('</body>', `${printerTag}</body>`);
output = output.includes(connectionTag) ? output : output.replace('</body>', `${connectionTag}</body>`);
await writeFile(htmlPath, output, 'utf8');
