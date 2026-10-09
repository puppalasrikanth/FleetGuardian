export type Risk = "low" | "medium" | "high" | "critical";
export type AgentStatus = "active" | "idle" | "paused" | "quarantined";

export interface Agent {
  id: string;
  name: string;
  role: string;
  owner: string;
  team: string;
  model: string;
  harnessId: string;
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
  | "Excessive permissions";

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

export interface Harness {
  id: string;
  name: string;
  repo: string;
  language: string;
  framework: string;
  branch: string;
  lastScan: number;
  securityScore: number; // 0-100
  vulns: Vulnerability[];
}
