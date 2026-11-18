# Deployment

Jona Dashboard draait als Docker-container via Dokploy op de hoofd-VPS, met
een eigen Postgres-database in hetzelfde Dokploy-project. Het image bouwt de
MacBook en staat in de eigen registry, zoals bij de andere Jona-apps.

## Eerste keer in gebruik nemen

1. **Dokploy-project.** Maak het project **Jona Dashboard** met twee
   services:
   - een Postgres-database (`jona_dashboard`); noteer de interne
     verbindings-URL;
   - een application met bron Docker,
     `registry.jonacommunicatie.cloud/jona-dashboard:latest`, één replica,
     container-poort 3000, het domein `bi.jonatechnologie.nl` met Let's
     Encrypt, Auto Deploy aan.
2. **Omgeving van de app** (Environment; daarna opnieuw deployen):
   - `DATABASE_URL`: de interne verbindings-URL van de database;
   - `APP_URL`: `https://bi.jonatechnologie.nl`;
   - `CRON_SECRET` en `SETUP_TOKEN`: elk `openssl rand -hex 32`.
   De build heeft geen build-argumenten nodig.
3. **Schedule in Dokploy**, elk uur:
   `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/tick`
4. **GitHub** (`rhadders/jona-dashboard`, Settings → Secrets and variables →
   Actions):
   - registreer de runner van de MacBook (label `macbook`) voor deze repo;
   - variable `IMAGE_REGISTRY`: `registry.jonacommunicatie.cloud`. Zolang die
     leeg is, slaat de workflow "Image bouwen en uitrollen" over;
   - secrets `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` en
     `DOKPLOY_DEPLOY_WEBHOOK` (de deploy-webhook van de application);
   - optioneel variable `CI_ENABLED` op `true` zodra er een runner voor CI is.
5. **Eerste passkey.** Ga naar `https://bi.jonatechnologie.nl/setup`, vul het
   `SETUP_TOKEN` in en maak je passkey aan. Voeg daarna op Instellingen een
   tweede passkey toe (bijvoorbeeld je telefoon): raak je de enige kwijt, dan
   kom je er niet meer in zonder de database aan te passen.

De migraties lopen bij het starten van de container; er is geen aparte stap
vóór de deploy.

## Een tool koppelen

Per tool vier omgevingsvariabelen, met het achtervoegsel uit
`src/config/tools.ts` (`BESTUUR`, `GIFTEN`, `SELAREAD`, `ACTUELEGEGEVENS`).

### Stats-adres

1. Rol het stats-adres uit in de tool (`docs/stats-contract.md`).
2. Zet `STATS_URL_<KEY>` (het volledige adres) en `STATS_TOKEN_<KEY>`.

### Stripe

Elke tool heeft een eigen Stripe-account. In dat account:

1. **Restricted key** (Developers → API keys → Create restricted key) met
   alleen leesrechten op Subscriptions, Customers en Invoices. Zet hem in
   `STRIPE_API_KEY_<KEY>`.
2. **Webhook** (Developers → Webhooks) naar
   `https://bi.jonatechnologie.nl/api/webhooks/stripe/<tool-id>`, met de
   gebeurtenissen `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid` en `invoice.payment_failed`. Zet het signing secret in
   `STRIPE_WEBHOOK_SECRET_<KEY>`.

Het precieze adres per tool staat op Instellingen. Rol opnieuw uit en klik
daar op "Haal nu op": de koppelingen horen dan op "In orde" te staan.

### Controle van fase 1

Maak in de testomgeving van Stripe een proefabonnement aan en zet de
testsleutels tijdelijk in de omgeving. MRR, betalend en proef op het
dashboard horen overeen te komen met het Stripe-dashboard.

## Wat de MRR wel en niet meetelt

De MRR is de prijs maal het aantal van elk lopend abonnement, omgerekend
naar een maand. Kortingen (coupons) en prijzen inclusief btw worden in deze
versie niet gecorrigeerd, en alleen abonnementen in euro tellen mee.

## Als iets niet klopt

- **Een koppeling staat op oranje**: Instellingen toont de reden ("Het token
  wordt geweigerd", "Het adres antwoordt met 500", "Ongeldig veld: …").
- **De cijfers lopen achter**: kijk op Instellingen wanneer de laatste
  ophaalronde was. Geen ronde betekent dat het schedule niet loopt of dat
  `CRON_SECRET` niet klopt.
- **Inloggen lukt niet meer na een domeinwissel**: passkeys zijn aan het
  adres in `APP_URL` gebonden. Verwijder de rijen in `passkeys` en maak via
  `/setup` een nieuwe aan.
