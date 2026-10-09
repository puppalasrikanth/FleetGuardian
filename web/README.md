# FleetGuardian Web

The control room for FleetGuardian — the trust layer every AI agent fleet needs.

## Screens
- **Representation ASR (home)** – validated SchemaShift counts across frozen tool variants, canonical comparison, recorded kill-chain outcomes, and fixture/measured provenance
- **Runtime fleet simulation** – trust score, active agents, open incidents, code vulnerabilities, spend, live activity
- **Agents** – registry with search/filters; per-agent detail with timeline, permissions, guardrails, pause/quarantine
- **Incidents** – violation queue with interventions: warn, pause, quarantine, approve, resolve
- **Policies & guardrails** – enable/disable rules, create new guardrails scoped to all or selected agents
- **Harness source trust** – register agent harness repos (like agents) and triage agent-specific vulnerabilities

Fleet monitoring uses mock data with a live simulator (`src/data/mock.ts`, `src/data/store.tsx`). Source-code registration and rescanning call the real local Semgrep API described below. Seed source cards are explicitly labeled **Demo fixture**.

## Run locally
```bash
cd web
npm install
npm run dev     # opens http://localhost:5173
```

## Real source-code scans

Start the scanner from the companion SchemaShiftAuditor checkout in a second terminal:

```bash
cd ../SchemaShiftAuditor  # adjust to your checkout location
python -m pip install -r requirements-sponsors.txt
python -m security.source_api --repo ../FleetGuardian --repo .
```

Open **Source code → Register repository**, choose one of the configured checkouts, enter a name, then **Register & scan**. The branch is read from that checkout. **Rescan** runs Semgrep again; errors preserve the previous report. Add another local checkout with another `--repo` argument and restart the scanner. Origins must be HTTPS GitHub URLs; the scanner never clones or fetches repositories.

Vite proxies `/api/source-*` to `127.0.0.1:8765`. Use `http://localhost:5173`; if changing the frontend origin, pass the same `--frontend-origin` to the backend. This is a loopback-only development integration, not an authenticated production service. The production build requires its own authenticated backend/proxy deployment.

Seven bundled rules review Python and JavaScript/TypeScript for dynamic evaluation, shell execution, unsafe pickle loading, disabled TLS verification, and React raw HTML rendering. Findings are review candidates, not confirmed exploits. This does not scan dependencies, detect all secrets, or evaluate runtime prompt injection. No repository code is executed or sent to a model. Source snippets are omitted to avoid exposing embedded credentials.

Reports identify the base commit, source snapshot hash, rule hash, scanned file count, and Semgrep version. Local edits and nonignored source files are included. Limits: 2,000 files, 1 MB per file, 20 MB total, 90 seconds per scan. Incomplete scans fail rather than displaying a clean result. The score is a documented severity heuristic, not a security guarantee.

Results and triage are kept in React memory and reset on reload. Marking a finding fixed is unverified local triage; a rescan reopens any finding still detected. GitHub push webhooks, persistent reports, and automatic remediation are not implemented.

Validation: `npm run build`; backend tests: `RUN_SEMGREP_TESTS=1 python -m unittest discover -s tests -v` from SchemaShiftAuditor.

## Publish SchemaShift evidence

The home page leads with representation-sensitive committed ASR. Semgrep is a secondary source-trust module; runtime fleet activity remains a simulation, not a Pi integration. Bundled bars come from SchemaShift fixtures and make no measured-effect claim.

After the measurement owner completes matrix → grade → ClickHouse → freeze, run from SchemaShiftAuditor:

```bash
python export_fleet.py demo/golden --out ../FleetGuardian/web/public/schema-audit.json
```

Then click **Reload evidence**. For a deployed static build, republish the JSON or rebuild and redeploy. The report is validated/regraded by the exporter; missing or invalid reports produce an error, never a fixture fallback. Partial cohorts retain n/expected labels. Boundary-enabled cohorts are separate experiments and cannot be mixed with reference-executor cohorts. Normalize only reveals existing canonical trials; the kill-chain view is explanatory and never claims to lower ASR. Reports describe the fixed records-assistant task, not arbitrary registered source repositories.
