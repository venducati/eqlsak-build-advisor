'use strict';
const fs = require('node:fs/promises');
const {basename} = require('node:path');
const RECENT_BYTES = 4 * 1024 * 1024;
// Called only after the main process resolves a user-selected discovery ID.
async function readRecentLog(filePath) {
  const before = await fs.lstat(filePath);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('Choose a regular character log.');
  const file = await fs.open(filePath, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error('This is not a log file.');
    const start = Math.max(0, stat.size - RECENT_BYTES), buffer = Buffer.alloc(Math.min(stat.size, RECENT_BYTES));
    const {bytesRead} = await file.read(buffer, 0, buffer.length, start);
    let text = buffer.subarray(0, bytesRead).toString('utf8');
    if (start) text = text.slice(text.indexOf('\n') + 1 || text.length);
    const completeEnd = text.lastIndexOf('\n');
    const unfinished = completeEnd !== text.length - 1;
    text = text.slice(0, completeEnd + 1);
    return {name: basename(filePath), text, partial: start > 0 || unfinished || bytesRead < buffer.length, totalBytes: stat.size, bytesRead};
  } finally { await file.close(); }
}
module.exports = {readRecentLog, RECENT_BYTES};
