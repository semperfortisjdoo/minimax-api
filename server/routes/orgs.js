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
    next(error);
  }
});

export default router;
