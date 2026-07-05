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

## Status

Rive integration is **deferred until after the beta** (architect decision,
see `docs/decisions/`). Season 1 katana (`figures/season1/katana/`) is ready
and waits for its own integration session. A standalone test harness lives in
`design/rive/katana-test.html`.
