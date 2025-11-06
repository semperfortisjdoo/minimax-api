import { Router } from "express";
import { getOrganisations, getOrganisationById } from "../utils/minimaxClient.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const organisations = await getOrganisations();
    res.json({ organisations });
  } catch (error) {
    next(error);
  }
});

router.get("/:orgId", async (req, res, next) => {
  try {
    const organisation = await getOrganisationById(req.params.orgId);
    if (!organisation) {
      res.status(404).json({ message: "Organizacija nije pronađena." });
      return;
    }
    res.json({ organisation });
  } catch (error) {
    if (error.name === "OrganisationFetchError" || error.name === "OrganisationDetailsError") {
      res.status(502).json({
        message: "Neuspjelo dohvaćanje podataka o poslodavcu. Provjeri Minimax API postavke.",
        details: error.details ?? error.attempts ?? error.summary ?? undefined
      });
      return;
    }
    next(error);
  }
});

export default router;
