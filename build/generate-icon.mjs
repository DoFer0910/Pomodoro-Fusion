// build/icon-source.svg から Windows 用 build/icon.ico を生成する。
// sharp で複数解像度の PNG を焼き、png-to-ico で 1 つの ICO に束ねる。
// 配布アイコンを作り直すとき: node build/generate-icon.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, 'icon-source.svg'));

// ICO に埋め込む解像度。Windows はサイズに応じて最適なものを選ぶ。
const sizes = [256, 128, 64, 48, 32, 16];

const pngBuffers = await Promise.all(
  sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
);

const ico = await pngToIco(pngBuffers);
writeFileSync(join(here, 'icon.ico'), ico);
console.log(`build/icon.ico を生成しました (${sizes.join(', ')}px)`);
