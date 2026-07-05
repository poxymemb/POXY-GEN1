# assets/ — art sources and Rive files

Canonical home for binary art assets: `.riv` animations and source art,
organized by season and item:

```
assets/figures/<season>/<item>/<file>.riv
```

## Git LFS policy

All `.riv` files go through **Git LFS** (see root `.gitattributes`:
`*.riv filter=lfs`). Before committing new binary art:

1. Make sure Git LFS is installed (`git lfs version`).
2. If you add a new binary type (e.g. `.png` masters, `.blend`), track it
   first: `git lfs track "*.ext"` and commit the updated `.gitattributes`.
3. Keep web-optimized derivatives (compressed images the app actually serves)
   inside `apps/web/public/`, not here. This folder holds sources.

## Font licenses

The app self-hosts four variable fonts as latin-subset woff2 files in
`apps/web/public/fonts/` (declared in `apps/web/src/ui/fonts.css`):

| Font | Use (Codex §6) | License |
|---|---|---|
| Fraunces | Display & catalog | SIL OFL 1.1 |
| Inter | UI | SIL OFL 1.1 |
| Space Grotesk | Numbers only | SIL OFL 1.1 |
| JetBrains Mono | Proofs only | SIL OFL 1.1 |

All four are licensed under the SIL Open Font License 1.1 — free for
commercial use, embedding and self-hosting; the fonts themselves may not be
sold standalone. Sources: Google Fonts (upstream projects: undercase/Fraunces,
rsms/inter, floriankarsten/space-grotesk, JetBrains/JetBrainsMono).

## Status

Rive integration is **deferred until after the beta** (architect decision,
see `docs/decisions/`). Season 1 katana (`figures/season1/katana/`) is ready
and waits for its own integration session. A standalone test harness lives in
`design/rive/katana-test.html`.
