# FleetGuardian Web

The control room for FleetGuardian — the trust layer every AI agent fleet needs.

## Screens
- **Fleet overview** – trust score, active agents, open incidents, code vulnerabilities, spend, live activity
- **Agents** – registry with search/filters; per-agent detail with timeline, permissions, guardrails, pause/quarantine
- **Incidents** – violation queue with interventions: warn, pause, quarantine, approve, resolve
- **Policies & guardrails** – enable/disable rules, create new guardrails scoped to all or selected agents
- **Source code** – register agent harness repos (like agents) and triage agent-specific vulnerabilities

Data is realistic mock data with a live simulator (`src/data/mock.ts`, `src/data/store.tsx`), ready to be swapped for a real API.

## Run locally
```bash
cd web
npm install
npm run dev     # opens http://localhost:5173
```
