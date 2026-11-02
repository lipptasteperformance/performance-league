// LIPPTASTE Performance League – liest die CSV-Dateien im Ordner "daten" und berechnet Punkte und Tabelle im Browser.
(() => {
  const CFG = Object.assign({ saison: '2027', praemienAbSpieltag: 2, praemienFreigegeben: false }, window.LIGA_EINSTELLUNGEN || {});
  const DATEIEN = { spieltage: 'daten/spieltage.csv', teams: 'daten/teams.csv', regeln: 'daten/regeln.csv' };

  const KATS = ['Produktivität', 'Durchschnittsbon', 'Systemchecks Intern und Extern', 'Google-Bewertung'];
  const KURZ = { 'Produktivität': 'Prod.', 'Durchschnittsbon': 'Ø-Bon', 'Google-Bewertung': 'Google' };
  const SYSTEM = 'Systemchecks Intern und Extern';
  // Spalten der Monatswerte -> Kategorie und Einheit
  const SPALTEN = [
    { spalte: 'Produktivität', kategorie: 'Produktivität', einheit: '€/Std.' },
    { spalte: 'Durchschnittsbon', kategorie: 'Durchschnittsbon', einheit: '€' },
    { spalte: 'Google-Bewertung', kategorie: 'Google-Bewertung', einheit: 'Sterne' },
  ];
  const DEC = { '€/Std.': 2, '€': 2, '%': 1, 'Sterne': 1 };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><rect x="10.6" y="5.5" width="2.8" height="8.5" rx="1.4" fill="#fff"/><circle cx="12" cy="17.6" r="1.6" fill="#fff"/></svg>';

  const nf = (dec) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const f0 = (n) => nf(0).format(n);
  const f1 = (n) => nf(1).format(n);
  const fmtWert = (wert, einheit) => nf(DEC[einheit] ?? 1).format(wert);
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------- CSV lesen (Excel-tauglich: Semikolon, Komma als Dezimalzeichen, UTF-8 oder Windows-1252) ----------
  const ladeText = async (url) => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(url + ' (' + res.status + ')');
    const buf = await res.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { return new TextDecoder('windows-1252').decode(buf); }
  };
  const schluessel = (s) => String(s).toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  const parseCsv = (text) => {
    text = text.replace(/^﻿/, '');
    const kopf = text.split(/\r?\n/)[0] || '';
    const trenner = [';', '\t', ','].reduce((best, t) => (kopf.split(t).length > kopf.split(best).length ? t : best), ';');
    const zeilen = [];
    let feld = '', zeile = [], inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else feld += c;
      } else if (c === '"') inQuotes = true;
      else if (c === trenner) { zeile.push(feld); feld = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        zeile.push(feld); zeilen.push(zeile); zeile = []; feld = '';
      } else feld += c;
    }
    if (feld !== '' || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
    const [header, ...rest] = zeilen;
    if (!header) return [];
    const keys = header.map(schluessel);
    return rest.filter((z) => z.some((v) => v.trim() !== '')).map((z) => {
      const o = {};
      keys.forEach((k, i) => { o[k] = (z[i] ?? '').trim(); });
      return o;
    });
  };
  const zahl = (v) => {
    if (v == null) return null;
    let s = String(v).trim().replace(/[\s€%]/g, '');
    if (!s) return null;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const feld = (row, name) => row[schluessel(name)];

  // ---------- Berechnung ----------
  const berechne = (rohSpieltage, rohTeams, rohRegeln) => {
    const teams = rohTeams.map((t) => ({ standort: feld(t, 'Standort'), kuerzel: feld(t, 'Kürzel') || '', quali: zahl(feld(t, 'Quali-Marke')), logo: feld(t, 'Logo') || '' })).filter((t) => t.standort);
    const regeln = rohRegeln.map((r) => ({ kategorie: feld(r, 'Kategorie'), einheit: feld(r, 'Einheit'), stufe: zahl(feld(r, 'Stufe')), ab: zahl(feld(r, 'Ab')), punkte: zahl(feld(r, 'Punkte')) }))
      .filter((r) => r.kategorie && r.ab != null && r.punkte != null)
      .sort((a, b) => a.ab - b.ab);
    const stufenVon = (kat) => regeln.filter((r) => r.kategorie === kat);
    const prodStart = Math.min(...stufenVon('Produktivität').map((r) => r.ab));
    const qualiVon = (standort) => { const t = teams.find((x) => x.standort === standort); return t && t.quali != null ? t.quali : prodStart; };

    // Monatswerte in einzelne Kategorie-Werte zerlegen
    const werte = [];
    for (const row of rohSpieltage) {
      const spieltag = zahl(feld(row, 'Spieltag'));
      const standort = feld(row, 'Standort');
      if (!spieltag || !standort) continue;
      const monat = feld(row, 'Monat') || '';
      for (const s of SPALTEN) {
        const w = zahl(feld(row, s.spalte));
        if (w != null) werte.push({ spieltag, monat, standort, kategorie: s.kategorie, einheit: s.einheit, wert: w });
      }
      // Systemchecks: externer Check zählt, wenn es einen gab, sonst der interne
      const extern = zahl(feld(row, 'Systemcheck extern'));
      const intern = zahl(feld(row, 'Systemcheck intern'));
      if (extern != null || intern != null) werte.push({ spieltag, monat, standort, kategorie: SYSTEM, einheit: '%', wert: extern != null ? extern : intern, quelle: extern != null ? 'extern' : 'intern' });
    }

    // Punkte je Wert; Produktivitätsstufen beginnen an der Quali-Marke des Standorts
    const punkte = werte.map((w) => {
      const versatz = w.kategorie === 'Produktivität' ? qualiVon(w.standort) - prodStart : 0;
      const stufen = stufenVon(w.kategorie).map((r) => ({ ab: r.ab + versatz, punkte: r.punkte }));
      const p = stufen.filter((r) => w.wert >= r.ab - 1e-9).reduce((m, r) => Math.max(m, r.punkte), 0);
      const max = stufen.reduce((m, r) => Math.max(m, r.punkte), 0);
      return { ...w, punkte: p, max };
    });

    // Tabelle je Spieltag
    const tage = [...new Set(punkte.map((r) => r.spieltag))].sort((a, b) => a - b);
    const namen = teams.length ? teams.map((t) => t.standort) : [...new Set(punkte.map((r) => r.standort))];
    const konto = new Map(namen.map((n) => [n, { punkte: 0, prodSumme: 0, prodMonate: 0 }]));
    const tabelle = [];
    let vorher = new Map();
    for (const s of tage) {
      const rows = namen.map((standort) => {
        const monat = punkte.filter((r) => r.standort === standort && r.spieltag === s);
        const k = konto.get(standort);
        const spieltagPunkte = monat.reduce((a, r) => a + r.punkte, 0);
        k.punkte += spieltagPunkte;
        const prod = monat.find((r) => r.kategorie === 'Produktivität');
        if (prod) { k.prodSumme += prod.wert; k.prodMonate += 1; }
        const schnitt = k.prodMonate ? Math.round((k.prodSumme / k.prodMonate) * 10) / 10 : null;
        const quali = qualiVon(standort);
        return { spieltag: s, standort, schnitt, quali, berechtigt: schnitt != null && schnitt >= quali, spieltagPunkte, punkte: k.punkte };
      });
      rows.sort((a, b) => b.punkte - a.punkte || b.spieltagPunkte - a.spieltagPunkte || a.standort.localeCompare(b.standort, 'de'));
      let praemie = 0;
      rows.forEach((r, i) => {
        r.platz = i + 1;
        r.vorplatz = vorher.has(r.standort) ? vorher.get(r.standort) : null;
        r.praemienplatz = r.berechtigt && praemie < 2 ? ++praemie : null;
      });
      vorher = new Map(rows.map((r) => [r.standort, r.platz]));
      tabelle.push(...rows);
    }
    const maxGesamt = KATS.reduce((sum, k) => sum + stufenVon(k).reduce((m, r) => Math.max(m, r.punkte), 0), 0);
    return { teams, regeln, punkte, tabelle, tage, maxGesamt };
  };

  // ---------- Darstellung ----------
  let D = null;
  let gewaehlt = null;
  let offen = null;

  // Vor dem ersten Spieltag stehen alle Teams mit 0 Punkten in der Tabelle
  const stand = () => {
    if (!D.tage.length) {
      return D.teams.map((t, i) => ({ spieltag: 0, standort: t.standort, schnitt: null, quali: t.quali, punkte: 0, platz: i + 1, vorplatz: null, praemienplatz: null }));
    }
    return D.tabelle.filter((r) => r.spieltag === gewaehlt).sort((a, b) => a.platz - b.platz);
  };

  // Teamlogo aus dem Ordner "teamlogos", sonst ein leeres Wappen als Platzhalter
  const wappen = (standort, aufDunkel) => {
    const team = D.teams.find((t) => t.standort === standort) || {};
    const slot = el('span', 'crest-slot');
    slot.setAttribute('aria-hidden', 'true');
    if (team.logo) {
      const img = el('img');
      img.src = 'teamlogos/' + encodeURIComponent(team.logo);
      img.alt = '';
      slot.append(img);
      return slot;
    }
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 40 44');
    const outer = document.createElementNS(SVGNS, 'path');
    outer.setAttribute('d', 'M20 1 L38 7 V21 C38 32 30 39.5 20 43 C10 39.5 2 32 2 21 V7 Z');
    outer.setAttribute('fill', aufDunkel ? '#ffffff' : '#0a0a0a');
    const inner = document.createElementNS(SVGNS, 'path');
    inner.setAttribute('d', 'M20 5 L34 9.8 V21 C34 29.8 27.8 35.8 20 38.8 C12.2 35.8 6 29.8 6 21 V9.8 Z');
    inner.setAttribute('fill', 'none');
    inner.setAttribute('stroke', aufDunkel ? '#0a0a0a' : '#ffffff');
    inner.setAttribute('stroke-width', '1.2');
    svg.append(outer, inner);
    slot.append(svg);
    return slot;
  };

  const zeichneSpieltage = () => {
    const box = $('#spieltage');
    box.replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      const b = el('button', 'lg-day');
      b.type = 'button';
      b.append(el('span', null, String(n)));
      b.disabled = !D.tage.includes(n);
      b.classList.toggle('is-on', n === gewaehlt);
      b.setAttribute('aria-pressed', String(n === gewaehlt));
      b.setAttribute('aria-label', 'Spieltag ' + n);
      b.addEventListener('click', () => { gewaehlt = n; zeichne(); });
      return b;
    }));
  };

  const zeichneKopf = () => {
    const start = !D.tage.length;
    const r = start ? null : stand()[0];
    $('#leader-name').textContent = r ? r.standort : 'Noch offen';
    $('#leader-pts').textContent = r ? f0(r.punkte) : '0';
    const crest = $('#leader-crest');
    crest.replaceChildren(...wappen(r ? r.standort : '', true).childNodes);
    $('#tabelle-sub').textContent = start ? 'vor Spieltag 1' : 'nach Spieltag ' + f0(gewaehlt);
  };

  const aufklappen = (t) => {
    const box = el('div', 'lg-expand');
    for (const kat of KATS) {
      const r = D.punkte.find((x) => x.standort === t.standort && x.spieltag === t.spieltag && x.kategorie === kat);
      if (!r) continue;
      const stufen = D.regeln.filter((x) => x.kategorie === kat);
      const level = Math.min(4, stufen.filter((x) => r.punkte >= x.punkte).length);
      const tile = el('div', 'lg-kat t' + level);
      tile.setAttribute('aria-label', kat + ': ' + f0(r.punkte) + ' Punkte');
      const label = r.quelle ? (r.quelle === 'extern' ? 'Sys. ext.' : 'Sys. int.') : (KURZ[kat] || kat);
      tile.append(el('span', 'p', f0(r.punkte)), el('span', 'n', label));
      box.append(tile);
    }
    return box;
  };

  const zeichneTabelle = () => {
    $('#board').replaceChildren(...stand().map((r) => {
      const li = el('li', ['lg-entry', r.praemienplatz ? 'zone-' + r.praemienplatz : '', r.standort === offen ? 'is-open' : ''].join(' ').trim());
      const row = el('div', 'lg-row lg-cols');
      const rk = el('span', 'lg-rank');
      const mv = el('span');
      const diff = r.vorplatz == null ? 0 : r.vorplatz - r.platz;
      mv.className = 'lg-mv ' + (r.vorplatz == null || diff === 0 ? '' : diff > 0 ? 'up' : 'down');
      if (r.vorplatz != null) mv.setAttribute('aria-label', diff > 0 ? 'aufgestiegen' : diff < 0 ? 'abgestiegen' : 'unverändert');
      rk.append(el('b', 'lg-platz', f0(r.platz)), mv);
      const name = el('span', 'lg-teamcell');
      name.append(wappen(r.standort, false), el('span', null, r.standort));
      const prod = el('span', 'lg-prodcell');
      const hatWert = r.schnitt != null;
      const unter = hatWert && r.schnitt < r.quali;
      const avg = el('span', 'lg-avg' + (unter ? ' is-low' : ''));
      if (unter) avg.innerHTML = ICON_WARN;
      avg.append(document.createTextNode(hatWert ? f1(r.schnitt) : '–'));
      prod.append(avg, el('small', 'lg-ziel', r.quali != null ? f0(r.quali) : ''));
      if (hatWert) prod.setAttribute('aria-label', 'Saisonschnitt ' + f1(r.schnitt) + ' Euro je Stunde, Quali-Marke ' + f0(r.quali) + (unter ? ', noch nicht prämienberechtigt' : ', prämienberechtigt'));
      row.append(rk, name, prod, el('span', 'lg-pts', f0(r.punkte)));
      li.append(row);
      if (!r.spieltag) return li;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-expanded', String(r.standort === offen));
      const toggle = () => { offen = offen === r.standort ? null : r.standort; zeichneTabelle(); };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      if (r.standort === offen) li.append(aufklappen(r));
      return li;
    }));
  };

  const zeichnePraemien = () => {
    const texte = { 1: CFG.praemiePlatz1 || '', 2: CFG.praemiePlatz2 || '', hinweis: CFG.praemieHinweis || '' };
    document.querySelectorAll('[data-praemie]').forEach((e) => { e.textContent = texte[e.dataset.praemie] || ''; });
    const zeigen = CFG.praemienFreigegeben && texte[1] !== '' && D.tage.length > 0 && D.tage[D.tage.length - 1] >= CFG.praemienAbSpieltag;
    document.querySelectorAll('[data-prizes]').forEach((e) => { e.hidden = !zeigen; });
    document.querySelectorAll('[data-teaser]').forEach((e) => { e.hidden = zeigen; });
  };

  const zeichneRegeln = () => {
    document.querySelectorAll('.lg-tiers[data-kat]').forEach((ol) => {
      const kat = ol.dataset.kat;
      const rows = D.regeln.filter((r) => r.kategorie === kat);
      ol.replaceChildren(...rows.map((r, i) => {
        const li = el('li', 't' + Math.min(4, i + 1));
        const ab = kat === 'Produktivität'
          ? (i === 0 ? 'ab Quali' : 'Quali +' + f0(r.ab - rows[0].ab) + ' €')
          : 'ab ' + fmtWert(r.ab, r.einheit);
        li.append(el('span', 'pt', '+' + f0(r.punkte)), el('span', 'ab', ab));
        return li;
      }));
    });
  };

  const zeichne = () => {
    zeichneSpieltage();
    zeichneKopf();
    zeichneTabelle();
    zeichnePraemien();
  };

  // Info-Buttons
  document.querySelectorAll('.lg-info').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const auf = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(auf));
      const ziel = document.getElementById(b.getAttribute('aria-controls'));
      if (ziel) ziel.hidden = !auf;
    });
  });

  document.querySelectorAll('[data-saison]').forEach((e) => { e.textContent = CFG.saison; });
  document.querySelectorAll('[data-praemien-ab]').forEach((e) => { e.textContent = f0(CFG.praemienAbSpieltag); });

  // ---------- Passwort (nur Sichtschutz: die Dateien selbst bleiben öffentlich) ----------
  const ZUGANG_KEY = 'lg-zugang';
  const sha256 = async (text) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const gespeichert = () => { try { return localStorage.getItem(ZUGANG_KEY); } catch { return null; } };
  if (CFG.passwortCode && gespeichert() !== CFG.passwortCode) {
    const screen = $('#zugang');
    const input = $('#zugang-pw');
    screen.hidden = false;
    $('#liga').hidden = true;
    input.focus();
    input.addEventListener('input', () => { $('#zugang-fehler').hidden = true; });
    $('#zugang-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = await sha256('lipptaste-liga:' + input.value.trim());
      if (code !== CFG.passwortCode) {
        $('#zugang-fehler').hidden = false;
        input.select();
        return;
      }
      try { localStorage.setItem(ZUGANG_KEY, code); } catch { /* ohne Speicher einfach nur für diesen Besuch */ }
      screen.hidden = true;
      $('#liga').hidden = false;
    });
  }

  Promise.all([ladeText(DATEIEN.spieltage), ladeText(DATEIEN.teams), ladeText(DATEIEN.regeln)])
    .then(([s, t, r]) => {
      D = berechne(parseCsv(s), parseCsv(t), parseCsv(r));
      gewaehlt = D.tage.length ? D.tage[D.tage.length - 1] : null;
      zeichneRegeln();
      zeichne();
    })
    .catch((err) => {
      console.error(err);
      $('#fehler').hidden = false;
    });
})();
