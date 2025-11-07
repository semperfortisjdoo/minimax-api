import { useMemo, useRef, useState } from "react";

const CONTRACT_TYPES = [
  "Ugovor na neodređeno",
  "Ugovor na određeno",
  "Ugovor o djelu",
  "Studentski ugovor"
];

const DEFAULT_FORM = {
  employerId: "",
  employeeName: "",
  employeeAddress: "",
  contractType: CONTRACT_TYPES[0],
  position: "",
  salary: "",
  currency: "EUR",
  startDate: "",
  endDate: "",
  workingHours: "Puno radno vrijeme",
  probationPeriod: "",
  notes: ""
};

function ContractForm({ organisations, onOrganisationChange, onGenerate }) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [organisationError, setOrganisationError] = useState(null);
  const [loadingOrganisation, setLoadingOrganisation] = useState(false);
  const activeRequestRef = useRef(0);

  const organisationsById = useMemo(() => {
    const map = new Map();
    organisations.forEach((org) => {
      if (org?.id != null) {
        map.set(String(org.id), org);
      }
    });
    return map;
  }, [organisations]);

  const handleEmployerChange = async (employerId) => {
    setFormData((prev) => ({ ...prev, employerId }));
    setOrganisationError(null);
    onOrganisationChange?.(employerId);

    if (!employerId) {
      activeRequestRef.current += 1;
      setSelectedOrganisation(null);
      setLoadingOrganisation(false);
      return;
    }

    const baseOrganisation = organisationsById.get(String(employerId));
    if (!baseOrganisation) {
      setSelectedOrganisation(null);
      setLoadingOrganisation(false);
      setOrganisationError(
        "Odabrana organizacija nije pronađena među dohvaćenim podacima. Pokušaj ponovno." 
      );
      return;
    }

    setSelectedOrganisation({ ...baseOrganisation });

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setLoadingOrganisation(true);

    try {
      const response = await fetch(`/api/orgs/${encodeURIComponent(baseOrganisation.id)}`);
      if (!response.ok) {
        let message = `Neuspjelo dohvaćanje podataka o poslodavcu (${baseOrganisation.name || baseOrganisation.id}).`;
        try {
          const payload = await response.json();
          if (payload?.message) {
            message = payload.message;
          }
          if (payload?.summary) {
            message = `${message} (${payload.summary})`;
          }
        } catch (parseError) {
          // ignore JSON parsing issues
        }
        throw new Error(message);
      }
      const data = await response.json();
      const organisationDetails = data?.organisation ?? {};
      if (activeRequestRef.current === requestId) {
        setSelectedOrganisation({ ...baseOrganisation, ...organisationDetails });
        setOrganisationError(null);
      }
    } catch (error) {
      console.error(error);
      if (activeRequestRef.current === requestId) {
        setSelectedOrganisation({ ...baseOrganisation });
        setOrganisationError(error.message || "Dohvat podataka o poslodavcu nije uspio.");
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoadingOrganisation(false);
      }
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "employerId") {
      handleEmployerChange(value);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.employerId) {
      alert("Odaberi poslodavca iz padajućeg izbornika.");
      return;
    }
    if (loadingOrganisation) {
      alert("Pričekaj da se učitaju podaci o poslodavcu prije generiranja ugovora.");
      return;
    }
    if (organisationError) {
      alert(organisationError);
      return;
    }
    if (!formData.employeeName) {
      alert("Unesi ime i prezime zaposlenika.");
      return;
    }
    if (!formData.salary) {
      alert("Unesi iznos plaće.");
      return;
    }
    if (!formData.startDate) {
      alert("Unesi datum početka rada.");
      return;
    }

    onGenerate({ ...formData });
  };

  return (
    <form className="contract-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="employerId">Poslodavac</label>
        <select
          id="employerId"
          name="employerId"
          value={formData.employerId}
          onChange={handleChange}
          required
          disabled={loadingOrganisation}
        >
          <option value="">-- Odaberi poslodavca --</option>
          {organisations.map((org) => (
            <option key={org.id} value={String(org.id)}>
              {org.name}
            </option>
          ))}
        </select>
        {loadingOrganisation && (
          <p className="helper-text">Učitavanje podataka o poslodavcu...</p>
        )}
      </div>

      {organisationError && (
        <div className="alert" role="alert">
          {organisationError}
        </div>
      )}

      {selectedOrganisation && (
        <div className="employer-details">
          {selectedOrganisation.name && (
            <p>
              <strong>Poslodavac:</strong> {selectedOrganisation.name}
            </p>
          )}
          {selectedOrganisation.taxNumber && (
            <p>
              <strong>OIB:</strong> {selectedOrganisation.taxNumber}
            </p>
          )}
          {Array.isArray(selectedOrganisation.detailWarnings) &&
            selectedOrganisation.detailWarnings.length > 0 && (
              <p className="helper-text warning">
                Nisu dohvaćeni svi detalji iz Minimax API-ja. Ugovor će koristiti dostupne podatke.
              </p>
            )}
          {(() => {
            const parts = [
              selectedOrganisation.street,
              selectedOrganisation.postalCode,
              selectedOrganisation.city,
              selectedOrganisation.country
            ].filter(Boolean);

            if (parts.length === 0) {
              return null;
            }

            return (
              <p>
                <strong>Adresa:</strong> {parts.join(", ")}
              </p>
            );
          })()}
        </div>
      )}

      <div className="grid">
        <div className="form-group">
          <label htmlFor="employeeName">Ime i prezime zaposlenika</label>
          <input
            id="employeeName"
            name="employeeName"
            type="text"
            value={formData.employeeName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="employeeAddress">Adresa zaposlenika</label>
          <input
            id="employeeAddress"
            name="employeeAddress"
            type="text"
            value={formData.employeeAddress}
            onChange={handleChange}
            placeholder="Ulica i broj, grad"
          />
        </div>
        <div className="form-group">
          <label htmlFor="position">Radno mjesto</label>
          <input
            id="position"
            name="position"
            type="text"
            value={formData.position}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contractType">Vrsta ugovora</label>
          <select
            id="contractType"
            name="contractType"
            value={formData.contractType}
            onChange={handleChange}
          >
            {CONTRACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="salary">Plaća</label>
          <input
            id="salary"
            name="salary"
            type="number"
            min="0"
            step="0.01"
            value={formData.salary}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="currency">Valuta</label>
          <input
            id="currency"
            name="currency"
            type="text"
            value={formData.currency}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="startDate">Datum početka</label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="endDate">Datum završetka (opcionalno)</label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="workingHours">Radno vrijeme</label>
          <input
            id="workingHours"
            name="workingHours"
            type="text"
            value={formData.workingHours}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="probationPeriod">Probni rok</label>
          <input
            id="probationPeriod"
            name="probationPeriod"
            type="text"
            value={formData.probationPeriod}
            onChange={handleChange}
            placeholder="npr. 3 mjeseca"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Napomene</label>
        <textarea
          id="notes"
          name="notes"
          rows="4"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        className="primary"
        disabled={loadingOrganisation || Boolean(organisationError)}
      >
        {loadingOrganisation ? "Pričekaj..." : "Generiraj ugovor"}
      </button>
    </form>
  );
}

export default ContractForm;
