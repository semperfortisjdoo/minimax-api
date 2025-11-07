# Predložak ugovora

Repozitorij očekuje da je Word špranca (`Ugovor_template.docx`) dostupna u ovoj mapi. Ako želiš koristiti vlastitu verziju ili ju držati na drugoj lokaciji, postavi varijablu okruženja `CONTRACT_TEMPLATE_PATH`:

```
CONTRACT_TEMPLATE_PATH=put/do/tvog/Ugovor_template.docx
```

Placeholder varijable pišu se u obliku `{{placeholder}}` (npr. `{{employer_name}}`). Aplikacija puni sljedeće vrijednosti:

| Placeholder                     | Opis                                                                     |
|---------------------------------|--------------------------------------------------------------------------|
| `{{employer_name}}`             | Naziv poslodavca.                                                         |
| `{{employer_tax_number}}`       | OIB / porezni broj poslodavca.                                            |
| `{{employer_address}}`          | Spajanje ulice, poštanskog broja, grada i države poslodavca.             |
| `{{employer.name}}`             | Isto kao gore, dostupno u ugniježđenom objektu.                           |
| `{{employer.taxNumber}}`        | Porezni broj kroz ugniježđenu strukturu.                                  |
| `{{employer.address.street}}`   | Ulica i broj.                                                             |
| `{{employer.address.postalCode}}` | Poštanski broj.                                                         |
| `{{employer.address.city}}`     | Grad.                                                                     |
| `{{employer.address.country}}`  | Država.                                                                   |
| `{{employer.address.full}}`     | Ulica, poštanski broj, grad i država u jednoj liniji.                     |
| `{{employee_name}}`             | Ime i prezime zaposlenika.                                               |
| `{{employee_address}}`          | Adresa zaposlenika.                                                       |
| `{{employee.name}}`             | Ugniježđeno ime zaposlenika.                                             |
| `{{employee.address}}`          | Ugniježđena adresa zaposlenika.                                          |
| `{{contract_type}}`             | Vrsta ugovora.                                                            |
| `{{position}}`                  | Radno mjesto.                                                             |
| `{{salary}}`                    | Iznos plaće.                                                              |
| `{{currency}}`                  | Valuta (zadano EUR).                                                      |
| `{{start_date}}`                | Datum početka rada.                                                       |
| `{{end_date}}`                  | Datum završetka ako je popunjen.                                          |
| `{{working_hours}}`             | Radno vrijeme.                                                            |
| `{{probation_period}}`          | Probni rok.                                                               |
| `{{notes}}`                     | Dodatne napomene.                                                         |
| `{{contract.*}}`                | Iste vrijednosti dostupne su kroz objekt `contract` (npr. `{{contract.type}}`). |

Ako placeholder nije prisutan u podacima, u dokumentu će se pojaviti prazni string (zahvaljujući `nullGetter` postavci u Docxtemplateru).

Ako datoteka ne postoji, backend će vratiti HTTP 500 s opisom problema prilikom generiranja ugovora.
