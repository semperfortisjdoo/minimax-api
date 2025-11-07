# Generator ugovora o radu za Minimax

Full-stack aplikacija (Express + React) koja omogućuje odabir poslodavca iz Minimax API-ja, unos podataka o zaposleniku i automatsko generiranje .docx ugovora korištenjem Docxtemplatera.

## Struktura projekta

```
.
├── server/                # Express backend + integracija s Minimax API-jem
│   ├── index.js           # Ulazna točka servera
│   ├── routes/            # REST rute (organizacije, generiranje ugovora)
│   ├── templates/         # Lokacija za DOCX šprancu (zadano `Ugovor_template.docx`)
│   └── utils/             # klijentski helperi za Minimax
├── client/                # Vite + React frontend
│   └── src/               # UI komponente i API helperi
├── .env                   # Lokalne postavke (nije za commit)
└── package.json           # Backend dependencije + skripte
```

## Priprema okruženja

1. Popuni `.env` datoteku (primjer u nastavku) pravim vrijednostima Minimax računa:

   ```env
   client_id=YOUR_CLIENT_ID
   client_secret=YOUR_CLIENT_SECRET
   username=YOUR_MINIMAX_USERNAME
   password=YOUR_MINIMAX_PASSWORD
   MINIMAX_AUTH_URL=https://moj.minimax.hr/HR/API/api/token
   MINIMAX_API_URL=https://moj.minimax.hr/HR/API
   CONTRACT_TEMPLATE_PATH=server/templates/Ugovor_template.docx
   PORT=10000
   ```

2. Instaliraj backend dependencije:

   ```bash
   npm install
   ```

3. Instaliraj frontend dependencije:

   ```bash
   cd client
   npm install
   ```

## Lokalni razvoj

U jednoj terminal sesiji pokreni Express backend:

```bash
npm start
```

Backend je dostupan na `http://localhost:10000` (ili port iz `.env`).

U drugoj terminal sesiji pokreni React frontend (Vite dev server):

```bash
npm run dev --prefix client
```

Frontend je dostupan na `http://localhost:5173` i proxyja `/api` pozive prema Express serveru.

## Produkcija / build

1. Buildaj frontend iz korijena projekta (skripta će instalirati i buildati Vite aplikaciju):

   ```bash
   npm run build
   ```

2. Pokreni Express u produkcijskom modu:

   ```bash
   npm start
   ```

Ako postoji `client/dist`, Express će automatski služiti statički build zajedno s API-jem.

## API pregled

### `GET /api/orgs`
Dohvaća sve organizacije povezane s trenutnim Minimax korisnikom (koristi OAuth2 password grant). Vraća pojednostavljenu listu s ID-em, nazivom, OIB-om i adresom.

### `GET /api/orgs/:orgId`
Vraća detalje za odabranu organizaciju (koristi keširani OAuth token).

### `POST /api/contracts/generate`
Prima JSON tijelo s podacima forme (ID poslodavca + detalji zaposlenika) i vraća `.docx` dokument s popunjenim placeholderima na temelju korisnički definirane DOCX šprance (`CONTRACT_TEMPLATE_PATH`, zadano `server/templates/Ugovor_template.docx`).

## Špranca dokumenta

Repozitorij predviđa da se Word špranca (`Ugovor_template.docx`) nalazi u `server/templates/`. Ako želiš koristiti drugu verziju ili lokaciju, postavi varijablu `CONTRACT_TEMPLATE_PATH` tako da pokazuje na željenu datoteku. Placeholder varijable pišu se u obliku `{{employer_name}}`, `{{employee_name}}`, … i mogu biti raspoređene kroz više redova teksta.

## Deploy na Render

1. **Environment varijable:** u Renderovom dashboardu dodaj `client_id`, `client_secret`, `username`, `password`, `MINIMAX_AUTH_URL`, `MINIMAX_API_URL` i (po potrebi) `CONTRACT_TEMPLATE_PATH`. Render automatski dodaje `PORT`, kojeg Express koristi.
2. **DOCX špranca:** osiguraj da je `server/templates/Ugovor_template.docx` prisutan u repozitoriju ili dodaj vlastiti path preko `CONTRACT_TEMPLATE_PATH`.
3. **Build command:** `npm install && npm run build` – instalira backend ovisnosti i izgradi React frontend (`client/dist`).
4. **Start command:** `npm start` – pokreće `server/index.js`.
5. **Node verzija:** postavi `NODE_VERSION=20` (ili odaberi Node 20 u Render postavkama) kako bi se slagalo s `engines.node`.

## Napomene

- Backend automatski kešira OAuth token dok ne istekne (`expires_in`).
- Ako Minimax vrati grešku, poruka se propagira frontend-u radi lakšeg debugiranja.
- Preuzeti dokument se generira na klijentu putem privremenog `blob` URL-a.
