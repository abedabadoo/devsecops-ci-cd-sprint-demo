# Demo Findings — `vulnerable-demo` branch

This branch intentionally plants security findings to prove the CI pipeline on `main` actually catches things. **Nothing here is a real vulnerability or a real secret.** Each finding is commented in-source with a `// DEMO: …` marker.

This branch is **never merged**. It is kept red on purpose — a green run here would mean the pipeline missed something.

| # | Type | File | Line(s) | Scanner | Gate that fires | Expected CI step to fail |
|---|---|---|---|---|---|---|
| 1 | Vulnerable dependency (lodash prototype pollution + command injection CVEs) | `app/package.json` | dependency `lodash: 4.17.20` | `npm audit` | HIGH | "Dependency audit (High/Critical gate)" |
| 2 | Hardcoded AWS-style access key | `app/server.js` | ~10 | Gitleaks (default `aws-access-token` rule) | any finding | "Gitleaks (secrets scan)" |
| 3 | Reflected XSS sink (`res.send` of unescaped `req.query`) | `app/server.js` | ~23 | Semgrep `p/ci` | ERROR | "Semgrep (SAST) - SARIF output (ERROR gate)" |
| 4 | `eval()` of `req.query` (belt-and-suspenders) | `app/server.js` | ~31 | Semgrep `p/ci` (`eval-detected`) | ERROR | "Semgrep (SAST) - SARIF output (ERROR gate)" |

## Detail

### 1. Vulnerable dependency — `lodash@4.17.20`

Added to `app/package.json`. Trips at least five HIGH/CRITICAL advisories including:

- GHSA-35jh-r3h4-6jhm — Command Injection in lodash
- GHSA-xxjr-mmjv-4gpg — Prototype Pollution in `_.unset` / `_.omit`
- GHSA-f23m-r3pf-42rh — Prototype Pollution via array path bypass
- GHSA-r5fr-rjxr-66jc — Code Injection via `_.template`
- GHSA-29mw-wpgm-hmr9 — ReDoS

`npm audit --audit-level=high` exits non-zero, failing the **Dependency audit** step.

### 2. Hardcoded secret — fake AWS access key

```js
const AWS_SECRET_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE_DEMOPLANT";
```

The substring `AKIAIOSFODNN7EXAMPLE` matches Gitleaks's default `aws-access-token` rule (`AKIA[0-9A-Z]{16}`). The `_DEMOPLANT` suffix is appended so any human reviewer can tell at a glance this is staged, not real. `gitleaks detect` returns non-zero, failing the **Gitleaks** step.

### 3. Reflected XSS sink

```js
app.get("/echo", (req, res) => {
  res.send(`<div>${req.query.msg}</div>`);
});
```

User input from `req.query.msg` is interpolated directly into an HTML response with no escaping. Semgrep's `p/ci` ruleset flags this at ERROR severity (rules in the `javascript.express.security.audit.xss.*` family).

### 4. `eval()` of request data

```js
app.get("/run", (req, res) => {
  const result = eval(req.query.code);
  res.send(String(result));
});
```

Universally flagged by Semgrep `p/ci` (`javascript.lang.security.audit.eval-detected`) at ERROR severity. Kept as a backup so step 3 isn't the only thing exercising the SAST gate.

## Why not just fix it?

The fix is trivial — remove lodash, remove the key, sanitize the echo route, drop the eval. But the value of this branch is showing the pipeline catches each class of finding *before* a human notices. That only works if the branch stays broken.
