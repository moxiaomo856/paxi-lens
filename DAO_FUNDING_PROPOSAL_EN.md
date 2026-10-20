# Paxi Pro Suite · Official DAO Funding Proposal

> Purpose: Apply to the Paxi DAO community pool for **150,000 PAXI (~3% of the pool)**, released in two phases.
> Status: **Final draft** — fee stance, budget split and KPI baselines are decided (see §10).
> Supporting materials: `AUDIT_REPORT.md` (security & compliance audit), `LICENSE` (MIT), `DAO_FUNDING_PROPOSAL.md` (Chinese version).

---

## 1. Title
**Paxi Pro Suite — A One-Stop Non-Custodial On-Chain Toolkit. Applying for 150,000 PAXI from the Paxi DAO Community Pool (90k launch & operations + 60k maintenance after 3 months)**

## 2. Abstract
Paxi Pro Suite is a **pure front-end, non-custodial** toolkit for the Paxi ecosystem covering 18 tools — tx decoding, token issuance (PRC-20/721), burning, redelegation, governance proposals/voting, delegation, batch transfers, IBC queries, tx dry-run and more. **Private keys and funds never leave the user's wallet.** We request 150,000 PAXI in two phases to support official integration and ongoing maintenance. All tool service fees go 100% to a single transparent address `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd`; **no prize pools, contracts hold no user funds, and no tool touches TKCC**.

## 3. Problem Statement
- New users lack a **unified, trustworthy, non-custodial** entry point for Paxi; governance participation is fragmented and there are no Chinese-friendly tools.
- Existing third-party tools are custodial or semi-custodial, creating key/fund risk. There is no officially auditable toolkit with transparent fee handling and localization.

## 4. Solution & Tool Matrix
| Category | Tools |
|----------|-------|
| Staking & Governance | Claim rewards / auto-compound, Delegate & Undelegate (unbonding countdown), Governance voting, Redelegate, Validator comparison, Proposal submission/withdrawal |
| Assets & Query | Balance check, My NFTs, Address book, IBC channel/denom query |
| Trade & Issuance | Batch transfer, Custom token issuance (PRC-20/721, auto-revokes minter after deploy), Token burning, NFT launcher & minting |
| Decoder & Tools | On-chain decoder, Tx dry-run simulation, Gas calculator, Address converter |

> Compliance exclusions (deliberately not shipped): NFT marketplace (Authz authorization risk), mini-games.

## 5. Deliverables
1. Deployable pure front-end dApp (18 tools + zh/en i18n + categorized, searchable home).
2. Single-fee-collector integration with pre-signature fee/receiver disclosure.
3. README + architecture diagram + 2–3 min demo video.
4. `AUDIT_REPORT.md` (multi-expert security & compliance audit) + declaration-collision guard tests.
5. Public GitHub repository (MIT license, with commit history and releases).

## 6. Two-Phase Milestones (90k + 60k)
- **Phase 1 — Launch & Operations Grant: 90,000 PAXI**
  Official integration + mainnet deployment + all tools live + i18n completion + demo video + audit report submission + public repository.
- **Phase 2 — Maintenance Grant: 60,000 PAXI** (released 3 months after launch, conditional on Phase 1 KPIs)
  Ongoing maintenance/bug fixes + ≥ 2 new governance tools + monthly fund-usage disclosures.

## 7. Budget Breakdown (final)
| Phase | Item | Amount (PAXI) | Share |
|-------|------|--------------|-------|
| Phase 1 | Development & official integration | 40,000 | 44% |
| Phase 1 | Security audit & remediation | 15,000 | 17% |
| Phase 1 | Operations (domain / hosting / pump-watch cloud monitor) | 15,000 | 17% |
| Phase 1 | Community docs / demo video / branding | 10,000 | 11% |
| Phase 1 | Contingency reserve | 10,000 | 11% |
| **Phase 1 subtotal** | | **90,000** | **60%** |
| Phase 2 | Ongoing maintenance & bug fixes | 30,000 | 20% |
| Phase 2 | Development of ≥ 2 new governance tools | 15,000 | 10% |
| Phase 2 | Monthly fund reports & community operations | 10,000 | 7% |
| Phase 2 | Contingency reserve | 5,000 | 3% |
| **Phase 2 subtotal** | | **60,000** | **40%** |
| **Total** | | **150,000** | **100%** |

## 8. KPIs (baseline targets)
- **≥ 500** monthly active wallets (by end of Phase 1);
- **≥ 3,000** tool invocations / month;
- **≥ 1,500** on-chain transactions initiated via the toolkit / month;
- Governance proposal/voting participation **+20%** vs. launch baseline;
- **3** monthly fund-usage reports during Phase 2 (on-chain verifiable, same-address disclosure).

## 9. Risks & Mitigation
- **Key/fund safety**: non-custodial architecture; signing happens inside the wallet (verified in audit — no keys stored or uploaded).
- **SDK replacement risk**: the official SDK is loaded from a domain; will be self-hosted with SRI (planned).
- **Operational continuity**: single collector address + Phase 2 KPI gate ensure sustained maintenance.
- **Consistency of claims**: see §10 — fee stance and pump-watch component are fully disclosed to avoid any perception of concealment.

## 10. Decided Positions (fee stance & disclosure)
1. **Service fees (Decision A — retained)**: existing fees stay (issuance 25/50 PAXI, redelegation 0.15%, batch transfer per-address, NFT minting 5 PAXI/batch), all flowing to the single transparent address. Wording: *"Service fees are part of the project's sustainable operating model; DAO funding accelerates official integration and public-goods tooling. Neither replaces the other."*
2. **pump-watch backend (fully disclosed)**: an on-chain monitoring companion for the issuance tool, disclosed transparently and budgeted under Operations (low-cost VPS); read-only, non-custodial.
3. **Collector address ownership**: `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` is the **applicant-operated treasury address** — on-chain verifiable, monthly flow disclosure; DAO grant funds are managed at the same address.
4. **Materials**: `AUDIT_REPORT.md` ✅ · `LICENSE` (MIT) ✅ · this English proposal ✅; TODO: architecture diagram, demo video, public GitHub repository.
5. **Submission**: proofread and publish to the Paxi DAO forum/governance portal; adjust section order to the official template if required.

## 11. Transparency Declaration (compliance highlights)
> **Service fees are transparently disclosed; no prize pools; contracts hold no user funds; no tool touches TKCC.** 100% of tool service fees go to the single address `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` — on-chain verifiable, no intermediary accounts, no diversion. DAO grant funds are managed at the same address with monthly public flow reports.
