## Fix: Rätt tid för "just nu" och korrekt visning av min/max-timme

- Use Europe/Stockholm timezone when selecting current hour.
- Fix display of cheapest/most expensive hour:
  - show HH:MM based on time_start, not slice(0,5).
- Keep existing behavior otherwise.
