# FleetGuardian Web

The control room for FleetGuardian — the trust layer every AI agent fleet needs.

## Screens
- **Fleet overview** – trust score, active agents, open incidents, code vulnerabilities, spend, live activity
- **Agents** – registry with search/filters; per-agent detail with timeline, permissions, guardrails, pause/quarantine
- **Incidents** – violation queue with interventions: warn, pause, quarantine, approve, resolve
- **Policies & guardrails** – enable/disable rules, create new guardrails scoped to all or selected agents
- **Source code** – register an agent's code from a GitHub repo (public, or private with a read-only token) or by uploading a .zip, a folder or files. It is scanned in the browser with agent-security rules (`src/scanner/rules.ts`): hardcoded LLM/cloud keys, shell/eval on model output, untrusted content in system prompts, unrestricted outbound POSTs, wildcard permissions and disabled approvals, unsafe deserialization, SQL string building, disabled TLS, unpinned deps. Results and triage are saved in the browser (localStorage); tokens are never saved.

Agents, incidents and policies are still sample data with a live simulator (`src/data/mock.ts`), ready to be swapped for a real API.

## Run locally
```bash
cd web
npm install
npm run dev     # opens http://localhost:5173
```
