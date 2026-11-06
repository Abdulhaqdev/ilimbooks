// Build'dan keyin assetlarni oldindan gzip qiladi (daraja 9).
// Nginx `gzip_static on` bilan tayyor .gz faylni beradi — protsessor sarflanmaydi
// va siqish darajasi jonli siqishdan (daraja 6) yaxshiroq bo'ladi.
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const EXT = /\.(js|css|html|svg|json|txt)$/i;
const MIN = 1024;

let files = 0;
let before = 0;
let after = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (EXT.test(name) && st.size >= MIN) {
      const gz = gzipSync(readFileSync(p), { level: 9 });
      if (gz.length < st.size) {
        writeFileSync(`${p}.gz`, gz);
        files += 1;
        before += st.size;
        after += gz.length;
      }
    }
  }
}

walk(DIST);
const pct = before ? Math.round(100 - (after * 100) / before) : 0;
console.log(`precompress: ${files} fayl, ${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K (${pct}%)`);
