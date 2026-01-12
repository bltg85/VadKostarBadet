# VadKostarBadet.se – Spec

Mål: Visa vad det kostar att duscha och bada just nu baserat på elpris (timpris) och användarens elområde.

Elområden:
- Default: SE4 (Skåne)
- Valbara: SE1, SE2, SE3, SE4
- Kom ihåg användarens val i localStorage

Data:
- Hämta timpriser för valt elområde för dagens datum via:
  https://www.elprisetjustnu.se/api/v1/prices/{YYYY}/{MM}-{DD}_{AREA}.json
  där AREA är SE1/SE2/SE3/SE4

Beräkningar:
- Dusch (default): 10 min, 6 kWh
- Bad (default): 160 liter, 8 kWh
- Vatten+avlopp (default): 30 kr/m³
- Visa:
  1) "Just nu" pris (aktuella timmen)
  2) Billigaste timmen idag
  3) Dyraste timmen idag
  4) Snittpris idag (valfritt)

UI:
- Dropdown för elområde
- Tydlig badge: Billigt / Normalt / Dyrt (baserat på dagens min/max)
- Mobilvänligt, snabbt, statiskt (HTML/CSS/JS)

Sidor (för AdSense):
- / (startsida)
- /integritetspolicy
- /om
- /kontakt

## Lokal utveckling

För att testa ändringar lokalt innan du pushar till GitHub:

### Metod 1: Använd start-script (enklast på Windows)
Dubbelklicka på `start-local.bat` eller kör i PowerShell:
```powershell
.\start-local.ps1
```
Detta kommer automatiskt att:
- Försöka använda Python om det finns
- Annars försöka använda Node.js med http-server
- Öppna http://localhost:8000 i webbläsaren

### Metod 2: Node.js med npm (rekommenderat)
```bash
# Installera dependencies (första gången)
npm install

# Starta servern (öppnar automatiskt i webbläsaren)
npm start

# Eller utan att öppna webbläsaren automatiskt
npm run serve
```

### Metod 3: Python
```bash
# Python 3
cd VadKostarBadet
python -m http.server 8000

# Öppna sedan i webbläsaren:
# http://localhost:8000
```

### Metod 4: VS Code Live Server
1. Installera "Live Server" extension i VS Code
2. Högerklicka på `index.html`
3. Välj "Open with Live Server"

**Viktigt:** Du måste använda en lokal webbserver (inte bara öppna filen direkt) eftersom:
- Geolocation API kräver HTTPS eller localhost
- Fetch API kan ha CORS-problem om filen öppnas direkt

## Versionshantering

Versionen visas i footern på varje sida. Den visar antingen:
- Git commit hash (första 7 tecknen) om det finns
- Version + datum som fallback
