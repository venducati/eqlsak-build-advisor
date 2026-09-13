export type LogCandidate = {
  id: string;
  name: string;
  character: string;
  server: string;
  folder: string;
  size: number;
  modified: number;
  growing: boolean;
  lastUsed: boolean;
};
export type LogSearch = {
  candidates: LogCandidate[];
  checked: string[];
  warnings: string[];
  truncated: boolean;
};
export type LogFileHandle = {
  kind?: 'file';
  name?: string;
  getFile: () => Promise<File>;
};
export type LogDirectory = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<LogFileHandle | LogDirectory>;
  getDirectoryHandle: (name: string) => Promise<LogDirectory>;
};
export const logFilename = /^eqlog_([^_]+)_(.+)\.(?:txt|log)$/i;
export async function findBrowserLogs(folder: LogDirectory) {
  const candidates: LogCandidate[] = [],
    handles = new Map<string, LogFileHandle>();
  const folders = [folder];
  if (folder.name.toLowerCase() !== 'logs') {
    try {
      folders.push(await folder.getDirectoryHandle('Logs'));
    } catch {
      /* A Logs subfolder is optional. */
    }
  }
  let truncated = false;
  for (const directory of folders) {
    let count = 0;
    for await (const entry of directory.values()) {
      if (++count > 2000) {
        truncated = true;
        break;
      }
      if (entry.kind !== 'file') continue;
      const match = entry.name?.match(logFilename);
      if (!match) continue;
      try {
        const file = await entry.getFile(),
          id = crypto.randomUUID();
        candidates.push({
          id,
          name: file.name,
          character: match[1],
          server: match[2],
          folder: directory.name,
          size: file.size,
          modified: file.lastModified,
          growing: false,
          lastUsed: false,
        });
        handles.set(id, entry);
      } catch {
        /* Ignore a log removed during discovery. */
      }
    }
  }
  candidates.sort(
    (a, b) => b.modified - a.modified || a.name.localeCompare(b.name),
  );
  return {
    search: {
      candidates: candidates.slice(0, 100),
      checked: folders.map((f) => f.name),
      warnings: [],
      truncated: truncated || candidates.length > 100,
    },
    handles,
  };
}
