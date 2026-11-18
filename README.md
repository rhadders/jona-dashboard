# Jona Dashboard

Eén plek voor de cijfers van de Jona-tools: omzet, gebruik, techniek en
kosten van Jona Bestuur, Jona Giften, Selaread en Actuelegegevens.nl. Een
overzicht over alle tools, een detailpagina per tool, in de Jona-huisstijl
(licht en donker). Voor één gebruiker, met een passkey.

Het dashboard leest alleen en bewaart alleen aantallen, bedragen en
verwijzingen: geen namen, geen e-mailadressen, geen inhoud uit de tools.

## Wat erin zit (fase 1 van het bouwplan)

- **Inloggen** met een passkey, één account. De eerste passkey vraagt het
  eenmalige `SETUP_TOKEN`.
- **Stats-ophaler**: elk uur het stats-adres van elke tool, volgens het
  contract in [docs/stats-contract.md](docs/stats-contract.md).
- **Stripe per tool**: een webhook per account voor de stand van nu, en een
  nachtelijke controle die alle abonnementen opnieuw naloopt.
- **Overzicht en detailpagina** met MRR, betalend, proef, opzeggingen,
  aanmeldingen en signalen.
- **Instellingen**: de staat van elke koppeling, "Haal nu op" en de passkeys.

Fase 2 (gebruik en funnel), fase 3 (uptime, deploys, kosten en marge) en
fase 4 (weekbericht en meldingen) volgen. De detailpagina toont de cijfers
van fase 2 al zodra een tool ze aanlevert.

## Een tool toevoegen

1. Bouw het stats-adres in de tool ([docs/stats-contract.md](docs/stats-contract.md)).
2. Voeg de tool toe aan `src/config/tools.ts`.
3. Zet de vier omgevingsvariabelen met zijn `envKey` in Dokploy
   (`.env.example`) en rol opnieuw uit.
4. Maak in het Stripe-account van de tool een restricted key en een webhook
   ([docs/deployment.md](docs/deployment.md)).

## Stack

Next.js 15 (App Router), React 19, Tailwind 3 met de tokens van het Jona
design system, een eigen Postgres-database (`pg`, migraties bij het starten),
passkeys via SimpleWebAuthn, Stripe, Zod, Vitest. Alleen Nederlands.
Conventies staan in `AGENTS.md`.

## Lokaal draaien

```bash
cp .env.example .env.local   # DATABASE_URL naar een lokale Postgres, APP_URL=http://localhost:3000
npm install
npm run dev                  # http://localhost:3000
```

De migraties lopen vanzelf bij het starten. Ga daarna naar `/setup` en maak
met het `SETUP_TOKEN` je eerste passkey aan; `localhost` telt voor de browser
als veilig adres.

## Voor elke push

```bash
npm run check   # lint, typecheck en tests
```
