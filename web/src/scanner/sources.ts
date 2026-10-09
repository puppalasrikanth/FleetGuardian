import JSZip from "jszip";
import { MAX_FILES, isScannable, type SourceFile } from "./scan";

export type Progress = (done: number, total: number, phase: string) => void;

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

export function parseGitHubUrl(input: string): { owner: string; repo: string; branch?: string } | null {
  const s = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  // git@github.com:owner/repo
  let m = s.match(/^git@github\.com:([^/]+)\/([^/]+)$/);
  if (m) return { owner: m[1], repo: m[2] };
  // https://github.com/owner/repo[/tree/branch]
  m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/tree\/(.+))?$/);
  if (m) return { owner: m[1], repo: m[2], branch: m[3] };
  // owner/repo
  m = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

async function gh(path: string, token?: string, accept = "application/vnd.github+json") {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) throw new Error("Repository not found. Check the URL, or add a token if it is private.");
  if (res.status === 401) throw new Error("GitHub rejected the token. Check that it is valid and has read access to this repo.");
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
    throw new Error("GitHub API rate limit reached. Add a personal access token or try again later.");
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res;
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

export async function fetchGitHubRepo(
  url: string,
  opts: { branch?: string; token?: string; onProgress?: Progress },
): Promise<{ owner: string; repo: string; branch: string; files: SourceFile[]; skipped: number }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("That doesn't look like a GitHub repository URL (e.g. https://github.com/owner/repo).");
  const { owner, repo } = parsed;
  const token = opts.token?.trim() || undefined;
  opts.onProgress?.(0, 1, "Contacting GitHub");

  const meta = await (await gh(`/repos/${owner}/${repo}`, token)).json();
  const branch = opts.branch?.trim() || parsed.branch || meta.default_branch || "main";

  opts.onProgress?.(0, 1, "Listing files");
  const tree = await (await gh(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token)).json();
  const blobs: { path: string; size: number }[] = (tree.tree ?? []).filter(
    (t: { type: string; path: string; size?: number }) => t.type === "blob" && isScannable(t.path, t.size),
  );
  const picked = blobs.slice(0, MAX_FILES);
  const skipped = blobs.length - picked.length;

  const files: SourceFile[] = [];
  let done = 0;
  await pool(picked, 8, async (b) => {
    const path = b.path.split("/").map(encodeURIComponent).join("/");
    try {
      let text: string;
      if (token || meta.private) {
        const r = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, token, "application/vnd.github.raw");
        text = await r.text();
      } else {
        const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`);
        if (!r.ok) throw new Error(String(r.status));
        text = await r.text();
      }
      files.push({ path: b.path, content: text });
    } catch {
      /* unreadable file: skip */
    }
    done++;
    opts.onProgress?.(done, picked.length, "Downloading source");
  });

  return { owner, repo, branch, files, skipped };
}

/* ------------------------------------------------------------------ */
/* Uploads: .zip, a folder, or individual files                        */
/* ------------------------------------------------------------------ */

function stripCommonRoot(files: SourceFile[]) {
  const first = files[0]?.path.split("/")[0];
  if (first && files.length > 1 && files.every((f) => f.path.startsWith(first + "/"))) {
    return files.map((f) => ({ ...f, path: f.path.slice(first.length + 1) }));
  }
  return files;
}

export async function readUploads(list: File[], onProgress?: Progress): Promise<{ files: SourceFile[]; skipped: number; label: string }> {
  const files: SourceFile[] = [];
  let skipped = 0;
  const zips = list.filter((f) => f.name.toLowerCase().endsWith(".zip"));
  const plain = list.filter((f) => !f.name.toLowerCase().endsWith(".zip"));

  for (const z of zips) {
    onProgress?.(0, 1, `Unzipping ${z.name}`);
    const zip = await JSZip.loadAsync(z);
    const entries = Object.values(zip.files).filter((e) => !e.dir && isScannable(e.name));
    let done = 0;
    for (const e of entries) {
      if (files.length >= MAX_FILES) { skipped++; continue; }
      const text = await e.async("string");
      if (text.length <= 400_000) files.push({ path: e.name, content: text });
      else skipped++;
      onProgress?.(++done, entries.length, "Reading files");
    }
  }

  let done = 0;
  for (const f of plain) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (!isScannable(path, f.size) || files.length >= MAX_FILES) { skipped++; continue; }
    files.push({ path, content: await f.text() });
    onProgress?.(++done, plain.length, "Reading files");
  }

  const label =
    zips.length === 1 && !plain.length
      ? zips[0].name
      : (plain[0] as File & { webkitRelativePath?: string })?.webkitRelativePath?.split("/")[0] || `${list.length} uploaded file${list.length === 1 ? "" : "s"}`;

  return { files: stripCommonRoot(files), skipped, label };
}

/** Collect files from a drag-and-drop, including dropped folders. */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = Array.from(dt.items ?? []);
  const entries = items.map((i) => (i as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
  if (!entries.length) return Array.from(dt.files);

  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      const rel = prefix + file.name;
      Object.defineProperty(file, "webkitRelativePath", { value: rel });
      out.push(file);
    } else if (entry.isDirectory) {
      if (SKIP.test(entry.name)) return;
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`);
      } while (batch.length);
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

const SKIP = /^(node_modules|\.git|dist|build|target|\.venv|venv|__pycache__|\.next)$/;
