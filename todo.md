# TODO

## Auto-detect elområde (valfritt)

- Default area: SE4
- Add button: "Gissa mitt elområde"
- On click:
  1) Try navigator.geolocation.getCurrentPosition (requires HTTPS + user permission)
  2) If allowed: convert lat/lon to Swedish elområde (SE1-SE4) using a simple rule or mapping
  3) Set dropdown to detected area
  4) Save to localStorage("area")
- Always allow manual override via dropdown.
- If geolocation denied or fails: show friendly message and keep dropdown.
