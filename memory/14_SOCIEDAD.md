# Who answers for this: the legal entity

Given by Eugenio on 2026-08-22, after the privacy page had to say out loud that
it did not know. **It was written down nowhere** — not in `memory/`, not in
`docs/`, not in the code — and at least four things need it.

```
Light for Humanity
CIF G88040563
Calle Bahía de Almería 30, Bajo C
28042 Madrid, Madrid, España
```

## Where it has to appear, and why

| Where | Why |
|---|---|
| `humanity.wiki/privacidad` | GDPR: the data controller must be identifiable, with a way to reach them |
| App Store Connect | The seller/provider shown on the product page |
| Google Play Console | The developer identity, which Google verifies against documents |
| Stripe | The account holder receiving money |
| Terms of service | **Do not exist yet.** Both stores accept their own default EULA, so this is not blocking, but a platform holding other people's content should have its own |

## The letter of the CIF is not a detail

A Spanish CIF starting with **G** is the range for associations, foundations and
other entities **without profit motive**. That is not trivia here — it decides
money questions that have already been discussed:

- **Apple takes no commission on donations to a non-profit**, which is why the
  Stripe decision holds. But the exemption is not automatic from the CIF: Apple
  requires enrolment in its **non-profit programme** and verification of the
  status. Until that is done, a donation flow through Stripe inside the app is
  exactly the thing review rejects.
- Same for **physical goods**, which are exempt regardless of the entity.

**Nobody has confirmed the Apple non-profit enrolment.** Written here as an open
question, not as a fact, because assuming it is what turns into a rejection.

## What is still not known

| What | Where it would come from |
|---|---|
| A contact e-mail for exercising data rights | Eugenio. The postal address above is legally sufficient, an address people actually write to is better |
| The country the servers physically run in | A Hetzner config value, not in this repo. Hetzner is a German company; the datacentre region is a separate question |
| Which provider holds the off-site backups | `COPIAS_REMOTO_CUBO`, set at deploy time |

See `memory/10_TIENDAS.md` for the store submission state and the measured data
inventory behind the privacy page.
