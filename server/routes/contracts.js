import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { getOrganisationById } from "../utils/minimaxClient.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, "../templates/Ugovor_template.docx");

function resolveTemplatePath() {
  const configuredPath = process.env.CONTRACT_TEMPLATE_PATH;
  if (!configuredPath) {
    return DEFAULT_TEMPLATE_PATH;
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(process.cwd(), configuredPath);
}

const TEMPLATE_PATH = resolveTemplatePath();

function sanitiseFilenamePart(value) {
  return value.replace(/[^a-z0-9\-]+/gi, "_").substring(0, 60) || "ugovor";
}

router.post("/generate", async (req, res, next) => {
  try {
    const {
      employerId,
      employeeName,
      employeeAddress,
      contractType,
      position,
      salary,
      currency,
      startDate,
      endDate,
      workingHours,
      probationPeriod,
      notes
    } = req.body ?? {};

    const missing = ["employerId", "employeeName", "contractType", "position", "salary", "startDate"].filter(
      field => !req.body?.[field]
    );

    if (missing.length) {
      res.status(400).json({ message: `Nedostaju obavezna polja: ${missing.join(", ")}` });
      return;
    }

    const organisation = await getOrganisationById(employerId);
    if (!organisation) {
      res.status(404).json({ message: "Odabrani poslodavac nije pronađen." });
      return;
    }

    let templateBinary;
    try {
      templateBinary = await fs.readFile(TEMPLATE_PATH, "binary");
    } catch (error) {
      if (error.code === "ENOENT") {
        const message =
          "Predložak ugovora nije pronađen. Postavite CONTRACT_TEMPLATE_PATH ili dodajte Ugovor_template.docx u server/templates.";
        res.status(500).json({
          message,
          details: { templatePath: TEMPLATE_PATH }
        });
        return;
      }

      throw error;
    }
    const employerAddress = {
      street: organisation.street ?? "",
      postalCode: organisation.postalCode ?? "",
      city: organisation.city ?? "",
      country: organisation.country ?? "",
      full: [organisation.street, organisation.postalCode, organisation.city, organisation.country]
        .filter(Boolean)
        .join(", ")
    };

    const templateData = {
      employer_name: organisation.name ?? "",
      employer_tax_number: organisation.taxNumber ?? "",
      employer_address: employerAddress.full,
      employer: {
        name: organisation.name ?? "",
        taxNumber: organisation.taxNumber ?? "",
        address: employerAddress
      },
      employee_name: employeeName,
      employee_address: employeeAddress ?? "",
      employee: {
        name: employeeName,
        address: employeeAddress ?? ""
      },
      contract_type: contractType,
      position,
      salary,
      currency: currency ?? "EUR",
      start_date: startDate,
      end_date: endDate ?? "",
      working_hours: workingHours ?? "Puno radno vrijeme",
      probation_period: probationPeriod ?? "",
      notes: notes ?? "",
      contract: {
        type: contractType,
        position,
        salary,
        currency: currency ?? "EUR",
        startDate,
        endDate: endDate ?? "",
        workingHours: workingHours ?? "Puno radno vrijeme",
        probationPeriod: probationPeriod ?? "",
        notes: notes ?? ""
      }
    };

    let generatedBuffer;
    try {
      generatedBuffer = renderTemplate(templateBinary, templateData);
    } catch (error) {
      res.status(500).json({
        message: "Dogodila se greška prilikom generiranja ugovora.",
        details: error.message
      });
      return;
    }
    const filename = `Ugovor_${sanitiseFilenamePart(employeeName)}`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}.docx`);
    res.send(generatedBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;

function renderTemplate(binary, variables) {
  const zip = new PizZip(binary);
  let doc;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => ""
    });
  } catch (error) {
    throw new Error(`Neispravan DOCX predložak: ${error.message}`);
  }

  doc.setData(variables);

  try {
    doc.render();
  } catch (error) {
    throw new Error(`Predložak se nije mogao obraditi: ${error.message}`);
  }

  return doc.getZip().generate({ type: "nodebuffer" });
}
