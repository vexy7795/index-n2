// Crash-safe write for cache files: write to a sibling .tmp, then rename over
// the target. rename(2) is atomic on POSIX and NTFS — readers see the old file
// or the new one, never a half-written one. If the process dies mid-write,
// the .tmp is corrupt but the real file is preserved.
import { writeFileSync, renameSync, unlinkSync } from "node:fs";

export function atomicWriteFileSync(path, data) {
  const tmp = path + ".tmp";
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);
  } catch (e) {
    try { unlinkSync(tmp); } catch {}
    throw e;
  }
}
