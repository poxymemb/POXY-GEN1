# POXY World — Landing Page (Stitch)

| Screen | Stitch ID | Files |
|--------|-----------|-------|
| POXY World - Ultra-Premium Cyber-Glass Landing Page | `815d71bbe22848e1bfa197a81f097063` | Reference in Stitch project `3452513058897199540` |

## In-app implementation

- `assets/poxy-landing-page.css` — matte black + frosted glass system (uses `--poxy-*` tokens where aligned)
- `assets/poxy-landing-page.js` — parallax glows, scroll reveal, auth modal bridge
- `#poxyLanding` in `index.html` — shown when logged out; CTAs call `openPoxyAuth()`

## Stitch export

```bash
# Screenshot (optional hero reference)
curl -L -o assets/landing/hero-reference.png "https://lh3.googleusercontent.com/aida/AP1WRLsgIGpiNPCM6qCxHN4ZpxXO9d-NCBDLKn1l8KCuK8IVQ9ho18ZJ4IsKePuEFyJtcnYJs7eOvsnk-GmGUtyYew_i04azClByvPk02hDOMHhsl-vC92L5rA1e76s0zTweW66cukAQm1whyvrIEnOU569Np43TfrXGa-gaC-7LGc9fsEsD95a10uvwR0bL5DVLmLaUb9IeLzLTxCcPgm_ks1LWQ7NJsYrbIf9FmI1vnX5cUpaMUBeY6JaE"
```
