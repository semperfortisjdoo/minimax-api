# Predložak ugovora

Ova mapa nije verzionirana s binarnim `.docx` datotekama. Prije pokretanja aplikacije dodaj vlastitu Word šprancu za ugovor o radu i postavi varijable u obliku `{{placeholder}}` (npr. `{{employer_name}}`).

Zadana očekivana putanja je `server/templates/Ugovor_template.docx`. Možeš promijeniti lokaciju tako da u `.env` datoteku dodaš:

```
CONTRACT_TEMPLATE_PATH=put/do/tvog/Ugovor_template.docx
```

Ako datoteka ne postoji, backend će vratiti HTTP 500 s opisom problema.
