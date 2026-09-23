// Gera fotografias de exemplo para testar o site sem fotos reais.
// Uso: npm run demo-photos  ->  ./data/demo-fotos/carro-<n>/*.jpg, ./data/demo-fotos/gerais/*.jpg e logo.png
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.resolve("data/demo-fotos");
fs.rmSync(out, { recursive: true, force: true });

const cars = [
  { n: "28", driver: "David Karatas", team: "KRT Racing", body: "#9fb8a8", stripe: "#f2c230" },
  { n: "111", driver: "João Ferreira", team: "KROFtools Drift", body: "#1c1c1c", stripe: "#e0312b" },
  { n: "7", driver: "Ana Costa", team: "Destroyers Team", body: "#e9e4ec", stripe: "#d0409a" },
  { n: "42", driver: "Rui Martins", team: "T-Bone Motorsport", body: "#1d6b3a", stripe: "#0b0b0b" },
];

function scene({ n, body, stripe }, i) {
  const w = 3000, h = 2000;
  const x = 700 + ((i * 263) % 700);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb3cf"/><stop offset="1" stop-color="#d9e2e6"/></linearGradient>
    <radialGradient id="smoke" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="55%" fill="url(#sky)"/>
  <rect y="45%" width="100%" height="12%" fill="#5d7a3a"/>
  <rect y="55%" width="100%" height="45%" fill="#6b6b6b"/>
  <rect y="${1500 + (i % 3) * 40}" width="100%" height="14" fill="#fff" opacity="0.8"/>
  <ellipse cx="${x - 350}" cy="1180" rx="900" ry="520" fill="url(#smoke)"/>
  <g transform="translate(${x},900) rotate(${-6 + (i % 4) * 3})">
    <path d="M0 260 Q40 120 260 90 L520 40 Q700 20 900 90 L1300 150 Q1420 180 1440 300 L1440 380 L0 380 Z" fill="${body}"/>
    <path d="M300 100 L560 55 Q700 40 860 100 L900 200 L330 210 Z" fill="#1d2833" opacity="0.85"/>
    <rect x="80" y="250" width="1300" height="36" fill="${stripe}"/>
    <circle cx="330" cy="390" r="120" fill="#111"/><circle cx="330" cy="390" r="60" fill="#888"/>
    <circle cx="1150" cy="390" r="120" fill="#111"/><circle cx="1150" cy="390" r="60" fill="#888"/>
    <rect x="600" y="220" width="220" height="140" rx="16" fill="#fff"/>
    <text x="710" y="330" text-anchor="middle" font-family="Helvetica, Arial" font-size="120" font-weight="700" fill="#111">${n}</text>
  </g>
  <ellipse cx="${x - 100}" cy="1350" rx="500" ry="260" fill="url(#smoke)"/>
</svg>`;
}

let total = 0;
for (const car of cars) {
  const dir = path.join(out, `carro-${car.n}`);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= 5; i++) {
    await sharp(Buffer.from(scene(car, i + Number(car.n)))).jpeg({ quality: 88 }).toFile(path.join(dir, `DSC_${car.n}_${String(i).padStart(3, "0")}.jpg`));
    total++;
  }
}
const general = path.join(out, "gerais");
fs.mkdirSync(general, { recursive: true });
for (let i = 1; i <= 3; i++) {
  await sharp(Buffer.from(scene({ n: "?", body: "#555", stripe: "#999" }, i))).jpeg({ quality: 88 }).toFile(path.join(general, `DSC_GERAL_${i}.jpg`));
  total++;
}

// Logótipo de teste: branco, fundo transparente (como o do fotógrafo)
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520">
  <text x="600" y="150" text-anchor="middle" font-family="Helvetica, Arial" font-size="140" letter-spacing="30" fill="#fff">LUISCUNHA</text>
  <rect x="80" y="190" width="1040" height="10" fill="#fff"/>
  <text x="600" y="470" text-anchor="middle" font-family="Helvetica, Arial" font-size="260" font-weight="300" letter-spacing="20" fill="#fff">PHOTOS</text>
</svg>`)).png().toFile(path.join(out, "logo.png"));

fs.writeFileSync(path.join(out, "inscritos.txt"), cars.map((c) => `${c.n}; ${c.driver}; ${c.team}`).join("\n") + "\n");
console.log(`${total} fotografias + logo.png + inscritos.txt criados em ${out}`);
