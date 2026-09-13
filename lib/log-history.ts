import type {LogFileHandle} from './log-discovery.ts';
export const RECENT_BYTES = 4 * 1024 * 1024;
export type LogSnapshot = {name: string; text: string; partial: boolean; totalBytes: number; bytesRead: number};
export async function readRecentBrowserLog(handle: LogFileHandle): Promise<LogSnapshot> {
  const file = await handle.getFile(), start = Math.max(0, file.size - RECENT_BYTES);
  let text = await file.slice(start).text();
  if (start) text = text.slice(text.indexOf('\n') + 1 || text.length);
  const completeEnd = text.lastIndexOf('\n'), unfinished = completeEnd !== text.length - 1;
  text = text.slice(0, completeEnd + 1);
  return {name: file.name, text, partial: start > 0 || unfinished, totalBytes: file.size, bytesRead: file.size - start};
}
