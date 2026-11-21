// Gera os ícones PNG (192, 512 e 180 para iPhone) a partir dos SVG em public/.
import sharp from "sharp";
import { readFileSync } from "node:fs";
const alvos = [
  ["icone.svg", "icone-192.png", 192], ["icone.svg", "icone-512.png", 512],
  ["icone.svg", "apple-icon.png", 180], ["icone-mascara.svg", "icone-mascara-512.png", 512],
];
for (const [de, para, t] of alvos) {
  await sharp(readFileSync(`public/${de}`), { density: 384 }).resize(t, t).png().toFile(`public/${para}`);
  console.log(para);
}
