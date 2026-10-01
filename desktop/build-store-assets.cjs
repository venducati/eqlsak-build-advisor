'use strict';

const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { deflateSync } = require('node:zlib');

const assetRoot = join(__dirname, 'build', 'appx');
mkdirSync(assetRoot, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(kind, data) {
  const label = Buffer.from(kind, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, checksum]);
}
function writePng(file, width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const outputOffset = y * (width * 4 + 1);
    raw[outputOffset] = 0;
    pixels.copy(raw, outputOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(join(assetRoot, file), png);
}
function canvas(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
    pixels[offset] = color[0]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[2]; pixels[offset + 3] = color[3] ?? 255;
  };
  for (let y = 0; y < height; y += 1) {
    const shade = Math.round(14 + (y / Math.max(1, height - 1)) * 12);
    for (let x = 0; x < width; x += 1) set(x, y, [shade, shade + 7, shade + 12, 255]);
  }
  return { width, height, pixels, set };
}
function fillCircle(surface, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx; const dy = y - cy;
      if (dx * dx + dy * dy <= r2) surface.set(x, y, color);
    }
  }
}
function ring(surface, cx, cy, radius, thickness, color) {
  const outer = radius * radius;
  const inner = Math.max(0, radius - thickness) ** 2;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx; const dy = y - cy; const d2 = dx * dx + dy * dy;
      if (d2 <= outer && d2 >= inner) surface.set(x, y, color);
    }
  }
}
function fillTriangle(surface, a, b, c, color) {
  const minX = Math.floor(Math.min(a[0], b[0], c[0])); const maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
  const minY = Math.floor(Math.min(a[1], b[1], c[1])); const maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
  const area = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const whole = area(a, b, c);
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const point = [x + .5, y + .5];
    const u = area(point, b, c) / whole; const v = area(a, point, c) / whole; const w = area(a, b, point) / whole;
    if (u >= 0 && v >= 0 && w >= 0) surface.set(x, y, color);
  }
}
function line(surface, x1, y1, x2, y2, color, thickness = 1) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let index = 0; index <= steps; index += 1) {
    const x = x1 + ((x2 - x1) * index) / steps; const y = y1 + ((y2 - y1) * index) / steps;
    fillCircle(surface, x, y, thickness / 2, color);
  }
}
function compass(surface, cx, cy, size) {
  const gold = [222, 188, 111, 255]; const lightGold = [244, 226, 176, 255]; const teal = [52, 113, 118, 255];
  fillCircle(surface, cx, cy, size * .42, teal);
  ring(surface, cx, cy, size * .46, Math.max(1, size * .045), gold);
  ring(surface, cx, cy, size * .34, Math.max(1, size * .02), [149, 123, 65, 255]);
  fillTriangle(surface, [cx, cy - size * .35], [cx + size * .17, cy + size * .17], [cx, cy + size * .08], lightGold);
  fillTriangle(surface, [cx, cy - size * .35], [cx - size * .17, cy + size * .17], [cx, cy + size * .08], gold);
  fillTriangle(surface, [cx, cy + size * .32], [cx + size * .13, cy - size * .1], [cx, cy + size * .02], [105, 75, 39, 255]);
  fillTriangle(surface, [cx, cy + size * .32], [cx - size * .13, cy - size * .1], [cx, cy + size * .02], [171, 138, 72, 255]);
  line(surface, cx, cy + size * .17, cx, cy + size * .36, gold, Math.max(1, size * .03));
}
function storeLogo(file, width, height, wide = false) {
  const surface = canvas(width, height);
  if (wide) {
    compass(surface, Math.round(height * .55), Math.round(height * .5), Math.round(height * .78));
    const gold = [222, 188, 111, 255]; const muted = [119, 143, 145, 255];
    for (let row = 0; row < 3; row += 1) line(surface, height * 1.2, height * (.28 + row * .17), width * .86, height * (.28 + row * .17), row === 0 ? gold : muted, Math.max(2, height * .04));
  } else compass(surface, width / 2, height / 2, Math.min(width, height) * .9);
  writePng(file, width, height, surface.pixels);
}

storeLogo('StoreLogo.png', 50, 50);
storeLogo('Square44x44Logo.png', 44, 44);
storeLogo('Square150x150Logo.png', 150, 150);
storeLogo('Wide310x150Logo.png', 310, 150, true);
console.log('Created original Microsoft Store tile assets.');
