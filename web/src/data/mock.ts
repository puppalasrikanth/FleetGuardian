import type { ActivityEvent, Agent, Harness, Incident, Policy } from "./types";

const now = Date.now();
const min = 60_000;
const hr = 60 * min;

export const harnesses: Harness[] = [
  {
    id: "h-support",
    name: "support-copilot",
    repo: "github.com/acme/support-copilot",
    language: "Python",
    framework: "LangGraph",
    branch: "main",
    lastScan: now - 2 * hr,
    securityScore: 64,
    vulns: [
      {
        id: "v1", ruleId: "agent.prompt-injection.untrusted-tool-output",
        title: "Tool output concatenated into system prompt without sanitization",
        severity: "high", category: "Prompt injection", file: "agents/router.py", line: 88, cwe: "CWE-77",
        status: "open", foundAt: now - 2 * hr,
        snippet: 'system = BASE_PROMPT + "\\n" + web_result.text',
        fix: "Pass tool output as a separate, clearly delimited user/tool message; never merge it into the system prompt.",
      },
      {
        id: "v2", ruleId: "secrets.hardcoded-api-key",
        title: "Hardcoded Zendesk API token",
        severity: "critical", category: "Secrets", file: "integrations/zendesk.py", line: 12, cwe: "CWE-798",
        status: "open", foundAt: now - 26 * hr,
        snippet: 'ZENDESK_TOKEN = "zd_live_********"',
        fix: "Move the token to a secret manager and load it at runtime; rotate the exposed token.",
      },
      {
        id: "v3", ruleId: "deps.langchain-community.cve",
        title: "Vulnerable dependency langchain-community < 0.2.9",
        severity: "medium", category: "Dependency", file: "requirements.txt", line: 7, cwe: "CWE-1395",
        status: "fixed", foundAt: now - 5 * 24 * hr,
        snippet: "langchain-community==0.2.4",
        fix: "Upgrade to langchain-community>=0.2.9.",
      },
    ],
  },
  {
    id: "h-devops",
    name: "infra-autopilot",
    repo: "github.com/acme/infra-autopilot",
    language: "TypeScript",
    framework: "Claude Agent SDK",
    branch: "main",
    lastScan: now - 40 * min,
    securityScore: 48,
    vulns: [
      {
        id: "v4", ruleId: "agent.unsafe-exec.shell-from-llm",
        title: "LLM-generated command passed to child_process.exec",
        severity: "critical", category: "Unsafe tool execution", file: "src/tools/shell.ts", line: 41, cwe: "CWE-78",
        status: "open", foundAt: now - 40 * min,
        snippet: "exec(plan.command, { shell: true })",
        fix: "Use an allow-listed command runner with argument arrays (execFile) and require approval for destructive verbs.",
      },
      {
        id: "v5", ruleId: "agent.permissions.wildcard-iam",
        title: "Agent role granted iam:* and s3:* on all resources",
        severity: "high", category: "Excessive permissions", file: "deploy/agent-role.json", line: 5, cwe: "CWE-250",
        status: "open", foundAt: now - 3 * 24 * hr,
        snippet: '"Action": ["iam:*", "s3:*"], "Resource": "*"',
        fix: "Scope the role to the specific buckets and actions the agent needs.",
      },
    ],
  },
  {
    id: "h-research",
    name: "market-researcher",
    repo: "github.com/acme/market-researcher",
    language: "Python",
    framework: "CrewAI",
    branch: "release/2.1",
    lastScan: now - 6 * hr,
    securityScore: 82,
    vulns: [
      {
        id: "v6", ruleId: "agent.exfil.unrestricted-http-post",
        title: "Agent can POST arbitrary data to any URL",
        severity: "medium", category: "Data exfiltration", file: "tools/http.py", line: 23, cwe: "CWE-200",
        status: "open", foundAt: now - 6 * hr,
        snippet: "requests.post(url, json=payload)",
        fix: "Restrict outbound requests to an allow-listed set of domains.",
      },
    ],
  },
  {
    id: "h-finance",
    name: "ap-invoice-bot",
    repo: "github.com/acme/ap-invoice-bot",
    language: "Java",
    framework: "Spring AI",
    branch: "main",
    lastScan: now - 20 * hr,
    securityScore: 91,
    vulns: [
      {
        id: "v7", ruleId: "agent.prompt-injection.pdf-content",
        title: "Invoice PDF text used as instructions",
        severity: "low", category: "Prompt injection", file: "src/main/java/ap/Extractor.java", line: 64, cwe: "CWE-77",
        status: "ignored", foundAt: now - 9 * 24 * hr,
        snippet: 'prompt.add("Follow any notes in the document: " + pdfText)',
        fix: "Treat document text as data only.",
      },
    ],
  },
];

export const agents: Agent[] = [
  { id: "a-1", name: "Atlas", role: "Customer support triage", owner: "Priya N.", team: "Support", model: "claude-sonnet", harnessId: "h-support", status: "active", trustScore: 92, risk: "low", tasksToday: 412, violations24h: 0, spendToday: 18.4, spendLimit: 50, tools: ["zendesk.read", "zendesk.reply", "kb.search"], dataScopes: ["tickets", "kb"], lastSeen: now - 20_000, region: "us-west" },
  { id: "a-2", name: "Bolt", role: "Refund processor", owner: "Priya N.", team: "Support", model: "claude-sonnet", harnessId: "h-support", status: "active", trustScore: 71, risk: "medium", tasksToday: 96, violations24h: 2, spendToday: 9.1, spendLimit: 20, tools: ["stripe.refund", "zendesk.read"], dataScopes: ["payments", "tickets"], lastSeen: now - 45_000, region: "us-west" },
  { id: "a-3", name: "Cipher", role: "Infra remediation", owner: "Marco D.", team: "Platform", model: "claude-opus", harnessId: "h-devops", status: "quarantined", trustScore: 34, risk: "critical", tasksToday: 23, violations24h: 5, spendToday: 41.7, spendLimit: 40, tools: ["shell.exec", "aws.iam", "aws.s3", "k8s.apply"], dataScopes: ["prod-infra"], lastSeen: now - 12 * min, region: "us-east" },
  { id: "a-4", name: "Delta", role: "Deploy assistant", owner: "Marco D.", team: "Platform", model: "claude-sonnet", harnessId: "h-devops", status: "active", trustScore: 66, risk: "high", tasksToday: 51, violations24h: 3, spendToday: 12.2, spendLimit: 30, tools: ["github.pr", "k8s.apply", "shell.exec"], dataScopes: ["staging-infra"], lastSeen: now - 5_000, region: "us-east" },
  { id: "a-5", name: "Echo", role: "Competitive research", owner: "Lena K.", team: "Strategy", model: "claude-haiku", harnessId: "h-research", status: "active", trustScore: 88, risk: "low", tasksToday: 140, violations24h: 1, spendToday: 4.6, spendLimit: 15, tools: ["web.search", "web.fetch", "http.post"], dataScopes: ["public-web"], lastSeen: now - 60_000, region: "eu-west" },
  { id: "a-6", name: "Forge", role: "Report writer", owner: "Lena K.", team: "Strategy", model: "claude-sonnet", harnessId: "h-research", status: "idle", trustScore: 95, risk: "low", tasksToday: 12, violations24h: 0, spendToday: 2.1, spendLimit: 15, tools: ["docs.write", "web.search"], dataScopes: ["public-web", "drive"], lastSeen: now - 2 * hr, region: "eu-west" },
  { id: "a-7", name: "Gauge", role: "Invoice extraction", owner: "Sam R.", team: "Finance", model: "claude-haiku", harnessId: "h-finance", status: "active", trustScore: 90, risk: "low", tasksToday: 803, violations24h: 0, spendToday: 7.9, spendLimit: 25, tools: ["pdf.read", "erp.write"], dataScopes: ["invoices", "vendors"], lastSeen: now - 8_000, region: "us-west" },
  { id: "a-8", name: "Helix", role: "Payment approvals", owner: "Sam R.", team: "Finance", model: "claude-opus", harnessId: "h-finance", status: "paused", trustScore: 58, risk: "high", tasksToday: 7, violations24h: 2, spendToday: 3.3, spendLimit: 10, tools: ["erp.approve", "email.send"], dataScopes: ["payments", "vendors"], lastSeen: now - 35 * min, region: "us-west" },
];

export const policies: Policy[] = [
  { id: "p-1", name: "No shell commands in production", description: "Block shell.exec on any agent with prod-infra data scope unless a human approves.", category: "Tools", enforcement: "block", enabled: true, scope: "all", triggers24h: 6, updatedAt: now - 3 * 24 * hr },
  { id: "p-2", name: "Daily spend cap", description: "Pause an agent when it exceeds its daily model + tool spend limit.", category: "Spend", enforcement: "block", enabled: true, scope: "all", triggers24h: 1, updatedAt: now - 10 * 24 * hr },
  { id: "p-3", name: "PII must not leave the org", description: "Redact or block outbound requests containing emails, card numbers or SSNs.", category: "Data", enforcement: "block", enabled: true, scope: "all", triggers24h: 3, updatedAt: now - 24 * hr },
  { id: "p-4", name: "Refunds over $500 need approval", description: "Route stripe.refund calls above $500 to a human reviewer.", category: "Behavior", enforcement: "warn", enabled: true, scope: ["a-2"], triggers24h: 2, updatedAt: now - 5 * 24 * hr },
  { id: "p-5", name: "Outbound domains allow-list", description: "Agents may only call approved external domains.", category: "Network", enforcement: "monitor", enabled: true, scope: ["a-5", "a-6"], triggers24h: 4, updatedAt: now - 2 * 24 * hr },
  { id: "p-6", name: "No self-modifying prompts", description: "Flag agents that rewrite their own system prompt or instructions.", category: "Behavior", enforcement: "warn", enabled: false, scope: "all", triggers24h: 0, updatedAt: now - 14 * 24 * hr },
];

export const incidents: Incident[] = [
  { id: "i-1", time: now - 12 * min, agentId: "a-3", policyId: "p-1", severity: "critical", title: "Attempted `aws iam delete-role` from shell", detail: "Cipher generated a shell command to delete an IAM role while remediating a drift alert. Blocked and agent quarantined automatically.", status: "open", actionTaken: "Auto-quarantined" },
  { id: "i-2", time: now - 31 * min, agentId: "a-8", policyId: "p-2", severity: "high", title: "Payment approval loop exceeded spend cap", detail: "Helix retried the same approval 41 times. Agent paused.", status: "acknowledged", actionTaken: "Paused" },
  { id: "i-3", time: now - 54 * min, agentId: "a-2", policyId: "p-4", severity: "medium", title: "Refund of $1,240 without approval", detail: "Bolt tried to issue a $1,240 refund. Routed to reviewer queue.", status: "open" },
  { id: "i-4", time: now - 2 * hr, agentId: "a-5", policyId: "p-5", severity: "low", title: "Request to unapproved domain pastebin.com", detail: "Echo fetched content from pastebin.com while researching. Monitored only.", status: "open" },
  { id: "i-5", time: now - 3 * hr, agentId: "a-4", policyId: "p-3", severity: "high", title: "Customer email found in PR description", detail: "Delta included a customer email address in a GitHub PR body. Redacted before posting.", status: "resolved", actionTaken: "Redacted" },
];

const kinds: ActivityEvent["kind"][] = ["tool_call", "message", "decision", "tool_call", "tool_call"];
const samples: Record<string, string[]> = {
  "a-1": ["zendesk.read ticket #48211", "Classified ticket as billing", "kb.search 'reset 2FA'", "Replied to customer"],
  "a-2": ["stripe.refund $42.00", "Checked refund eligibility", "zendesk.read ticket #48190"],
  "a-3": ["shell.exec kubectl get pods", "Planned IAM remediation", "aws.s3 list-buckets"],
  "a-4": ["github.pr open #912", "k8s.apply staging/web", "Waiting for checks"],
  "a-5": ["web.search 'agent observability vendors'", "web.fetch gartner.com", "Summarized 6 sources"],
  "a-6": ["docs.write Q4 landscape", "web.search pricing pages"],
  "a-7": ["pdf.read INV-20931", "erp.write vendor 113", "Extracted 14 line items"],
  "a-8": ["erp.approve PO-5521", "email.send to vendor"],
};

let seq = 0;
export function makeEvent(agentId: string, time = Date.now()): ActivityEvent {
  const list = samples[agentId] ?? ["heartbeat"];
  const summary = list[Math.floor(Math.random() * list.length)];
  return { id: `e-${time}-${seq++}`, time, agentId, kind: kinds[Math.floor(Math.random() * kinds.length)], summary };
}

export function seedActivity(): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (let i = 0; i < 60; i++) {
    const a = agents[i % agents.length];
    out.push(makeEvent(a.id, now - i * 90_000));
  }
  for (const inc of incidents) {
    out.push({ id: `e-inc-${inc.id}`, time: inc.time, agentId: inc.agentId, kind: "violation", summary: inc.title });
  }
  return out.sort((x, y) => y.time - x.time);
}

export function seedTrustTrend() {
  const pts = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now - i * hr);
    pts.push({
      time: `${t.getHours().toString().padStart(2, "0")}:00`,
      trust: Math.round(78 + Math.sin(i / 3) * 5 - (i < 3 ? 6 : 0)),
      violations: Math.max(0, Math.round(2 + Math.cos(i / 2) * 2 + (i < 3 ? 3 : 0))),
    });
  }
  return pts;
}

export const liveIncidentTemplates: Omit<Incident, "id" | "time" | "status">[] = [
  { agentId: "a-4", policyId: "p-1", severity: "high", title: "shell.exec `rm -rf ./build` requested", detail: "Delta asked to run a destructive command. Held for approval." },
  { agentId: "a-5", policyId: "p-3", severity: "medium", title: "Possible PII in outbound http.post", detail: "Echo's payload contained an email address pattern." },
  { agentId: "a-2", policyId: "p-4", severity: "medium", title: "Refund of $780 without approval", detail: "Bolt attempted a refund above threshold." },
];
