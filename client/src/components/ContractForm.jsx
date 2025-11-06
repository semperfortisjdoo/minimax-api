import { useEffect, useMemo, useState } from "react";

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

  const organisationsById = useMemo(() => {
    const map = new Map();
    organisations.forEach((org) => {
      if (org?.id != null) {
        map.set(String(org.id), org);
      }
    });
    return map;
  }, [organisations]);

  useEffect(() => {
    const employerId = formData.employerId;
    if (!employerId) {
      setSelectedOrganisation(null);
      return;
    }

    const baseOrganisation = organisationsById.get(String(employerId));
    if (!baseOrganisation) {
      setSelectedOrganisation(null);
      return;
    }

    setSelectedOrganisation((prev) => {
      if (prev && prev.id === baseOrganisation.id) {
        return { ...prev, ...baseOrganisation };
      }
      return { ...baseOrganisation };
    });

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/orgs/${encodeURIComponent(baseOrganisation.id)}`);
        if (!response.ok) {
          throw new Error(`Neuspjelo dohvaćanje organizacije ${baseOrganisation.id}`);
        }
        const data = await response.json();
        const organisationDetails = data?.organisation ?? {};

        if (!cancelled) {
          setSelectedOrganisation({ ...baseOrganisation, ...organisationDetails });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSelectedOrganisation(baseOrganisation);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.employerId, organisationsById]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "employerId") {
      onOrganisationChange?.(value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formData.employerId) {
      alert("Odaberi poslodavca iz padajućeg izbornika.");
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
        >
          <option value="">-- Odaberi poslodavca --</option>
          {organisations.map((org) => (
            <option key={org.id} value={String(org.id)}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {selectedOrganisation && (
        <div className="employer-details">
          {selectedOrganisation.taxNumber && (
            <p>
              <strong>OIB:</strong> {selectedOrganisation.taxNumber}
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

      <button type="submit" className="primary">Generiraj ugovor</button>
    </form>
  );
}

export default ContractForm;
