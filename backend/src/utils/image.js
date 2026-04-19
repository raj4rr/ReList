import sharp from "sharp";
import fs from "fs/promises";

export async function addWatermark(filePath, watermarkText = "R4R") {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 900;
  const fontSize = Math.max(18, Math.floor(width * 0.04));
  const padding = Math.max(16, Math.floor(width * 0.02));

  const svg = `
  <svg width="${width}" height="${height}">
    <style>
      .wm {
        fill: rgba(255,255,255,0.85);
        font-size: ${fontSize}px;
        font-family: Arial, sans-serif;
        font-weight: 700;
      }
    </style>
    <text x="${width - padding}" y="${height - padding}" text-anchor="end" class="wm">${watermarkText}</text>
  </svg>`;

  const tempPath = `${filePath}.tmp`;
  await image.composite([{ input: Buffer.from(svg), gravity: "southeast" }]).toFile(tempPath);
  await fs.rename(tempPath, filePath);
}
