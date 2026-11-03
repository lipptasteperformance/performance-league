# LIPPTASTE Performance League

Die Ligatabelle der fünf LIPPTASTE-Standorte als Webseite für das Handy.
Die Seite liest drei CSV-Dateien im Ordner `daten` und rechnet Punkte, Tabelle und Prämienplätze selbst aus.

## Ordner

| Datei | Inhalt |
|---|---|
| `index.html`, `liga.css`, `liga.js` | die Seite selbst |
| `daten/spieltage.csv` | **die Monatswerte, die jeden Monat ergänzt werden** |
| `daten/teams.csv` | Standorte, Quali-Marke, Dateiname des Teamlogos |
| `daten/regeln.csv` | Punktestufen je Kategorie |
| `bilder/` | LIPPTASTE-Logo |
| `teamlogos/` | Teamlogos (PNG oder JPG, am besten quadratisch) |

Vor dem ersten Spieltag enthält `daten/spieltage.csv` nur die Kopfzeile. Die Seite zeigt dann alle Teams mit 0 Punkten.

## Einmalig: auf GitHub veröffentlichen

1. Auf github.com anmelden und oben rechts **New repository** wählen, z. B. Name `performance-league`, Sichtbarkeit **Public**.
2. Im neuen Repository auf **uploading an existing file** klicken und den **Inhalt** dieses Ordners (alle Dateien und Unterordner) in das Fenster ziehen. Unten **Commit changes** klicken.
3. **Settings → Pages**: bei *Source* „Deploy from a branch“, Branch `main`, Ordner `/ (root)` wählen und speichern.
4. Nach 1–2 Minuten ist die Liga unter `https://<benutzername>.github.io/performance-league/` erreichbar. Diesen Link (oder einen QR-Code dazu) an die Teams geben.

Hinweis: Eine Seite auf GitHub Pages ist öffentlich. Jeder mit der Adresse kann sie sehen.

## Jeden Monat: neue Werte eintragen

1. `daten/spieltage.csv` mit Excel öffnen.
2. Pro Standort eine neue Zeile anfügen: Spieltag, Monat, Standort, Produktivität, Durchschnittsbon, Systemcheck intern (Durchschnitt der internen Checks im Monat), Google-Bewertung. Zahlen ganz normal mit Komma eintragen, z. B. `6,75`.
3. Speichern und das Format **CSV** beibehalten.
4. Auf GitHub in den Ordner `daten` gehen, **Add file → Upload files**, die Datei hineinziehen und **Commit changes** klicken. Die alte Datei wird ersetzt.
5. Nach 1–2 Minuten zeigt die Seite den neuen Spieltag.

Der Standortname muss genau so geschrieben sein wie in `daten/teams.csv`.

## Weitere Anpassungen

- **Quali-Marke ändern:** in `daten/teams.csv` die Spalte *Quali-Marke* ändern und hochladen.
- **Teamlogo einbauen:** Bild in den Ordner `teamlogos` hochladen und den Dateinamen (z. B. `muenster.png`) in `daten/teams.csv` in die Spalte *Logo* schreiben.
- **Punktestufen ändern:** `daten/regeln.csv` anpassen.
- **Prämien enthüllen:** erst am Tag der Enthüllung in `index.html` oben bei den Einstellungen die Texte bei `praemiePlatz1`, `praemiePlatz2` und `praemieHinweis` eintragen und `praemienFreigegeben` auf `true` setzen. Vorher die Texte leer lassen, denn alles in den Dateien ist auf GitHub für jeden lesbar.
- **Passwort:** steht verschlüsselt als `passwortCode` in `index.html`. Ein neues Passwort lässt du dir von Claude in diesen Code umwandeln. Das Passwort ist nur ein Sichtschutz, die Dateien auf GitHub bleiben öffentlich.
- **Neue Saison:** in `index.html` bei den Einstellungen `saison` ändern und `daten/spieltage.csv` leeren.
