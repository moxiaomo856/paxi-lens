# Paxi Pro Suite · Official DAO Funding Proposal (256,000 PAXI)

> Purpose: Apply to the Paxi DAO community pool for **256,000 PAXI** to deliver and operate the "Paxi on-chain data layer + non-custodial toolkit".
> Status: **Final draft** — amount structure decided (120k delivered v1 + 100k new features + 36k operations).
> Supporting materials: `AUDIT_REPORT.md` (security & compliance audit), `ARCHITECTURE_256K.md` (full architecture & dev plan), `ROADMAP.md`, `LICENSE` (MIT), `DAO_FUNDING_PROPOSAL.md` (Chinese version).

---

## 1. Title
**Paxi Pro Suite — The Paxi On-Chain Data Layer & Non-Custodial Toolkit. Applying for 256,000 PAXI from the Paxi DAO Community Pool**

## 2. Abstract
Paxi Pro Suite is a **pure front-end, non-custodial** toolkit for the Paxi ecosystem. All 20 tools are live (MIT public repository `moxiaomo856/paxi-toolbox`, full commit history, security audit passed): decoder, token issuance, Swap helper (native AMM), allowance manager, burning, redelegation, governance proposals/voting, delegation, batch transfers, IBC queries, tx dry-run and more. **Private keys and funds never leave the user's wallet.** This grant of 256,000 PAXI funds: ① the continued availability and official integration of the delivered v1; ② building the **public read-only data layer** the chain currently lacks — whale tracking, large-tx feed, new-contract radar with contract safety checks, governance participation dashboard, and validator transparency; ③ 12 months of operations. All tool service fees go 100% to a single transparent address `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd`; **no prize pools, contracts hold no user funds, and no tool touches TKCC**.

## 3. Problem Statement
- New users lack a **unified, trustworthy, non-custodial** entry point for Paxi; governance participation is hard.
- On-chain data is unobservable: whale movements, large transactions, new contract deployments, governance participation rates, validator performance — **the ecosystem has no public, reproducible dashboards**; 469k accounts operate in information asymmetry.
- Newly issued PRC-20 contracts lack public safety checks (mint authority revoked? liquidity? holder concentration), and users keep falling for honeypots.
- Existing third-party tools are custodial or semi-custodial, creating key/fund risk.

## 4. Solution & Feature Matrix
| Layer | Content |
|-------|---------|
| **Delivered v1 (20 tools, NOT funded by this grant)** | Decoder, issuance (PRC-20/721), Swap helper, allowance manager, batch transfer, burning, NFT launcher, balances, address book, IBC query, claim rewards/compound, delegate/undelegate, governance voting, redelegate, validator compare, proposals, tx dry-run, gas calc, address convert |
| **New: data service layer (core of the 100k)** | Block Scanner (read-only indexing, the architecture proven by pump-watch) + SQLite index + public REST API (rate-limited, OpenAPI, takeover-ready) |
| **New: data applications (front-end)** | Whale tracker, large-tx live feed, new-contract radar, contract safety check, governance dashboard, validator transparency, chain overview |

> Compliance exclusions (deliberately not shipped): NFT marketplace (Authz risk), mini-games, wallet itself, prediction-market clones (division of labor with the official team).

## 5. Deliverables
1. Deployable pure front-end dApp (20 tools + 7 data applications, zh/en i18n).
2. Open-source `paxi-data` service: scanner + indexer + public API + replay tests (reproducibility evidence).
3. Single-fee-collector integration with pre-signature fee/receiver disclosure.
4. README + architecture diagram + 2–3 min demo video.
5. `AUDIT_REPORT.md` + declaration-collision guard tests.
6. Public GitHub repositories (MIT, with commit history/releases/OpenAPI docs).

## 6. Milestones (~18 weeks)
- **M1 (wk 1–2) · Data service v1**: Block Scanner + SQLite + /healthz + replay tests. Acceptance: catch-up scan ≤5 min behind; replay matches on-chain sampling.
- **M2 (wk 3–5) · Whale tracker + large-tx feed**. Acceptance: large-tx latency <2 min; top-100 holders queryable.
- **M3 (wk 6–9) · New-contract radar + contract safety check**. Acceptance: new contracts listed <10 min; 6-check report complete.
- **M4 (wk 10–13) · Governance dashboard + validator transparency + chain overview**. Acceptance: voting-rate trend within <1% of on-chain sampling.
- **M5 (wk 14–18) · Public API docs + weekly-report automation + SDK self-hosting & SRI**. Acceptance: OpenAPI published; weekly report auto-generated.
- Throughout: weekly releases, monthly fund-usage reports (on-chain verifiable).

## 7. Budget Breakdown (final · 256,000 PAXI)
| Item | Amount (PAXI) | Share | Notes |
|------|--------------|-------|-------|
| Delivered v1 (20 tools) | 120,000 | 47% | Security audit, ongoing maintenance, official integration, docs & i18n, long-term availability |
| New features | 100,000 | 39% | Data service ~40k + front-end data apps ~45k + testing & security ~15k |
| Operations | 36,000 | 14% | Scanner VPS 12 months + weekly/monthly report content ops + community + contingency |
| **Total** | **256,000** | 100% | |

## 8. KPIs
- ≥ **500** monthly active wallets;
- ≥ **3,000** tool invocations / month;
- ≥ **1,500** on-chain transactions initiated via the toolkit / month;
- Governance proposal/voting participation **+20%** vs. launch baseline;
- Data layer: ≥ **2,000** monthly visits across whale/feed/dashboards; **3+** monthly fund-usage reports (on-chain verifiable).

## 9. Risks & Mitigation
- **Key/fund safety**: non-custodial architecture, signing inside the wallet (audit-confirmed, no keys stored).
- **Data trustworthiness**: read-only indexing + full replay scripts — anyone can reproduce; official takeover-ready.
- **Service continuity**: single VPS + PM2 + health-check alerts; the front end degrades to direct LCD queries, so tool core functions survive data-service outages.
- **Compliance**: whale ranks / safety checks / yield simulations are data presentation with disclaimers; zero TKCC; no prize pools.
- **Claim consistency**: the scanner is a disclosed read-only component (pump-watch precedent); the non-custodial promise is unchanged.

## 10. Decided Positions
1. **Service fees (Decision A — retained)**: all fees flow to the single transparent address. Wording: *"Service fees are part of the sustainable operating model; DAO funding buys the public goods that fees cannot justify — the data layer, governance tooling, official integration, documentation. Neither replaces the other."*
2. **Data service layer (fully disclosed)**: the Block Scanner is an open, read-only, takeover-ready component; its costs are budgeted under operations; non-custodial, holds no keys.
3. **Collector address**: `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` is the applicant-operated treasury — on-chain verifiable, monthly flow disclosure; DAO grant funds are managed at the same address.
4. **Materials**: audit report ✅ · architecture doc ✅ · roadmap ✅ · LICENSE ✅ · bilingual proposal ✅; TODO: architecture diagram, demo video.

## 11. Transparency Declaration
> **Service fees are transparently disclosed; no prize pools; contracts hold no user funds; no tool touches TKCC.** 100% of tool service fees go to the single address `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` — on-chain verifiable, no intermediary accounts, no diversion. DAO grant funds are managed at the same address with monthly public flow reports. The data service layer is read-only, open-source, and takeover-ready.

## 12. Roadmap (see `ROADMAP.md` and `ARCHITECTURE_256K.md`)
- **Phase 1 (data foundation)**: scanner v1 → whale tracker + large-tx feed.
- **Phase 2 (safety & governance)**: contract radar + safety check → governance dashboard + validator transparency + chain overview.
- **Phase 3 (public goods)**: public API documentation, weekly-report automation, SDK self-hosting.
- 2–4 items per period with monthly releases; future directions (deeper governance analytics, validator tooling, API ecosystem) each have trigger conditions and will be submitted separately — **deliberately not part of this request**.
