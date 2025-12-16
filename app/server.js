import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.json({ message: "hello from devsecops-ci-cd-sprint-demo" });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.listen(port, () => console.log(`listening on ${port}`));
