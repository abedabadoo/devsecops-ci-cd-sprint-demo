import express from "express";

const app = express();
const port = process.env.PORT || 3000;

// DEMO: planted secret — intentionally caught by Gitleaks
// This is NOT a real key. Value is shaped like an AWS access key
// (AKIA + 16 base32 chars) so Gitleaks's default aws-access-token rule
// fires. The "EXAMPLE_DEMOPLANT" suffix makes it obviously fake to humans.
const AWS_SECRET_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE_DEMOPLANT";  // fake but matches AWS key shape

app.get("/", (_req, res) => {
  res.json({ message: "hello from devsecops-ci-cd-sprint-demo" });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// DEMO: planted XSS sink — intentionally caught by Semgrep p/ci
// Reflects user input directly into an HTML response with no escaping.
// Semgrep's javascript.express.security.audit.xss.direct-response-write
// (and related rules in p/ci) flag this at ERROR severity.
app.get("/echo", (req, res) => {
  res.send(`<div>${req.query.msg}</div>`);
});

// DEMO: planted eval-of-request-data — universally caught by Semgrep p/ci
// (javascript.lang.security.audit.eval-detected and friends).
// Belt-and-suspenders in case the XSS rule above doesn't fire at ERROR.
app.get("/run", (req, res) => {
  const result = eval(req.query.code);
  res.send(String(result));
});

app.listen(port, () => console.log(`listening on ${port}`));
