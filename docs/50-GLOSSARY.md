# 50 — GLOSSARY: the single vocabulary

Agents and copy use EXACTLY these terms. If a concept is missing, propose an
addition via `docs/decisions/` — never invent a synonym mid-task.

| Term | Meaning |
|---|---|
| **Figure** | A collectible design (e.g. Katana · Legendary). Never "item", "NFT", "card", "skin". |
| **Mint** | One numbered instance of a figure owned by a player: figure + mint number. |
| **Mint number** | Sequential position in the run, formatted "№ 0142 / 2,500" in mono. |
| **Run** | The finite tirage of a figure. Run size is public. Sold out = run fully minted. |
| **Case** | The purchasable container players open. Never "lootbox" in UI. Tiers: Paper, Bronze, Silver, Gold, Obsidian. |
| **Open Ritual** | The full-screen case-opening sequence (Vault environment, commit shown first). |
| **Opening** | One server-recorded case open: commit, roll, reveal, resulting mint. |
| **Commit / Reveal** | The two RNG phases: hashed server seed stored before the roll; seed published after. |
| **Verify page** | Public page recomputing an opening's roll in-browser. "Proven fair". |
| **PX** | Premium currency, bought with GBP. Integer only. Never withdrawable. |
| **Shards** | Soft currency from dissolving, quests, events. Spent on crafting. |
| **Dissolve** | UI verb for disenchanting a mint into Shards. Never "burn", "sell", "scrap" in UI. |
| **Craft** | Creating a chosen figure mint for Shards (4× its dissolve yield). |
| **XP** | Progression points. Dual counter: Account Level (permanent) + Season Level (resets). |
| **Pity Ring** | Visible progress ring of pity counters (Epic+ ≤20, Legendary+ ≤60). |
| **Collector Score** | The single collection-value metric (rarity × scarcity × early bonus, set multipliers). |
| **Museum** | A player's public shelf (`#/u/username`): up to 8 pinned mints on pedestals with plaques. |
| **Showcase** | A feed post presenting a mint (auto for big pulls, opt-out; manual from figure detail). |
| **Passport** | The player identity document: avatar, level, score, plaques. Exportable image. |
| **Season Atlas** | The season's full figure checklist; completing sets/atlas grants plaques and score bonuses. |
| **Set** | All 6 rarities of one item (e.g. all Katana figures). |
| **Gallery** | Light scene environment (paper/washi base): collection, market, profile, quests. |
| **Vault** | Dark scene environment (water/glass base): Open Ritual, events, live drops. |
| **The Codex** | `docs/10-BRAND.md` — the design law (Still Water). Outranks all visual decisions. |
| **The Star** | The 4-pointed hikari mark (`assets/brand/star.svg`): the only decorative glyph. |
| **The Seal** | The akane hanko stamp (`assets/brand/seal.svg`): authenticity moments only. |
| **The Plaque** | The ownership primitive: ink bar + mono "№ 0142 / 2,500", optional provenance line. |
| **The Oath** | The ritual beat showing the commit hash before the roll. Never skippable. |
| **MCU / POXY OS** | The staff admin console (`apps/mcu`). Out of player-facing scope. |
| **POXY PASS** | The £9.99 seasonal pass: 50 tiers, free + premium tracks. |
| **VIP** | The £4.99/month subscription (second daily case, 3% market fee, frame, early access). |
| **Daily case** | The free streak-scaled case claimable once per day. |
| **Community goal** | Server-wide weekly/event target with shared reward. |
| **Wallet / Ledger** | Cached balances / the append-only record every balance change must pass through. |
