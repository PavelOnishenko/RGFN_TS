import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployRoot = path.join(projectRoot, 'deploy');
const requiredEntries = ['dist', 'css', 'data', 'index.html', 'style.css'];

fs.rmSync(deployRoot, { recursive: true, force: true });
fs.mkdirSync(deployRoot, { recursive: true });

for (const entry of requiredEntries) {
    const source = path.join(projectRoot, entry);
    if (!fs.existsSync(source)) throw new Error(`Missing deployment entry: ${entry}`);
    fs.cpSync(source, path.join(deployRoot, entry), { recursive: true });
}

console.log(`RGFN deployment prepared at ${deployRoot}`);
