# POXY — Premium Unified Navigation Bar (Lumina Edition)

| Screen | Stitch ID | Project |
|--------|-----------|---------|
| POXY - Premium Unified Navigation Bar (Lumina Edition) | `42691b77c49c409bb4a6ce24bdb3291e` | `3452513058897199540` |

## Reference export

- `lumina-nav-bar.html` — Stitch HTML (utility cluster: wallet capsule, glass circles, profile)
- Screenshot: `curl -L -o stitch-export/nav/lumina-nav-reference.png "https://lh3.googleusercontent.com/aida/AP1WRLv0v4Qf2J6cy3LLpM13tlTpDzI1iI4dlFVC-dbojT8pScProFxmb7-jqVk1dp8k3NywaTUrQ7t9nPQDURta-tX8bSXctfAImBkVpUwsrycOL7vKz-GwJHK2cSEdbmte-Un8hvaMDObnbXUFHweJkrC1_ynaSDe7G9aIF-cCxHPtkzraUtOY2oRTJUS26TzyuexyVefWL-jo_ixrK_SUZhOm8-wLRPvZ4VY7_IplgBNS3KSde7tKMrmj"`

## In-app implementation

- `index.html` — `#stGlobalNav` three-zone grid: left (brand + primary), center (pill tabs), right (wallet + icons + profile)
- `assets/stitch-dashboard.css` — glass capsule/circles, spring hovers
- `assets/frames.css` — custom avatar frame rings on `#userBarAvatarWrap` (preserves magma/orange fire, etc.)
- `assets/st-nav-right-motion.js` — tactile press state
