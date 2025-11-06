import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import orgRoutes from "./routes/orgs.js";
import contractRoutes from "./routes/contracts.js";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/orgs", orgRoutes);
app.use("/api/contracts", contractRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../client/dist");
const hasClientBuild = fs.existsSync(clientDistPath);

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Dogodila se neočekivana greška.",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

const port = Number.parseInt(process.env.PORT, 10) || 10000;
app.listen(port, () => {
  console.log(`🚀 Server pokrenut na portu ${port}`);
});
