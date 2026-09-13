'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const pattern = /^eqlog_([^_]+)_(.+)\.(txt|log)$/i;
const localPath = (value) =>
  typeof value === 'string' &&
  path.isAbsolute(value) &&
  !/^[/\\]{2}/.test(value) &&
  !value.includes('\0');
function commonLogFolders(env = process.env) {
  const publicRoot = env.PUBLIC || 'C:\\Users\\Public';
  const programRoots = [env.ProgramFiles, env['ProgramFiles(x86)']].filter(
    Boolean,
  );
  return [
    ...new Set([
      path.join(
        publicRoot,
        'Daybreak Game Company',
        'Installed Games',
        'EverQuest Legends',
        'Logs',
      ),
      ...programRoots.flatMap((root) => [
        path.join(
          root,
          'Daybreak Game Company',
          'Installed Games',
          'EverQuest Legends',
          'Logs',
        ),
        path.join(root, 'EverQuest Legends', 'Logs'),
      ]),
    ]),
  ];
}
/** Looks only in named folders. No drive crawl and no log contents are read. */
async function scanLogFolders(
  folders,
  { lastPath = '', sampleMs = 650, limit = 2000 } = {},
) {
  const candidates = [],
    checked = [],
    warnings = [];
  const seen = new Set();
  let truncated = false;
  for (const folder of [...new Set(folders.filter(localPath))].slice(0, 12)) {
    let directory;
    try {
      // Do not follow directory junctions or file symlinks during automatic search.
      const folderStat = await fs.lstat(folder);
      if (!folderStat.isDirectory() || folderStat.isSymbolicLink()) continue;
      const real = await fs.realpath(folder),
        normalized = real.toLowerCase();
      if (!localPath(real) || seen.has(normalized)) continue;
      seen.add(normalized);
      directory = await fs.opendir(real);
      checked.push(real);
      let entries = 0;
      for await (const entry of directory) {
        if (++entries > limit) {
          truncated = true;
          break;
        }
        const match = entry.name.match(pattern);
        if (!entry.isFile() || !match) continue;
        const filePath = path.join(real, entry.name);
        let stat;
        try {
          stat = await fs.lstat(filePath);
        } catch {
          continue;
        }
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        candidates.push({
          id: randomUUID(),
          name: entry.name,
          character: match[1],
          server: match[2],
          folder: real,
          path: filePath,
          size: stat.size,
          modified: stat.mtimeMs,
          growing: false,
          lastUsed: filePath.toLowerCase() === lastPath.toLowerCase(),
        });
      }
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code))
        warnings.push(
          'A log folder could not be checked. You can choose its log by hand.',
        );
    }
  }
  if (candidates.length && sampleMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, sampleMs));
    for (const row of candidates) {
      try {
        const stat = await fs.lstat(row.path);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          row.missing = true;
          continue;
        }
        row.growing = stat.size > row.size;
        row.size = stat.size;
        row.modified = stat.mtimeMs;
      } catch {
        row.missing = true;
      }
    }
  }
  const matches = candidates
    .filter((row) => !row.missing)
    .sort(
      (a, b) =>
        Number(b.growing) - Number(a.growing) ||
        b.modified - a.modified ||
        Number(b.lastUsed) - Number(a.lastUsed) ||
        a.path.localeCompare(b.path),
    );
  return {
    candidates: matches.slice(0, 100),
    checked,
    warnings: [...new Set(warnings)],
    truncated: truncated || matches.length > 100,
  };
}
class LogDiscovery {
  constructor(
    settingsFile,
    { defaultFolders = commonLogFolders(), sampleMs = 650 } = {},
  ) {
    this.settingsFile = settingsFile;
    this.defaultFolders = defaultFolders;
    this.sampleMs = sampleMs;
    this.issued = new Map();
    this.busy = false;
  }
  async settings() {
    try {
      const stat = await fs.stat(this.settingsFile);
      if (stat.size > 16384) return {};
      const saved = JSON.parse(await fs.readFile(this.settingsFile, 'utf8'));
      return {
        lastPath:
          localPath(saved.lastPath) &&
          pattern.test(path.basename(saved.lastPath))
            ? saved.lastPath
            : '',
        folder: localPath(saved.folder) ? saved.folder : '',
      };
    } catch {
      return {};
    }
  }
  async remember(filePath, folder) {
    const previous = await this.settings();
    const saved = {
      lastPath: filePath || previous.lastPath || '',
      folder: folder || previous.folder || '',
    };
    await fs.mkdir(path.dirname(this.settingsFile), { recursive: true });
    const temp = this.settingsFile + '.tmp';
    await fs.writeFile(temp, JSON.stringify(saved));
    await fs.rename(temp, this.settingsFile);
  }
  async find(folder = '') {
    if (this.busy) throw new Error('A log search is already running.');
    if (folder && !localPath(folder))
      throw new Error('Choose a folder on a local drive.');
    this.busy = true;
    try {
      const saved = await this.settings();
      const chosen = folder || saved.folder;
      const folders = [
        ...(chosen ? [chosen, path.join(chosen, 'Logs')] : []),
        ...(saved.lastPath ? [path.dirname(saved.lastPath)] : []),
        ...this.defaultFolders,
      ];
      const result = await scanLogFolders(folders, {
        lastPath: saved.lastPath || '',
        sampleMs: this.sampleMs,
      });
      this.issued = new Map(result.candidates.map((row) => [row.id, row.path]));
      if (folder) {
        try {
          await this.remember('', folder);
        } catch {
          result.warnings.push(
            'The chosen folder could not be saved for next time.',
          );
        }
      }
      return {
        ...result,
        candidates: result.candidates.map(({ path: filePath, ...row }) => row),
      };
    } finally {
      this.busy = false;
    }
  }
  async resolve(id) {
    if (typeof id !== 'string' || !this.issued.has(id))
      throw new Error('Search again and choose one of the logs found.');
    const filePath = this.issued.get(id),
      stat = await fs.lstat(filePath);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      !pattern.test(path.basename(filePath))
    )
      throw new Error('That log is no longer available. Search again.');
    return filePath;
  }
}
module.exports = { LogDiscovery, scanLogFolders, commonLogFolders };
