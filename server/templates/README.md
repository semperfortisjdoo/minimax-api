# Predložak ugovora

Repozitorij očekuje da je Word špranca (`Ugovor_template.docx`) dostupna u ovoj mapi. Ako želiš koristiti vlastitu verziju ili ju držati na drugoj lokaciji, postavi varijablu okruženja `CONTRACT_TEMPLATE_PATH`:

```
CONTRACT_TEMPLATE_PATH=put/do/tvog/Ugovor_template.docx
```

Placeholder varijable pišu se u obliku `{{placeholder}}` (npr. `{{employer_name}}`). Ako datoteka ne postoji, backend će vratiti HTTP 500 s opisom problema prilikom generiranja ugovora.
