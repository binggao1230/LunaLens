import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsPath = resolve(mobileRoot, 'assets');
const logo = await readFile(resolve(mobileRoot, 'public/lunalens-logo.svg'), 'utf8');

if (!logo.includes('fill="black"')) {
  throw new Error('Expected a black LunaLens mark in public/lunalens-logo.svg.');
}

await mkdir(assetsPath, { recursive: true });
await writeFile(resolve(assetsPath, 'logo.svg'), logo);
await writeFile(resolve(assetsPath, 'logo-dark.svg'), logo.replaceAll('fill="black"', 'fill="white"'));
