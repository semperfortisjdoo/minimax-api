# Predložak ugovora

Ova mapa nije verzionirana s binarnim `.docx` datotekama. Prije pokretanja aplikacije dodaj vlastitu Word šprancu za ugovor o radu i postavi varijable u obliku `{{placeholder}}` (npr. `{{employer_name}}`).

Zadana očekivana putanja je `server/templates/Ugovor_template.docx`. Možeš promijeniti lokaciju tako da u `.env` datoteku dodaš:

```
CONTRACT_TEMPLATE_PATH=put/do/tvog/Ugovor_template.docx
```

Ako datoteka ne postoji, backend će vratiti HTTP 500 s opisom problema.

## Dostupni placeholderi

Backend popunjava sljedeće placeholdere u predlošku:

### Ravninski (flat) placeholderi

| Placeholder | Opis |
| --- | --- |
| `{{employer_name}}` | Naziv poslodavca. |
| `{{employer_tax_number}}` | OIB poslodavca. |
| `{{employer_address}}` | Puna adresa poslodavca u jednoj liniji (`ulica, poštanski broj, grad`). |
| `{{employee_name}}` | Ime i prezime zaposlenika. |
| `{{employee_address}}` | Adresa zaposlenika. |
| `{{contract_type}}` | Vrsta ugovora (npr. na određeno). |
| `{{position}}` | Radno mjesto. |
| `{{salary}}` | Iznos bruto plaće. |
| `{{currency}}` | Valuta isplate (zadano `EUR`). |
| `{{start_date}}` | Datum početka rada. |
| `{{end_date}}` | Datum završetka ugovora (može biti prazan). |
| `{{working_hours}}` | Opis radnog vremena (zadano "Puno radno vrijeme"). |
| `{{probation_period}}` | Trajanje probnog rada (može biti prazno). |
| `{{notes}}` | Dodatne napomene (može biti prazno). |

### Ugniježđeni placeholderi

Osim ravninskih placeholdera, moguće je koristiti i ugniježđenu strukturu `{{employer.*}}`:

| Placeholder | Opis |
| --- | --- |
| `{{employer.name}}` | Naziv poslodavca. |
| `{{employer.taxNumber}}` | OIB poslodavca. |
| `{{employer.address.street}}` | Ulica i kućni broj poslodavca. |
| `{{employer.address.postalCode}}` | Poštanski broj poslodavca. |
| `{{employer.address.city}}` | Grad poslodavca. |
| `{{employer.address.country}}` | Država poslodavca. |

Svi nepostojeći ili prazni podaci zamjenjuju se praznim stringom, pa se u predlošku ne pojavljuju Docxtemplater greške (`MultiError`).
