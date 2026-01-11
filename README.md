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
  1) “Just nu” pris (aktuella timmen)
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
