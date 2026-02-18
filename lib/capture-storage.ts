/**
 * Timestamped capture storage: write feed captures to local files,
 * keep only the last N files for historical context.
 */

import * as fs from "fs";
import * as path from "path";

const CAPTURES_DIR = path.join(process.cwd(), "data", "captures");
const MAX_FILES = 10;
const PREFIX = "capture-";
const SUFFIX = ".json";

function ensureDir() {
  if (!fs.existsSync(CAPTURES_DIR)) {
    fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  }
}

/** Timestamp for filename: YYYY-MM-DDTHH-mm-ss (sortable, filesystem-safe) */
function timestampForFilename(): string {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** List existing capture files (full paths), newest first */
function listCaptureFiles(): string[] {
  ensureDir();
  const names = fs.readdirSync(CAPTURES_DIR);
  const files = names
    .filter((n) => n.startsWith(PREFIX) && n.endsWith(SUFFIX))
    .map((n) => path.join(CAPTURES_DIR, n))
    .sort()
    .reverse();
  return files;
}

/**
 * Write posts to a new timestamped file and prune to keep only the last MAX_FILES.
 * Returns the path of the written file.
 */
export function writeCapture(posts: unknown[]): string {
  ensureDir();
  const name = `${PREFIX}${timestampForFilename()}${SUFFIX}`;
  const filePath = path.join(CAPTURES_DIR, name);
  fs.writeFileSync(filePath, JSON.stringify(posts, null, 2), "utf-8");

  const all = listCaptureFiles();
  for (let i = MAX_FILES; i < all.length; i++) {
    try {
      fs.unlinkSync(all[i]);
    } catch (_) {
      // ignore if already deleted or busy
    }
  }

  return filePath;
}

/**
 * Read the most recent capture file. Returns parsed posts array or null if none.
 */
export function getLatestCapture(): unknown[] | null {
  const files = listCaptureFiles();
  if (files.length === 0) return null;
  try {
    const raw = fs.readFileSync(files[0], "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

/**
 * List the last N capture filenames (with timestamps) for reference.
 * Newest first. Does not read file contents.
 */
export function listCaptures(limit = MAX_FILES): { filename: string; path: string }[] {
  const files = listCaptureFiles();
  return files.slice(0, limit).map((p) => ({ filename: path.basename(p), path: p }));
}
