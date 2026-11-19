# Het beheercontract

Naast de cijfers (`docs/stats-contract.md`) kan een tool een overzicht van
zijn accounts geven, voor de platformbeheerder. Het dashboard toont dat op de
pagina Organisaties van de tool. De definitie in code staat in
`src/lib/admin/contract.ts`.

Anders dan bij de cijfers staat hier de **naam** van elk account in. Daarom:

- heeft het een eigen token, een ander dan dat van de cijfers;
- haalt het dashboard het antwoord bij elk bezoek opnieuw op en bewaart het
  niet (geen tabel, geen cache, geen log);
- staat er over de mensen achter een account niets in, alleen hun aantal.

## Het adres

```
GET /api/internal/organisaties
Authorization: Bearer <beheertoken van deze tool>
```

- Het adres staat naast het stats-adres: het dashboard neemt `STATS_URL_<KEY>`
  en vervangt het pad. Het token is `BEHEER_TOKEN_<KEY>`, bij de tool
  `BEHEER_GEHEIM` (minstens 32 tekens, vergeleken in constante tijd).
- Zonder of met een verkeerd token: `404`, ook met het token van de cijfers.
- Het antwoord is JSON, niet gecachet (`Cache-Control: no-store`).

## Het antwoord

```json
{
  "tool": "jona-bestuur",
  "generated_at": "2026-11-20T08:00:00Z",
  "accounts": [
    {
      "ref": "org_8f2k",
      "name": "Stichting De Brug",
      "created_at": "2026-11-13T09:00:00Z",
      "members": 4,
      "state": "trial",
      "plan": null,
      "status": null,
      "trial_ends_at": "2026-11-27T09:00:00Z",
      "renews_at": null,
      "ends_at": null,
      "stripe_customer": null,
      "last_active_at": "2026-11-19T19:30:00Z"
    }
  ]
}
```

| Veld | Betekenis |
| --- | --- |
| `tool` | Het id uit `src/config/tools.ts`. Een ander id wordt geweigerd. |
| `accounts` | Alle accounts, de nieuwste eerst. Hooguit 5000. |
| `ref` | De interne verwijzing, dezelfde als `account_ref` in de cijfers. |
| `name` | De naam van de organisatie. |
| `members` | Het aantal leden. Geen namen of adressen. |
| `state` | `trial` (proef), `subscription` (lopend abonnement), `expired` (proef voorbij of abonnement gestopt), `exempt` (vrijgesteld) of `off` (abonnementen staan uit). |
| `plan` | `year`, `month` of `null`. |
| `status` | De status van het abonnement bij Stripe, als er een is of was. |
| `trial_ends_at` | Het einde van de proef, of bij een abonnement in de proef de eerste betaling. |
| `renews_at` | De volgende betaling van een lopend abonnement dat niet is opgezegd. |
| `ends_at` | Wanneer een opgezegd abonnement stopt of is gestopt. |
| `stripe_customer` | Het klant-id bij Stripe (`cus_...`), voor de link naar Stripe. |
| `last_active_at` | Het laatste moment van de kernactie van de tool. |

Alle momenten zijn ISO 8601 met tijdzone. Onbekende velden worden genegeerd.

## Handelingen

Met hetzelfde token kan het dashboard drie dingen doen op één account. Dit
zijn de enige plekken waar het dashboard iets bij een tool wijzigt.

```
POST /api/internal/organisaties/<ref>/vrijstelling      { "vrijgesteld": true | false }
POST /api/internal/organisaties/<ref>/proef             { "tot": "<moment, ISO 8601>" }
POST /api/internal/organisaties/<ref>/stripe-koppeling  (zonder inhoud)
```

| Handeling | Wat de tool doet | Wanneer de tool weigert |
| --- | --- | --- |
| `vrijstelling` | Stelt het account vrij van het abonnement, of maakt dat ongedaan. | Nooit. |
| `proef` | Zet het einde van de proef later. De proef wordt er nooit korter van. | Meer dan 90 dagen vooruit of in het verleden (`400`); bij een lopend abonnement (`409`). |
| `stripe-koppeling` | Wist de klant, het abonnement en de stand van Stripe bij het account. | Bij een lopend abonnement (`409`). |

- Een geslaagd antwoord is `{ "account": { ... } }`: het account zoals het er
  daarna voor staat, in de vorm van de lijst.
- Een fout is `{ "fout": "<uitleg in gewone woorden>" }` met `400` (ongeldige
  invoer) of `409` (kan nu niet); een onbekend account of een verkeerd token
  geeft `404`. Het dashboard toont de uitleg van de tool.
- De tool legt elke handeling vast in zijn eigen auditlog. Het dashboard
  bewaart in `admin_actions` de tool, de verwijzing, de soort en het moment,
  zonder naam.
- In het dashboard loopt een handeling via
  `POST /api/tools/<tool>/organisaties/<ref>`, alleen met een sessie en van
  het dashboard zelf, en pas na een bevestiging op het scherm.
