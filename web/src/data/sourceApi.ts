import type { Harness } from "./types";

export interface SourceRepository { repo: string; branch: string }
type ScanReport = Pick<Harness, "vulns" | "securityScore" | "lastScan" | "scan">;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 110_000);
  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(data?.error || "Source scanner is unavailable. Start the local backend and retry.");
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Scan request timed out. Retry when the scanner is available.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export const sourceRepositories = () => request<{ repositories: SourceRepository[] }>("/api/source-repositories");
export const scanSource = (h: Pick<Harness, "repo" | "branch">) => request<ScanReport>("/api/source-scans", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: h.repo, branch: h.branch }),
});
