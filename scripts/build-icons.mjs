import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

const root = process.cwd();
const outputDir = join(root, "public", "icons");

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function makeIcon(size) {
  const bytesPerPixel = 4;
  const rows = [];
  const center = size / 2;
  const radius = size * 0.36;

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * bytesPerPixel);
    row[0] = 0;

    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const offset = 1 + x * bytesPerPixel;
      const inBubble = distance < radius;
      const inTail = x > center + radius * 0.15 && x < center + radius * 0.65 && y > center + radius * 0.25 && y < center + radius * 0.75 && y - center > x - center - radius * 0.12;
      const inDot = Math.abs(y - center) < size * 0.035 && [center - radius * 0.35, center, center + radius * 0.35].some((dotX) => Math.abs(x - dotX) < size * 0.035);

      if (inBubble || inTail) {
        row[offset] = 99;
        row[offset + 1] = 102;
        row[offset + 2] = 241;
        row[offset + 3] = 255;
      } else {
        row[offset] = 49;
        row[offset + 1] = 51;
        row[offset + 2] = 56;
        row[offset + 3] = 255;
      }

      if (inDot) {
        row[offset] = 255;
        row[offset + 1] = 255;
        row[offset + 2] = 255;
        row[offset + 3] = 255;
      }
    }

    rows.push(row);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(outputDir, { recursive: true });

for (const size of [192, 512]) {
  const filePath = join(outputDir, `icon-${size}.png`);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, makeIcon(size));
}
