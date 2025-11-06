import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV_VARS = [
  "client_id",
  "client_secret",
  "username",
  "password",
  "MINIMAX_AUTH_URL",
  "MINIMAX_API_URL"
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined.`);
  }
  return value;
}

REQUIRED_ENV_VARS.forEach(getRequiredEnv);

let cachedToken = null;
let tokenExpiresAt = 0;

async function authenticate() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", getRequiredEnv("client_id"));
  params.append("client_secret", getRequiredEnv("client_secret"));
  params.append("username", getRequiredEnv("username"));
  params.append("password", getRequiredEnv("password"));

  const response = await fetch(getRequiredEnv("MINIMAX_AUTH_URL"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Authentication did not return an access_token.");
  }

  cachedToken = data.access_token;
  const expiresInSeconds = Number.parseInt(data.expires_in, 10);
  if (Number.isFinite(expiresInSeconds)) {
    tokenExpiresAt = Date.now() + (expiresInSeconds - 30) * 1000;
  } else {
    tokenExpiresAt = Date.now() + 5 * 60 * 1000;
  }

  return cachedToken;
}

async function minimaxFetch(path, options = {}) {
  const token = await authenticate();
  const response = await fetch(`${getRequiredEnv("MINIMAX_API_URL")}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(
      `Minimax request failed (${path}): ${response.status} ${response.statusText} - ${text}`
    );
    error.status = response.status;
    error.statusText = response.statusText;
    error.responseBody = text;
    error.path = path;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function normalizeOrganisation(record) {
  const organisation =
    record?.Organisation ??
    record?.organisation ??
    record?.OrganisationInfo ??
    record?.OrganisationData ??
    record?.Data?.Organisation ??
    record?.Data ??
    record?.data?.Organisation ??
    record?.data ??
    record ?? {};

  const address =
    organisation?.Address ??
    organisation?.RegisteredAddress ??
    organisation?.RegisteredOfficeAddress ??
    organisation?.BusinessAddress ??
    organisation?.HeadquartersAddress ??
    record?.OrganisationAddress ??
    record?.Address ??
    record?.Data?.Address ??
    {};

  const street =
    address.Street ??
    address.StreetAndNumber ??
    address.StreetName ??
    address.AddressLine1 ??
    address.Line1 ??
    address.Address ??
    address.Street1 ??
    address.Address1 ??
    null;

  const postalCode =
    address.PostalCode ??
    address.Zip ??
    address.PostCode ??
    address.PostNumber ??
    address.ZipCode ??
    null;

  const city =
    address.City ??
    address.Town ??
    address.CityName ??
    address.Place ??
    null;

  const country =
    address.Country ??
    address.CountryCode ??
    address.CountryName ??
    null;

  const rawId =
    organisation.ID ??
    record?.OrganisationID ??
    organisation?.OrganisationID ??
    record?.ID ??
    null;

  return {
    id: rawId == null ? null : String(rawId),
    name: organisation.Name ?? "Nepoznato",
    taxNumber:
      organisation.TaxNumber ??
      organisation.VatNumber ??
      organisation.RegistrationNumber ??
      organisation?.OIB ??
      organisation?.Oib ??
      organisation?.TaxID ??
      organisation?.TaxId ??
      organisation?.IdentificationNumber ??
      null,
    street,
    city,
    postalCode,
    country,
    fullAddress: [street, postalCode, city, country].filter(Boolean).join(", ")
  };
}

export async function getOrganisations() {
  const data = await minimaxFetch("/api/currentuser/orgs");
  const rows = Array.isArray(data?.Rows) ? data.Rows : [];
  return rows.map(normalizeOrganisation).filter(org => org.id);
}

function mergeOrganisationData(...sources) {
  const merged = {};

  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (key === "fullAddress") {
        continue;
      }

      merged[key] = value;
    }
  }

  const street = merged.street ?? "";
  const postalCode = merged.postalCode ?? "";
  const city = merged.city ?? "";
  const country = merged.country ?? "";

  const addressParts = [street, postalCode, city, country].filter(Boolean);
  merged.fullAddress = addressParts.join(", ");

  return merged;
}

const ORGANISATION_DETAIL_ENDPOINTS = [
  id => `/api/orgs/${id}`,
  id => `/api/orgs/${id}/organisation`,
  id => `/api/orgs/${id}/data`
];

function isUsefulOrganisation(organisation) {
  if (!organisation) {
    return false;
  }

  return Boolean(
    organisation.taxNumber ||
      organisation.street ||
      organisation.city ||
      organisation.postalCode ||
      organisation.country ||
      organisation.fullAddress
  );
}

async function tryFetchOrganisationDetails(orgId) {
  const errors = [];

  for (const buildPath of ORGANISATION_DETAIL_ENDPOINTS) {
    const path = buildPath(orgId);
    try {
      const data = await minimaxFetch(path);
      const candidateData =
        Array.isArray(data?.Rows) && data.Rows.length > 0 ? data.Rows[0] : data;
      const normalized = normalizeOrganisation(candidateData);

      if (!normalized.id && orgId != null) {
        normalized.id = String(orgId);
      }

      if (normalized.name === "Nepoznato" && candidateData?.Organisation?.Name) {
        normalized.name = candidateData.Organisation.Name;
      }

      if (isUsefulOrganisation(normalized)) {
        return { organisation: normalized, errors };
      }

      // Return even if we only have the basic structure so we can merge with the summary data.
      if (normalized.id) {
        return { organisation: normalized, errors };
      }
    } catch (error) {
      errors.push({ path, error });

      // If the API reports a client-side issue (4xx) we can continue trying.
      if (error.status && error.status >= 500) {
        break;
      }
    }
  }

  return { organisation: null, errors };
}

export async function fetchOrganisationDetails(orgId) {
  if (!orgId) {
    throw new Error("Organisation ID is required");
  }

  const { organisation, errors } = await tryFetchOrganisationDetails(orgId);

  if (!organisation) {
    const error = new Error(`Nije moguće dohvatiti detalje organizacije ${orgId}.`);
    error.name = "OrganisationDetailsError";
    error.attempts = errors.map(item => ({
      path: item.path,
      status: item.error?.status,
      message: item.error?.message
    }));
    throw error;
  }

  return organisation;
}

export async function getOrganisationById(orgId) {
  if (!orgId) {
    return null;
  }

  let detailed = null;
  let detailError = null;
  try {
    detailed = await fetchOrganisationDetails(orgId);
  } catch (error) {
    detailError = error;
  }

  let summary = null;
  let summaryError = null;
  try {
    const organisations = await getOrganisations();
    summary = organisations.find(org => String(org.id) === String(orgId)) ?? null;
  } catch (error) {
    summaryError = error;
  }

  if (!summary && !detailed) {
    const error = new Error(`Neuspjelo dohvaćanje podataka o poslodavcu (${orgId}).`);
    error.name = "OrganisationFetchError";
    if (detailError?.attempts) {
      error.details = detailError.attempts;
    }
    if (summaryError) {
      error.summary = summaryError.message;
    }
    throw error;
  }

  const merged = mergeOrganisationData(summary, detailed);

  if (!merged.id && orgId != null) {
    merged.id = String(orgId);
  }

  return merged;
}

export { authenticate };
