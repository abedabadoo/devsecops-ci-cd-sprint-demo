# devsecops-ci-cd-sprint-demo

A tiny Node/Express app wrapped in a gated DevSecOps CI pipeline — built to demonstrate that the scanners actually fail the build when something bad ships.

[![main](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/actions/workflows/ci.yml)
[![vulnerable-demo](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/actions/workflows/ci.yml/badge.svg?branch=vulnerable-demo)](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/actions/workflows/ci.yml?query=branch%3Avulnerable-demo)

## What this is

A 12-line Express "hello world" with a serious-business CI pipeline bolted on. The pipeline runs on every push to `main` and every pull request, and it is **gated** — findings at HIGH/CRITICAL (deps & images) or ERROR (SAST) fail the build. Findings are uploaded as SARIF to the GitHub Security tab so they show up in **Security → Code scanning alerts** rather than getting buried in logs.

The point of the repo is the pipeline, not the app. The `vulnerable-demo` branch exists so you can see the pipeline actually catch something — see [Demo: catch it failing](#demo-catch-it-failing) below.

## Pipeline stages

All stages run in a single job in `.github/workflows/ci.yml`. The pipeline is **gated** — any stage that fails fails the build.

| Stage | Tool | What it catches | Gate | Where the report lands |
|---|---|---|---|---|
| Build & test | `npm ci` + `npm test` | Broken builds, failing tests | non-zero exit | CI logs |
| Dependency audit | `npm audit --audit-level=high` | Known CVEs in npm deps | HIGH / CRITICAL | CI logs |
| Secrets scan | Gitleaks (`gitleaks detect`) | Committed secrets (AWS keys, tokens, etc.) | any finding | `gitleaks-report.json` artifact |
| SAST | Semgrep (`p/ci` ruleset) | Unsafe code patterns (XSS sinks, `eval`, injection, etc.) | ERROR severity | `semgrep.sarif` → GitHub Security tab, `semgrep-report.json` artifact |
| Filesystem vuln scan | Trivy (`scan-type: fs`) | Vulns in lockfiles, IaC, configs on disk | HIGH / CRITICAL | `trivy-fs-report.txt` artifact |
| Container image scan | Trivy (image scan, fixable only) | OS + library CVEs in the built Docker image | HIGH / CRITICAL (fixable) | `trivy-image-report.txt` artifact |
| SARIF upload | `github/codeql-action/upload-sarif` | — | — | GitHub **Security → Code scanning alerts** |

## Demo: catch it failing

The `vulnerable-demo` branch ([latest run](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/actions/workflows/ci.yml?query=branch%3Avulnerable-demo)) plants three intentional findings so you can watch each scanner fail the build:

1. **Vulnerable dependency** — `lodash@4.17.20` (known prototype-pollution CVE) added to `app/package.json`. Trips `npm audit --audit-level=high`.
2. **Hardcoded secret** — fake-but-shaped AWS access key (`AKIA…EXAMPLE_DEMOPLANT`) in `app/server.js`. Trips Gitleaks's default `aws-access-token` rule.
3. **Reflected XSS sink** — a `/echo` route that does `res.send('<div>${req.query.msg}</div>')`, plus a literal `eval(req.query.code)` for good measure. Trips Semgrep `p/ci` at ERROR severity.

Each is tagged in-source with a `// DEMO: planted …` comment so reviewers don't mistake the branch for a real incident. Full inventory in [`DEMO_FINDINGS.md`](https://github.com/abedabadoo/devsecops-ci-cd-sprint-demo/blob/vulnerable-demo/DEMO_FINDINGS.md) on the branch.

The branch is **kept red on purpose** — it's never merged. A green `vulnerable-demo` would mean the pipeline missed something.

## Security tab

The SARIF output from Semgrep is uploaded via `github/codeql-action/upload-sarif`, which routes findings into **GitHub Security → Code scanning alerts**. That gives you:

- Per-finding views with rule ID, severity, file, and line range
- Diff-aware alerts on PRs (new findings called out in the PR check)
- Dismissal workflow (false positive / won't fix / fixed) with audit trail
- One place to see SAST findings instead of digging through CI logs

Gitleaks and Trivy reports are uploaded as workflow artifacts (`security-reports`) on every run, pass or fail.

## Quickstart

```bash
# run the app locally
cd app && npm ci && npm test
npm start     # listens on :3000

# build the container image
docker build -t hello-devsecops .
```

## License

MIT — see [LICENSE](LICENSE).
