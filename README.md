# EcoFerment — Kalkulator Eco Enzyme

Kalkulator bahan Eco Enzyme dengan rasio **3 : 1 : 10** (buah : gula merah : air), dibangun di atas **Bun** dengan **Tailwind CSS v4**. Sistem visual mengikuti design token "Organic Vitality" (Material Design 3).

## Prasyarat

Bun `>= 1.1`. Instalasi: <https://bun.sh>

## Menjalankan

```bash
bun install      # pasang dependency
bun run dev      # dev server + HMR (bundling HTML/CSS/JS otomatis)
bun run build    # bundel produksi ter-minify ke ./dist
bun run start    # sajikan hasil build (PORT opsional, default 3000)
```

## Struktur

```
src/
  index.html      markup + entrypoint bundler Bun
  styles.css      @theme Tailwind v4 (warna, tipografi, spacing, radius)
  calculator.js   logika: validasi input, error inline, animasi hasil
build.js          Bun.build + bun-plugin-tailwind
serve.js          Bun.serve statis dengan proteksi path traversal
bunfig.toml       registrasi plugin Tailwind untuk dev server
```

## Catatan teknis

- **Bundling:** Bun membaca `<link>`/`<script>` lokal di `index.html` lalu mem-bundel, hashing, dan me-minify aset secara otomatis.
- **Tailwind v4:** seluruh design token dideklarasikan sebagai CSS custom properties di blok `@theme`, jadi tidak ada `tailwind.config.js`.
- **Aksesibilitas:** label eksplisit, `aria-live` pada hasil, `role="alert"` pada pesan error, fokus keyboard terlihat, dan animasi hormati `prefers-reduced-motion`.
- **Keamanan:** `serve.js` menormalisasi path dan menolak akses di luar `./dist` (mitigasi directory traversal, sejalan dengan panduan OWASP Path Traversal).

## Referensi

- Bun HTML bundler & fullstack dev server — <https://bun.sh/docs/bundler/html>
- Tailwind CSS v4 theme variables — <https://tailwindcss.com/docs/theme>
- OWASP Path Traversal — <https://owasp.org/www-community/attacks/Path_Traversal>
