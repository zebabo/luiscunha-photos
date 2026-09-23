// Gera fotografias de exemplo para testar o site sem fotos reais.
// Uso: npm run demo-photos  ->  cria ./data/demo-fotos/*.jpg
// Os nomes incluem dorsais (ex.: _d123) que o upload reconhece automaticamente.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("data/demo-fotos");
fs.mkdirSync(out, { recursive: true });

const palette = [
  ["#1f3b4d", "#e07a5f"], ["#264653", "#e9c46a"], ["#3d405b", "#81b29a"], ["#2b2d42", "#ef233c"],
  ["#14213d", "#fca311"], ["#283618", "#dda15e"], ["#0b3954", "#bfd7ea"], ["#432818", "#ffe6a7"],
];

const count = Number(process.argv[2]) || 24;
for (let i = 1; i <= count; i++) {
  const [a, b] = palette[i % palette.length];
  const bibs = [100 + (i % 6), i % 4 === 0 ? 200 + i : null].filter(Boolean);
  const w = 3000, h = 2000;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${600 + ((i * 337) % 1800)}" cy="${700 + ((i * 211) % 700)}" r="${260 + (i % 5) * 60}" fill="#ffffff" fill-opacity="0.12"/>
    <text x="50%" y="46%" text-anchor="middle" font-family="Helvetica, Arial" font-size="220" font-weight="700" fill="#fff">Foto ${i}</text>
    <text x="50%" y="62%" text-anchor="middle" font-family="Helvetica, Arial" font-size="120" fill="#fff" fill-opacity="0.85">Dorsal ${bibs.join(" · ")}</text>
  </svg>`;
  const name = `IMG_${String(i).padStart(4, "0")}${bibs.map((b) => `_d${b}`).join("")}.jpg`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(path.join(out, name));
}
console.log(`${count} fotografias de exemplo criadas em ${out}`);
