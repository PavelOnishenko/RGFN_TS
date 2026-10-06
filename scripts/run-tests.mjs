import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testFiles = [];

function collectTests(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) collectTests(entryPath);
        else if (entry.name.endsWith('.test.js')) testFiles.push(entryPath);
    }
}

collectTests(path.join(projectRoot, 'test'));
if (!testFiles.length) throw new Error('No RGFN test files found');

const result = spawnSync(process.execPath, ['--test', ...testFiles], { cwd: projectRoot, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
