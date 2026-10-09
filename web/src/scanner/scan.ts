import type { Risk, Vulnerability } from "../data/types";
import { RULES, SCANNABLE, SPECIAL_FILES } from "./rules";

export interface SourceFile {
  path: string;
  content: string;
}

export const MAX_FILE_BYTES = 400_000;
export const MAX_FILES = 1500;

const SKIP_DIRS = /(^|\/)(node_modules|\.git|dist|build|out|target|vendor|\.venv|venv|__pycache__|\.next|coverage|\.idea|\.vscode)\//;

export function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export function extOf(path: string) {
  const b = baseName(path);
  const i = b.lastIndexOf(".");
  return i > 0 ? b.slice(i + 1).toLowerCase() : "";
}

/** Should this path be read and scanned? */
export function isScannable(path: string, size?: number) {
  if (SKIP_DIRS.test(path)) return false;
  if (size !== undefined && size > MAX_FILE_BYTES) return false;
  if (/\.min\.(js|css)$|\.d\.ts$|\.lock$|package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$/.test(path)) return false;
  const b = baseName(path);
  return SPECIAL_FILES.has(b) || b.startsWith(".env") || SCANNABLE.has(extOf(path));
}

function ruleApplies(files: string[], path: string) {
  if (!files.length) return true;
  const b = baseName(path);
  return files.includes(b) || files.includes(extOf(path));
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Mask anything that looks like a credential so we never display or store the secret itself. */
function maskSecrets(line: string) {
  return line
    .replace(/(sk-ant-|sk-proj-|sk-|AKIA|ghp_|gho_|ghs_|ghu_|ghr_|github_pat_|xox[abprs]-|AIza)([A-Za-z0-9_-]{4})[A-Za-z0-9_-]+/g, "$1$2••••••••")
    .replace(/((api[_-]?key|secret|access[_-]?token|auth[_-]?token|password|passwd)\b\s*[:=]\s*["'])([^"']{3})[^"']*(["'])/gi, "$1$3••••••••$4");
}

export function scanFiles(files: SourceFile[], now = Date.now()): { vulns: Vulnerability[]; lines: number } {
  const vulns: Vulnerability[] = [];
  let lines = 0;
  for (const f of files) {
    const rules = RULES.filter((r) => ruleApplies(r.files, f.path));
    if (!rules.length) continue;
    const ls = f.content.split(/\r?\n/);
    lines += ls.length;
    ls.forEach((text, idx) => {
      if (text.length > 2000) return; // minified / generated
      for (const r of rules) {
        if (!r.pattern.test(text)) continue;
        if (r.unless && r.unless.test(text)) continue;
        vulns.push({
          id: hash(`${r.id}|${f.path}|${idx + 1}`),
          ruleId: r.id,
          title: r.title,
          severity: r.severity,
          category: r.category,
          file: f.path,
          line: idx + 1,
          cwe: r.cwe,
          status: "open",
          foundAt: now,
          snippet: maskSecrets(text.trim()).slice(0, 240),
          fix: r.fix,
        });
      }
    });
  }
  return { vulns, lines };
}

const weight: Record<Risk, number> = { critical: 25, high: 12, medium: 5, low: 1 };

export function securityScore(vulns: Vulnerability[]) {
  const penalty = vulns.filter((v) => v.status === "open").reduce((s, v) => s + weight[v.severity], 0);
  return Math.max(0, Math.round(100 - Math.min(100, penalty)));
}

/** Keep triage decisions across rescans; findings that disappeared are marked fixed. */
export function mergeTriage(prev: Vulnerability[], next: Vulnerability[]): Vulnerability[] {
  const byId = new Map(prev.map((v) => [v.id, v]));
  const nextIds = new Set(next.map((v) => v.id));
  const merged: Vulnerability[] = next.map((v) => {
    const old = byId.get(v.id);
    return old ? { ...v, status: old.status === "ignored" ? "ignored" : "open", foundAt: old.foundAt } : v;
  });
  const gone: Vulnerability[] = prev.filter((v) => !nextIds.has(v.id) && v.status !== "ignored").map((v) => ({ ...v, status: "fixed" }));
  return [...merged, ...gone];
}

export function detectStack(files: SourceFile[]): { language: string; framework: string } {
  const counts: Record<string, number> = {};
  const langOf: Record<string, string> = { py: "Python", ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", java: "Java", kt: "Kotlin", go: "Go", rb: "Ruby", php: "PHP", cs: "C#" };
  for (const f of files) {
    const l = langOf[extOf(f.path)];
    if (l) counts[l] = (counts[l] ?? 0) + 1;
  }
  const language = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

  const all = files
    .filter((f) => ["package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle", "go.mod"].includes(baseName(f.path)))
    .map((f) => f.content)
    .join("\n")
    .toLowerCase();
  const fw: [RegExp, string][] = [
    [/@anthropic-ai\/claude-agent-sdk|claude-agent-sdk|claude_agent_sdk/, "Claude Agent SDK"],
    [/langgraph/, "LangGraph"],
    [/crewai/, "CrewAI"],
    [/autogen|pyautogen/, "AutoGen"],
    [/llama[-_]?index/, "LlamaIndex"],
    [/spring-ai|spring\.ai/, "Spring AI"],
    [/semantic[-_]kernel/, "Semantic Kernel"],
    [/@openai\/agents|openai-agents/, "OpenAI Agents SDK"],
    [/langchain/, "LangChain"],
    [/@anthropic-ai\/sdk|anthropic/, "Anthropic SDK"],
    [/openai/, "OpenAI SDK"],
  ];
  const framework = fw.find(([re]) => re.test(all))?.[1] ?? "Custom";
  return { language, framework };
}
