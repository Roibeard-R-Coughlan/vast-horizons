const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');

// Check the optimized MP4, then reuse the existing playback checks with fresh screenshots.
const video = fs.readFileSync(path.resolve(__dirname, '../../assets/video/trades-mix-hero.mp4'));
const atoms = [];
for (let offset = 0; offset < video.length;) {
  const size = video.readUInt32BE(offset);
  assert.ok(size >= 8);
  atoms.push(video.toString('ascii', offset + 4, offset + 8));
  offset += size;
}
assert.ok(atoms.indexOf('moov') >= 0 && atoms.indexOf('moov') < atoms.indexOf('mdat'));
assert.ok(video.length < 3000000);
console.log(`PASS: ${video.length} bytes; MP4 metadata precedes video data for fast startup`);

const file = path.resolve(__dirname, '../trades-mix-hero', process.argv[2] || 'verify.cjs');
const test = new Module(file);
test.filename = file;
test.paths = Module._nodeModulePaths(path.dirname(file));
const source = fs.readFileSync(file, 'utf8')
  .replaceAll('artifacts/trades-mix-hero/', 'artifacts/drill-mix-hero/')
  .replaceAll('artifacts/browser-check/trades-fixed-', 'artifacts/drill-mix-hero/mobile-');
test._compile(source, file);
