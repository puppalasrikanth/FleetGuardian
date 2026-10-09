export type Risk = "low" | "medium" | "high" | "critical";
export type AgentStatus = "active" | "idle" | "paused" | "quarantined";

export interface Agent {
  id: string;
  name: string;
  role: string;
  owner: string;
  team: string;
  model: string;
  harnessId?: string;
  status: AgentStatus;
  trustScore: number; // 0-100
  risk: Risk;
  tasksToday: number;
  violations24h: number;
  spendToday: number;
  spendLimit: number;
  tools: string[];
  dataScopes: string[];
  lastSeen: number; // epoch ms
  region: string;
}

export type PolicyCategory = "Tools" | "Spend" | "Data" | "Behavior" | "Network";
export type Enforcement = "block" | "warn" | "monitor";

export interface Policy {
  id: string;
  name: string;
  description: string;
  category: PolicyCategory;
  enforcement: Enforcement;
  enabled: boolean;
  scope: "all" | string[]; // agent ids
  triggers24h: number;
  updatedAt: number;
}

export type IncidentStatus = "open" | "acknowledged" | "resolved";

export interface Incident {
  id: string;
  time: number;
  agentId: string;
  policyId: string;
  severity: Risk;
  title: string;
  detail: string;
  status: IncidentStatus;
  actionTaken?: string;
}

export type ActivityKind = "tool_call" | "message" | "decision" | "violation" | "intervention";

export interface ActivityEvent {
  id: string;
  time: number;
  agentId: string;
  kind: ActivityKind;
  summary: string;
  target?: string;
}

export type VulnCategory =
  | "Prompt injection"
  | "Secrets"
  | "Unsafe tool execution"
  | "Dependency"
  | "Data exfiltration"
  | "Excessive permissions"
  | "Insecure deserialization"
  | "Insecure transport"
  | "Injection";

export type VulnStatus = "open" | "fixed" | "ignored";

export interface Vulnerability {
  id: string;
  ruleId: string;
  title: string;
  severity: Risk;
  category: VulnCategory;
  file: string;
  line: number;
  cwe: string;
  status: VulnStatus;
  foundAt: number;
  snippet: string;
  fix: string;
}

export type HarnessSource =
  | { kind: "github"; url: string; owner: string; repo: string; branch: string }
  | { kind: "upload"; label: string }
  | { kind: "local"; url: string; branch: string };

export type ScanStatus = "queued" | "scanning" | "ready" | "error";

export interface Harness {
  id: string;
  name: string;
  source: HarnessSource;
  repo: string; // display location
  language: string;
  framework: string;
  branch: string;
  status: ScanStatus;
  progress?: { done: number; total: number; phase: string };
  error?: string;
  fileCount: number;
  linesScanned: number;
  lastScan: number;
  securityScore: number; // 0-100
  vulns: Vulnerability[];
  scan?: {
    source: "semgrep";
    version: string;
    commit: string;
    branch: string;
    filesScanned: number;
    snapshotSha256: string;
    rulesSha256: string;
    scope: string;
  };
}
