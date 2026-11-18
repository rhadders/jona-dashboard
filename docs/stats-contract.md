# Het stats-contract

Elke tool levert zijn gebruikscijfers via één beveiligd adres in een vaste
vorm. Het dashboard kent daardoor geen enkele database van binnen. De
definitie in code staat in `src/lib/stats/contract.ts`.

## Het adres

```
GET /api/internal/stats
Authorization: Bearer <token van deze tool>
```

- Een eigen token per tool, in de omgeving van de tool en van het dashboard
  (`STATS_TOKEN_<KEY>`). Vergelijk het in constante tijd.
- Zonder of met een verkeerd token: `401`.
- Het antwoord is JSON, niet gecachet (`Cache-Control: no-store`).
- Alleen aantallen en interne verwijzingen. **Nooit** een naam, e-mailadres
  of andere persoonsgegevens.

## Het antwoord

```json
{
  "tool": "jona-bestuur",
  "generated_at": "2026-11-18T20:00:00Z",
  "accounts": { "total": 22, "trial": 4 },
  "signups": { "last_24h": 1, "last_30d": 8 },
  "activated": { "last_30d": 5 },
  "active": { "last_7d": 13, "last_30d": 16 },
  "counters": {
    "vergaderingen_gemaakt": 46,
    "vergaderingen_geopend": 312
  },
  "attention": [
    { "kind": "trial_ending", "account_ref": "org_8f2k", "days": 3 }
  ]
}
```

| Veld | Fase | Betekenis |
| --- | --- | --- |
| `tool` | 1 | Het id uit `src/config/tools.ts`. Een ander id wordt geweigerd. |
| `generated_at` | 1 | Het moment van tellen, ISO 8601 met tijdzone. |
| `accounts.total` | 1 | Alle accounts van het type klant (organisaties, of abonnees bij Selaread). |
| `accounts.trial` | 1, optioneel | Waarvan in een proefperiode. |
| `signups.last_24h`, `signups.last_30d` | 1 | Nieuwe accounts in die periode. |
| `activated.last_30d` | 2 | Accounts die in de afgelopen 30 dagen hun eerste kernactie deden. |
| `active.last_7d`, `active.last_30d` | 2 | Accounts met een kernactie in die periode. |
| `counters` | 2 | Vrije tellers per tool, over de afgelopen 30 dagen. De labels staan in `src/config/tools.ts`. |
| `attention` | 2 | Hooguit 50 aandachtspunten: een soort, een interne verwijzing en eventueel een aantal dagen. |

Alle aantallen zijn hele getallen van nul of meer. Een veld dat het dashboard
niet kent, negeert het; een tool mag dus vooruitlopen.

## Wat actief en geactiveerd betekent

| Tool | Klant | Actief | Geactiveerd |
| --- | --- | --- | --- |
| Jona Bestuur | Organisatie | Een vergadering gemaakt of geopend | Eerste vergadering gemaakt |
| Jona Giften | Organisatie | Een gift ingevoerd of geïmporteerd | Eerste gift ingevoerd |
| Selaread | Abonnee | Een nummer geopend | Eerste nummer gelezen |
| Actuelegegevens.nl | Organisatie | Een campagne verstuurd of een reactie ontvangen | Eerste campagne verstuurd |

## Betalend en omzet

Die komen niet uit dit adres maar uit Stripe, zodat er één bron van waarheid
voor geld is.
