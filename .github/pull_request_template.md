## Summary

<!-- What changed and why (1–3 bullets) -->

## Zone

- [ ] `apps/web` / `packages/*`
- [ ] `apps/mcu`
- [ ] `supabase/`
- [ ] docs / repo tooling
- [ ] `archive/prototype-v1` (hotfix only — justify below)

## Test plan

- [ ] `npm run build` (apps/web) passes
- [ ] `npm run build:mcu` passes (if MCU touched)
- [ ] Manual check at 390px + reduced motion (if UI touched)
- [ ] RLS respected; no client-trusted prices/odds (if backend touched)

## Contracts preserved

<!-- Ledger law, crypto engine, RLS policies, glossary terms, locked tokens.
     List anything verified unchanged, or N/A. -->
