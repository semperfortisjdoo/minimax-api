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
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Minimax request failed (${path}): ${response.status} ${response.statusText} - ${text}`);
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

export async function fetchOrganisationDetails(orgId) {
  if (!orgId) {
    throw new Error("Organisation ID is required");
  }

  const data = await minimaxFetch(`/api/orgs/${orgId}`);
  const organisationRecord = Array.isArray(data?.Rows) && data.Rows.length > 0 ? data.Rows[0] : data;
  const organisation = normalizeOrganisation(organisationRecord);

  if (!organisation.id) {
    organisation.id = String(orgId);
  }

  return organisation;
}

export async function getOrganisationById(orgId) {
  if (!orgId) {
    return null;
  }

  try {
    const detailed = await fetchOrganisationDetails(orgId);
    if (detailed?.id) {
      return detailed;
    }
  } catch (error) {
    // Fallback to summary list only when the detail endpoint returns 404.
    if (!String(error?.message ?? "").includes("404")) {
      throw error;
    }
  }

  const organisations = await getOrganisations();
  return organisations.find(org => String(org.id) === String(orgId)) ?? null;
}

export { authenticate };
