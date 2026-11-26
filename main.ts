// ARUNIKA — Statistik Indonesia, entry program (Node 22, stdlib saja).
// Menyalin app/ dan screenshots/ dari samping berkas ini ke /output (atau
// $MAKEFUN_OUTPUT_DIR), lalu menulis /output/dossier.json dengan library
// make.fun yang divendor — dossier.json harus byte-for-byte sama dengan yang
// ditulis salinan library milik scorer, jadi vendor/makefun-frontend.ts
// jangan diubah.
//
// Jalankan lokal:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Sajikan situs:   node serve.ts  lalu buka http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Batas scorer (reference/gate.json): text_max_bytes membentuk byte dossier;
// sisanya menolak entry yang scorer akan tolak (lebih dari 4 screenshot atau
// satu di atas 256 KiB; lebih dari 993 berkas/direktori di app/ atau 16 MiB).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
console.log(`dossier written to ${join(out, 'dossier.json')}`);
