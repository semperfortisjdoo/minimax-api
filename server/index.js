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

// === NOVO: Dohvaćanje detalja o jednoj organizaciji ===
app.get("/api/orgs/:id", async (req, res) => {
  const orgId = req.params.id;

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://moj.minimax.hr/HR/API/api/orgs/${orgId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Greška kod dohvaćanja organizacije iz Minimax API-ja" });
    }

    const data = await response.json();
    res.json({
      id: data.ID,
      name: data.Name,
      taxNumber: data.TaxNumber,
      street: data.Address?.Street || "",
      postalCode: data.Address?.PostalCode || "",
      city: data.Address?.City || ""
    });
  } catch (error) {
    console.error("Greška kod /api/orgs/:id:", error);
    res.status(500).json({ error: "Interna greška servera" });
  }
});

