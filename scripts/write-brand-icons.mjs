import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inStar(nx, ny) {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const square = ax <= 0.42 && ay <= 0.42;
  const diamond = ax + ay <= 0.42 * Math.SQRT2;
  return square || diamond;
}

function paint(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const plate = [6, 78, 59, 255];
  const star = [250, 250, 249, 255];
  const seal = [180, 83, 9, 255];
  const radius = size * 0.125;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const inset = Math.min(px, py, size - px, size - py);
      const corner = inset < radius
        && (px < radius || px > size - radius)
        && (py < radius || py > size - radius);
      let inside = true;
      if (corner) {
        const cx = px < radius ? radius : size - radius;
        const cy = py < radius ? radius : size - radius;
        inside = (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
      }
      const i = (y * size + x) * 4;
      if (!inside) continue;
      const nx = (px - size / 2) / size;
      const ny = (py - size / 2) / size;
      const color = Math.hypot(nx, ny) <= 0.07 ? seal : inStar(nx, ny) ? star : plate;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = color[3];
    }
  }
  return png(size, size, rgba);
}

function ico(png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png32.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png32]);
}

const icon32 = paint(32);
const icon180 = paint(180);
const icon192 = paint(192);
const favicon = ico(icon32);

const targets = [
  ["src/app/icon.png", icon32],
  ["src/app/apple-icon.png", icon180],
  ["src/app/favicon.ico", favicon],
  ["public/icon.png", icon32],
  ["public/apple-icon.png", icon180],
  ["public/favicon.ico", favicon],
  ["public/icon-192.png", icon192],
  ["public/apple-touch-icon.png", icon180],
  ["public/favicon-32.png", icon32],
];

for (const [rel, bytes] of targets) {
  const dest = path.join(root, rel);
  fs.writeFileSync(dest, bytes);
  console.log(`${rel} ${bytes.length}`);
}
