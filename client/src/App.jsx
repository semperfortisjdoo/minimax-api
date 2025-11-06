import { useEffect, useState } from "react";
import ContractForm from "./components/ContractForm.jsx";
import { fetchOrganisations, fetchOrganisationDetails, generateContract } from "./api.js";

function App() {
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
  const [selectedOrganisation, setSelectedOrganisation] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchOrganisations();
        if (mounted) {
          setOrganisations(data);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Neuspjelo dohvaćanje organizacija. Provjeri backend logove.");
        }
      } finally {
        if (mounted) {
          setLoadingOrgs(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleOrganisationChange = async (orgId) => {
    if (orgId && orgId === selectedOrganisationId) {
      return;
    }

    setSelectedOrganisationId(orgId);

    if (!orgId) {
      setSelectedOrganisation(null);
      return;
    }
    try {
      const details = await fetchOrganisationDetails(orgId);
      setSelectedOrganisation(details);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Neuspjelo dohvaćanje podataka o poslodavcu.");
    }
  };

  const handleGenerate = async (formValues) => {
    try {
      setError(null);
      await generateContract(formValues);
    } catch (err) {
      console.error(err);
      setError(err.message || "Generiranje ugovora nije uspjelo.");
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Generator ugovora o radu</h1>
        <p>
          Ispuni podatke zaposlenika i odaberi poslodavca iz Minimax sustava. Nakon što klikneš na
          "Generiraj ugovor", preuzet ćeš popunjen dokument (.docx).
        </p>
      </header>
      {error && <div className="alert">{error}</div>}
      {loadingOrgs ? (
        <div className="loading">Dohvaćam organizacije...</div>
      ) : (
        <ContractForm
          organisations={organisations}
          selectedOrganisationId={selectedOrganisationId}
          selectedOrganisation={selectedOrganisation}
          onOrganisationChange={handleOrganisationChange}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}

export default App;
