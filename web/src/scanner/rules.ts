import type { Risk, VulnCategory } from "../data/types";

export interface Rule {
  id: string;
  title: string;
  severity: Risk;
  category: VulnCategory;
  cwe: string;
  /** File extensions (lowercase, without dot) or exact file names this rule applies to. Empty = all source files. */
  files: string[];
  pattern: RegExp;
  /** Optional: if the line also matches this, it is not a finding. */
  unless?: RegExp;
  fix: string;
}

const PY = ["py"];
const JS = ["js", "jsx", "ts", "tsx", "mjs", "cjs"];
const JAVA = ["java", "kt"];
const GO = ["go"];
const CODE = [...PY, ...JS, ...JAVA, ...GO, "rb", "php", "cs"];
const CONFIG = ["json", "yaml", "yml", "toml", "env", "ini", "cfg", "properties", "tf"];

export const RULES: Rule[] = [
  // ---------- Secrets ----------
  {
    id: "secrets.llm-provider-key",
    title: "Hardcoded LLM provider API key",
    severity: "critical", category: "Secrets", cwe: "CWE-798",
    files: [...CODE, ...CONFIG],
    pattern: /\b(sk-ant-[A-Za-z0-9_-]{20,}|sk-(proj-)?[A-Za-z0-9_-]{32,}|AIza[0-9A-Za-z_-]{35})\b/,
    fix: "Remove the key from source, rotate it immediately, and load it from a secret manager or environment variable at runtime.",
  },
  {
    id: "secrets.cloud-or-scm-token",
    title: "Hardcoded cloud / source-control credential",
    severity: "critical", category: "Secrets", cwe: "CWE-798",
    files: [...CODE, ...CONFIG],
    pattern: /\b(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)/,
    fix: "Revoke and rotate the credential, then reference it from a secret store. Never commit credentials an agent could read or leak.",
  },
  {
    id: "secrets.generic-assignment",
    title: "Possible hardcoded secret",
    severity: "high", category: "Secrets", cwe: "CWE-798",
    files: [...CODE, ...CONFIG],
    pattern: /\b(api[_-]?key|secret|access[_-]?token|auth[_-]?token|password|passwd)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i,
    unless: /(os\.environ|getenv|process\.env|System\.getenv|example|placeholder|changeme|your[_-]|<.*>|\$\{)/i,
    fix: "Load secrets from environment variables or a secret manager instead of string literals.",
  },

  // ---------- Unsafe tool execution ----------
  {
    id: "agent.exec.python-shell-true",
    title: "Shell command executed with shell=True",
    severity: "critical", category: "Unsafe tool execution", cwe: "CWE-78",
    files: PY,
    pattern: /subprocess\.(run|call|Popen|check_output|check_call)\([^)]*shell\s*=\s*True/,
    fix: "Pass an argument list with shell=False, allow-list the commands an agent may run, and require human approval for destructive ones.",
  },
  {
    id: "agent.exec.os-system",
    title: "os.system / os.popen used to run commands",
    severity: "high", category: "Unsafe tool execution", cwe: "CWE-78",
    files: PY,
    pattern: /\bos\.(system|popen)\s*\(/,
    fix: "Replace with subprocess.run([...], shell=False) behind an allow-list of permitted commands.",
  },
  {
    id: "agent.exec.python-eval",
    title: "Dynamic code evaluation (eval/exec)",
    severity: "critical", category: "Unsafe tool execution", cwe: "CWE-95",
    files: PY,
    pattern: /(^|[^.\w])(eval|exec)\s*\(/,
    unless: /^\s*#/,
    fix: "Never evaluate model-generated or user-supplied code in-process. Use a sandboxed interpreter with no network or filesystem access.",
  },
  {
    id: "agent.exec.js-eval",
    title: "Dynamic code evaluation (eval / new Function)",
    severity: "critical", category: "Unsafe tool execution", cwe: "CWE-95",
    files: JS,
    pattern: /(^|[^.\w])eval\s*\(|new\s+Function\s*\(/,
    unless: /^\s*\/\//,
    fix: "Never evaluate model-generated or user-supplied code in-process. Use a sandboxed runtime (e.g. isolated VM / container) with no secrets.",
  },
  {
    id: "agent.exec.node-child-process",
    title: "child_process exec runs a shell command",
    severity: "critical", category: "Unsafe tool execution", cwe: "CWE-78",
    files: JS,
    pattern: /(^|[^.\w])(exec|execSync)\s*\(|child_process["')]*\.(exec|execSync)\s*\(|\bspawn(Sync)?\([^)]*shell\s*:\s*true/,
    unless: /^\s*\/\/|^\s*import\b/,
    fix: "Use execFile/spawn with an argument array and shell:false, behind an allow-list. Gate destructive commands behind human approval.",
  },
  {
    id: "agent.exec.java-runtime",
    title: "Runtime.exec / ProcessBuilder runs OS commands",
    severity: "high", category: "Unsafe tool execution", cwe: "CWE-78",
    files: JAVA,
    pattern: /Runtime\.getRuntime\(\)\.exec\(|new\s+ProcessBuilder\(/,
    fix: "Restrict the commands the agent can run to a fixed allow-list and never pass model output directly as a command.",
  },
  {
    id: "agent.exec.go-exec-shell",
    title: "exec.Command invoking a shell",
    severity: "high", category: "Unsafe tool execution", cwe: "CWE-78",
    files: GO,
    pattern: /exec\.Command\(\s*"(sh|bash|zsh|cmd)"/,
    fix: "Call the target binary directly with fixed arguments instead of going through a shell.",
  },

  // ---------- Prompt injection ----------
  {
    id: "agent.prompt-injection.system-prompt-concat",
    title: "Untrusted content merged into the system prompt",
    severity: "high", category: "Prompt injection", cwe: "CWE-77",
    files: [...CODE],
    pattern: /system[_\s]?(prompt|message|instructions?)\w*\s*(\+?=|:)\s*.*(\+\s*\w|\{[^}]*(input|result|output|content|doc|page|html|text|query|message|response|tool)[^}]*\}|\$\{)/i,
    fix: "Keep the system prompt static. Pass tool output, documents and user text as separate, clearly delimited messages and treat them as data, not instructions.",
  },
  {
    id: "agent.prompt-injection.follow-document-instructions",
    title: "Prompt tells the model to follow instructions found in content",
    severity: "medium", category: "Prompt injection", cwe: "CWE-77",
    files: [...CODE, "md", "txt", "yaml", "yml", "json"],
    pattern: /(follow|obey|execute)\s+(any|all|the)?\s*(instructions?|notes|commands)\s+(in|from|found in|inside)\s+(the\s+)?(document|page|email|file|content|website|result)/i,
    fix: "Instruct the model to treat retrieved content strictly as data and to ignore instructions embedded in it.",
  },

  // ---------- Data exfiltration ----------
  {
    id: "agent.exfil.http-post-variable-url",
    title: "Outbound POST to a non-constant URL",
    severity: "medium", category: "Data exfiltration", cwe: "CWE-200",
    files: [...PY, ...JS],
    pattern: /(requests|httpx|axios)\.(post|put|patch)\(\s*[a-zA-Z_][\w.]*\s*[,)]|fetch\(\s*[a-zA-Z_][\w.]*\s*,\s*\{[^}]*method\s*:\s*["'](POST|PUT)/,
    fix: "Restrict agent network calls to an allow-list of approved domains and scrub PII/secrets from outbound payloads.",
  },

  // ---------- Excessive permissions ----------
  {
    id: "agent.permissions.wildcard-iam",
    title: "Wildcard cloud permissions",
    severity: "high", category: "Excessive permissions", cwe: "CWE-250",
    files: CONFIG,
    pattern: /"?Action"?\s*[:=]\s*\[?\s*"(\*|[a-z0-9]+:\*)"/i,
    fix: "Grant only the specific actions and resources the agent needs (least privilege).",
  },
  {
    id: "agent.permissions.skip-approval",
    title: "Human approval / permission checks disabled",
    severity: "high", category: "Excessive permissions", cwe: "CWE-862",
    files: [...CODE, ...CONFIG, "sh"],
    pattern: /(dangerously[-_]?skip[-_]?permissions|bypassPermissions|auto[_-]?approve\s*[:=]\s*(true|True)|human[_-]?in[_-]?the[_-]?loop\s*[:=]\s*(false|False)|require[_-]?approval\s*[:=]\s*(false|False))/,
    fix: "Keep a human approval step for high-impact tool calls (payments, deletes, deploys, external messages).",
  },

  // ---------- Deserialization / injection / transport ----------
  {
    id: "python.pickle-load",
    title: "Unsafe deserialization with pickle",
    severity: "high", category: "Insecure deserialization", cwe: "CWE-502",
    files: PY,
    pattern: /\bpickle\.(load|loads)\(|\bjoblib\.load\(/,
    fix: "Do not unpickle data an agent fetched or received. Use JSON or a safe format.",
  },
  {
    id: "python.yaml-unsafe-load",
    title: "yaml.load without SafeLoader",
    severity: "high", category: "Insecure deserialization", cwe: "CWE-502",
    files: PY,
    pattern: /\byaml\.load\(/,
    unless: /SafeLoader|safe_load/,
    fix: "Use yaml.safe_load().",
  },
  {
    id: "agent.injection.sql-fstring",
    title: "SQL built with string formatting",
    severity: "high", category: "Injection", cwe: "CWE-89",
    files: [...PY, ...JS, ...JAVA],
    pattern: /(execute|query|raw)\s*\(\s*(f["']|["'`][^"'`]*(SELECT|INSERT|UPDATE|DELETE)[^"'`]*["'`]\s*(\+|%|\.format))|(execute|query)\(\s*`[^`]*(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{/i,
    fix: "Use parameterized queries. Never let model output become part of a SQL string.",
  },
  {
    id: "transport.tls-verification-disabled",
    title: "TLS certificate verification disabled",
    severity: "medium", category: "Insecure transport", cwe: "CWE-295",
    files: [...PY, ...JS, ...GO],
    pattern: /verify\s*=\s*False|rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/,
    fix: "Keep TLS verification on; add your CA to the trust store instead of disabling checks.",
  },

  // ---------- Dependencies ----------
  {
    id: "deps.python-unpinned",
    title: "Unpinned Python dependency",
    severity: "low", category: "Dependency", cwe: "CWE-1357",
    files: ["requirements.txt", "requirements-dev.txt"],
    pattern: /^\s*[A-Za-z0-9_.\-\[\]]+\s*(>=|>|~=)?\s*[0-9.]*\s*$/,
    unless: /==|^\s*#|^\s*-|^\s*$/,
    fix: "Pin exact versions (==) and use a lock file so a compromised release can't slip into the agent.",
  },
];

/** Extensions we read at all. */
export const SCANNABLE = new Set([...CODE, ...CONFIG, "sh", "md", "txt"]);
export const SPECIAL_FILES = new Set(["requirements.txt", "requirements-dev.txt", "package.json", "pom.xml", "build.gradle", "go.mod", "pyproject.toml", "Dockerfile", ".env"]);
