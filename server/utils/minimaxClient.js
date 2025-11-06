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

function normalizeOrganisation(row) {
  const organisation = row?.Organisation ?? {};
  const address = organisation?.Address ?? row?.OrganisationAddress ?? row?.Address ?? {};
  return {
    id: organisation.ID ?? row?.OrganisationID,
    name: organisation.Name ?? "Nepoznato",
    taxNumber:
      organisation.TaxNumber ??
      organisation.VatNumber ??
      organisation?.RegistrationNumber ??
      organisation.Oib ??
      null,
    street: address.Street ?? address.AddressLine1 ?? null,
    city: address.City ?? null,
    postalCode: address.PostalCode ?? address.Zip ?? null,
    country: address.Country ?? null
  };
}

export async function fetchOrganisationDetails(orgId) {
  if (!orgId) {
    return null;
  }

  let data;
  try {
    data = await minimaxFetch(`/api/orgs/${orgId}`);
  } catch (error) {
    if (error?.message?.includes(" 404 ")) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  if (data.Organisation || data.OrganisationAddress) {
    return normalizeOrganisation(data);
  }

  return normalizeOrganisation({ Organisation: data });
}

export async function getOrganisations() {
  const data = await minimaxFetch("/api/currentuser/orgs");
  const rows = Array.isArray(data?.Rows) ? data.Rows : [];
  return rows.map(normalizeOrganisation).filter(org => org.id);
}

export async function getOrganisationById(orgId) {
  if (!orgId) {
    return null;
  }

  return fetchOrganisationDetails(orgId);
}

export { authenticate };
