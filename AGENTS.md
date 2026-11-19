# Conventies in dit project

Jona Dashboard toont de cijfers van de Jona-tools voor één gebruiker. Zie
`README.md` voor wat het doet, `docs/stats-contract.md` voor wat een tool
aanlevert en `docs/deployment.md` voor de uitrol. Het bouwplan met de vier
fasen en de definities van de cijfers staat in het document "Bouwplan Jona
Dashboard".

## Stack

Next.js 15 (App Router), React 19, Tailwind 3, een eigen Postgres via `pg`,
SimpleWebAuthn, Stripe, Zod, Vitest. Alleen Nederlands, zonder i18n-laag. Geen
grafiekbibliotheek: grafieken zijn eigen SVG met tokens.

## Grenzen

- **Alleen lezen.** Het dashboard schrijft nergens naartoe: niet naar een
  tool, niet naar Stripe. Sleutels hebben alleen leesrechten.
- **Geen persoonsgegevens.** De database bewaart aantallen, bedragen en
  verwijzingen. Geen naam, e-mailadres of inhoud uit een tool of uit Stripe;
  `src/server/migrations.test.ts` bewaakt de kolommen.
- **Namen van organisaties alleen tonen.** De pagina Organisaties haalt haar
  lijst bij elk bezoek op bij de tool zelf (`docs/beheer-contract.md`) en
  bewaart niets: geen tabel, geen cache, geen log. Over de mensen achter een
  organisatie staat er niets in, alleen hun aantal.
- **`src/server/**` is alleen server**: geen `"use client"`-bestand en niets
  onder `src/lib`, `src/components` of `src/config` importeert eruit
  (`src/server/server-imports.test.ts`). Geheimen uit de omgeving leest alleen
  `src/server/env.ts`.
- **Een tool is configuratie.** Alles wat per tool verschilt staat in
  `src/config/tools.ts` en in de omgeving. Geen `if (tool.id === ...)` in de
  code.

## Code

- Domeinlogica is puur en staat in `src/lib/**`, met een test ernaast (MRR,
  het stats-contract, signalen, statussen, reeksen, opmaak). Componenten
  rekenen niet zelf aan bedragen, percentages, statussen of datums.
- Pagina's zijn servercomponenten die via `src/server/queries.ts` lezen.
  Mutaties zijn route handlers onder `src/app/api/**`: invoer via Zod, een
  foutantwoord via `apiError(status, "Nederlandse tekst")`, nooit een ruwe
  foutmelding van een dienst.
- Een mutatie uit de browser passeert `sameOrigin()` en `hasSession()`; een
  aanroep van buiten (de tik, de webhook) bewijst zich met een geheim of een
  handtekening.
- Een schemawijziging is een nieuwe stap onderaan `MIGRATIONS` in
  `src/server/migrations.ts`. Een bestaande stap verandert nooit meer.
- Identifiers en enumwaarden zijn Engels; routes en gebruikersteksten
  Nederlands, in de je-vorm, werkwoord voorop, zinshoofdletter.
- Bedragen zijn centen tot ze op het scherm komen; opmaak via
  `src/lib/format.ts` (nl-NL). Een aantal met een percentage staat er altijd
  samen: "24 van 29 · 83%".

## Vormgeving

De identiteit is het Jona design system; het beeldmerk is de duif. Het
ontwerp is richting A, "Rustig": veel witruimte, één groot cijfer, haarlijnen.

- Geen harde kleuren: alleen tokens uit `src/app/globals.css` via
  `tailwind.config.ts`. Geen Tailwind-standaardpalet
  (`src/lib/design/no-hardcoded-styles.test.ts`).
- Navy is inkt en primaire actie; teal is het enige accent.
- Geen tekst of cijfer om het scherm te vullen: alles wat er staat moet op
  die plek iets zeggen. Geen beschrijvende regel onder een titel.
- Knoppen en pillen zijn volledig rond. Focus is altijd zichtbaar.
- Geen emoji en geen unicode als icoon: daar zijn Lucide-glyphs voor.
- Toon zit ook in de vorm: wat aandacht vraagt is een oranje vierkantje, de
  rest een rondje (`src/components/app/status.tsx`).
- Elke pagina werkt in licht en donker, op 1280 breed en op telefoonbreedte.

## Tests

Elke wijziging levert haar tests mee. Voor elke push:

```bash
npm run check
```
