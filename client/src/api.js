const API_BASE = "/api";

async function handleResponse(response) {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch (error) {
      // ignore
    }
    throw new Error(message);
  }
  return response;
}

export async function fetchOrganisations() {
  const response = await handleResponse(await fetch(`${API_BASE}/orgs`));
  const data = await response.json();
  return data.organisations ?? [];
}

export async function generateContract(payload) {
  const response = await handleResponse(
    await fetch(`${API_BASE}/contracts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Ugovor_${payload.employeeName || "zaposlenik"}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
