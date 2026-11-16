import { readFile, writeFile } from 'node:fs/promises';

const bundleUrl = new URL(
  '../node_modules/mind-ar/dist/mindar-image-three.prod.js',
  import.meta.url,
);
const original = await readFile(bundleUrl, 'utf8');

const replacements = [
  ['sRGBEncoding as Si', 'SRGBColorSpace as Si'],
  ['this.renderer.outputEncoding = Si', 'this.renderer.outputColorSpace = Si'],
];

let patched = original;
for (const [legacy, modern] of replacements) {
  if (patched.includes(legacy)) {
    patched = patched.replace(legacy, modern);
  } else if (!patched.includes(modern)) {
    throw new Error('The installed MindAR bundle has an unexpected color-space implementation.');
  }
}

if (patched !== original) {
  await writeFile(bundleUrl, patched);
}
