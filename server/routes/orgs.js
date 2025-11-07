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
    if (error.name === "OrganisationFetchError") {
      res.status(error.statusCode ?? 502).json({
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        ...(error.summary ? { summary: error.summary } : {})
      });
      return;
    }
    next(error);
  }
});

export default router;
