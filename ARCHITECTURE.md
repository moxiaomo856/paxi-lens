# Paxi Lens · 360k 资助版完整架构与开发建议

> 申请额度：**360,000 PAXI**（工具开发 320,000 + 后期维护 3 个月 20,000 + 新增大地址交易追踪 20,000）
> 定位升级：从「工具集」→ **「Paxi 链上数据层 + 非托管工具集」**
> 本文档：完整架构 / 数据流 / 新功能规格 / 仓库结构 / 安全合规边界 / 成本模型 / 分步开发计划

---

## 1. 架构总览（三层）

```
┌─────────────────────────────────────────────────────────────┐
│  用户层：手机 PaxiHub App 内置浏览器 / 桌面浏览器（深链跳 App）│
└───────────────────────────┬─────────────────────────────────┘
                            │ window.paxihub（仅签名） / HTTPS（只读）
┌───────────────────────────▼─────────────────────────────────┐
│  前端层  paxi-suite（GitHub Pages，纯静态，MIT 开源）         │
│  · 20 个已上线工具（签名类：本地构造 SignDoc → 钱包签名）      │
│  · 新增数据页：大户追踪 / 大额交易流 / 新合约雷达 /           │
│    合约体检 / 治理看板 / 验证者透明                           │
│  · 数据优先读「数据服务 API」，降级直连 LCD                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS（公开只读 API + 限流）
┌───────────────────────────▼─────────────────────────────────┐
│  数据服务层  paxi-data（Cloudflare Worker + D1，开源可接管）   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 聚合快照同步 │→ │ D1 索引      │→ │ Public REST API  │  │
│  │ Cron 每小时  │  │ 提案/验证人  │  │ /api/v1/* 只读   │  │
│  │ 一次(整点)   │  │ 签核/供应量  │  │ OpenAPI 文档     │  │
│  │ LCD 聚合端点 │  │ 快照表       │  │ 限流+CORS 开放   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  原则：只读、不持私钥、不托管资金、数据可复现、可被官方接管     │
└───────────────────────────┬─────────────────────────────────┘
                            │ LCD/RPC 只读
┌───────────────────────────▼─────────────────────────────────┐
│  Paxi 链（Cosmos SDK + CosmWasm + 原生 Swap + DAO + IBC）    │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据服务层规格（聚合快照层 · Cloudflare Workers + D1）

> **设计依据（2026-10-28 主网实测）**：本链约 **807 块/小时**（1000 块 ≈ 74 分钟），但抽样 22 个区块 + RPC `block_results` 交叉验证，**块内交易数全为 0**（`data.txs: []` / `txs_results: null`）——链近期处于静默期。同时实测确认：主网 LCD 的 `blocks?pagination` 与 `cosmwasm/wasm/v1/contracts` 未实现、`txs?query=tx.height>=X` 返回 502，而**治理、验证人、签核、供应量、denom 元数据等聚合端点均可用且单次返回全量**。
>
> 因此数据层不采用「逐块扫链」，而采用**聚合快照模式**：一次请求取全量 → 写入 D1 → 每小时增量同步。这是当前链状态下唯一既准确、又能在 Cloudflare 免费额度内稳定运行的方案。

### 2.1 数据源（全部为已实测可用的主网 LCD 端点）
| 快照对象 | 端点 | 单次返回 | 用途 |
|---------|------|---------|------|
| 治理提案 | `/cosmos/gov/v1/proposals`（分页） | 全量（当前 13 条） | 治理看板、提案列表 |
| 提案计票 | `/cosmos/gov/v1/proposals/{id}/tally` | 单提案 | 投票率、通过率 |
| 验证人 | `/cosmos/staking/v1beta1/validators` | 全量（100+） | 验证者透明 |
| 签核/漏块 | `/cosmos/slashing/v1beta1/signing_infos` | 全量（100+） | 漏块历史、佣金变化 |
| 总供应量 | `/cosmos/bank/v1beta1/supply` | 全量 | 数据总览 |
| denom 元数据 | `/cosmos/bank/v1beta1/denoms_metadata` | 全量 | 代币列表、精度 |
| 地址余额 | `/cosmos/bank/v1beta1/balances/{addr}` | 单地址 | 大户榜、地址档案 |

- **零逐块扫描**：不依赖 `blocks` 分页端点，也不依赖已失效的 tx 索引查询，规避了 LCD 侧未实现/502 的风险。
- **增量而非全量重扫**：以 `last_synced_height` / `last_synced_at` 为水位线，每轮只取变化部分（提案按 id 比对、签核按 missed_blocks_counter 变化检测）。

### 2.2 D1 存储（Cloudflare 托管 SQLite）
- `proposals(id, title, status, submit_time, deposit_end_time, voting_end_time, final_tally, synced_at)`
- `validators(operator_address, moniker, status, jailed, tokens, commission, voting_power, synced_at)`
- `signing_infos(address, start_height, missed_blocks_counter, jailed_until, tombstoned, synced_at)`
- `supply(denom, amount, synced_at)`、`denom_metadata(base, display, symbol, exponent, synced_at)`
- `balances_snapshot(addr, denom, amount, date)`（大户榜与组合仪表盘历史）
- `sync_state(key, value)`（水位线、最后成功时间、错误计数）

### 2.3 Public REST API（只读、免费、限流）
| 端点 | 内容 | 前端用途 |
|------|------|---------|
| `GET /api/v1/governance/proposals` | 提案列表 + 计票 | 治理看板 |
| `GET /api/v1/governance/stats` | 投票率/提案统计 | 治理看板 |
| `GET /api/v1/validators` | 验证人全量 + 签核状态 | 验证者透明页 |
| `GET /api/v1/validators/{addr}/stats` | 漏块/投票记录 | 验证者透明页 |
| `GET /api/v1/whales/top?denom=upaxi&limit=100` | 大户榜 | 大户追踪页 |
| `GET /api/v1/address/{addr}/balance` | 余额构成 | 地址档案 |
| `GET /api/v1/stats/overview` | 全链总览 | 数据总览仪表盘 |
| `GET /healthz` | 数据层健康状态 | 状态页 |
- 规范：限流 60 次/分/IP、CORS `*`（生态复用）、OpenAPI 3 文档。
- **前端降级**：所有数据页均可直连 LCD 取数，数据层不可用时功能不中断。

### 2.4 部署与成本（Cloudflare · 近乎零成本）
- **形态**：Cloudflare Workers（静态资源 + API 同一 Worker）+ D1 托管 SQLite + Cron Trigger。
- **触发频率**：Cron **每小时整点一次**（链不活跃，无需分钟级；避免无谓的 LCD 请求与限流风险）。
- **成本**：Workers Paid $5/月（含 1000 万次请求/月与 3000 万 CPU-ms）；D1 免费额度为每日 500 万行读 / 10 万行写 / 5GB 存储，本场景快照写入量远低于此。
- **与既有部署一致**：与线上 Paxi Lens（`paxi-lens.paxicoin.workers.dev`）同账号同平台，无需额外服务器与域名。
- 运营服务成本因此大幅下降，运营预算大头是内容与社区（见 §6）。

### 2.5 可复现性
- 快照层每次同步记录 `synced_at` 与水位线，任何人可按同一端点、同一参数独立复现某一时点的快照——DAO 评审最看重的“数据可信”证据。
- 提供 `RESYNC=1` 全量重建模式，可从零重建 D1 快照表。

## 3. 新增功能规格（100k 中的开发部分）

### 3.1 大户追踪（Whale Tracker）— 数据层门面
- **全网大户榜**：Top 持有（upaxi + 各 PRC-20，池 reserve 计价）；集中度指标（Top10/Top50 占比）。
- **收藏夹追踪**（纯前端，无需登录）：用户收藏任意地址 → 余额/活动变化提醒（页面打开期内轮询 + Notification API，**不做后端推送**）。
- **地址档案页**：余额构成、近期活动时间线（API /address/timeline）、首次/最近活跃。

### 3.2 大额交易实时流（Large Tx Feed）
- 阈值可配（默认 ≥100,000 PAXI 或 ≥ 池深度 5% 的 swap）；Web 页面 30s 轮询 + 手动刷新。
- 类型标签：大额转账 / 大额 swap / 池子进出 / 新币部署。
- 分享卡片（截图友好）——传播性设计，社区自然转发。

### 3.3 新合约雷达 + 合约体检（Token Sniffer 式安全公共品）
- **雷达**：按 code_id 轮询新增合约（code_id/label/创建者/时间），一键送检。
- **体检报告**（复用解码器 probeSchema 实测能力 + LP 数据）：
  - 铸造权是否已撤销（minter=null）、admin 是否放弃、是否可增发
  - 流动性池是否存在/深度（防假币貔貅）
  - 持仓集中度（Top5 占比）、总供应量
  - 输出「安全评分」+ 风险项清单（**只做数据呈现，不做投资建议**——合规红线）

### 3.4 治理参与度看板（DAO 最愿听）
- 全链投票率趋势、提案通过率、平均参与人数；**16 个验证者投票行为对比**（谁在投票、谁在缺席）。
- 治理参与周报数据源（自动化喂给内容运营）。

### 3.5 验证者透明化套件
- uptime/漏块历史（每小时快照记录 signing_infos）、佣金变化时间线、委托流入/流出榜。
- 委托人收益模拟器（净 APR = 奖励 − 佣金）。

### 3.6 数据总览仪表盘
- 流通/锁定/解锁（circulating_supply/locked_vesting/unlock_schedules）+ 质押率 + 池深度 + 燃烧总量——一页看完，日活锚点。

## 4. 仓库结构（新增独立仓库，MIT）

```
paxi-data/                 # 新增：聚合数据层（Cloudflare Worker + D1，开源）
  src/sync.js               # Cron 定时同步（每小时整点，增量）
  src/sources.js            # LCD 聚合端点适配（治理/验证人/签核/供应量）
  src/indexer.js            # 快照落库
  src/api.js                # 公开 REST API
  src/db.js                 # D1 schema + 迁移
  test/                     # 重放校验测试（可复现性证据）
  docs/openapi.yaml         # API 文档
  deploy/                   # wrangler.toml + Cron 触发器配置
paxi-suite/                # 现有：前端（GitHub Pages）
  appjs/tools/whale-tracker.js   # 新
  appjs/tools/large-tx.js        # 新
  appjs/tools/contract-radar.js  # 新
  appjs/tools/contract-check.js  # 新（合约体检）
  appjs/tools/governance-dash.js # 新
  appjs/tools/validator-suite.js # 新
```

## 5. 安全与合规边界（写入提案）
1. **只读**：数据服务只调 LCD/RPC 只读端点，永不接触签名/私钥/资金。
2. **可接管**：全量开源 + 重放脚本，官方可一键接管运行。
3. **不托管**：与工具集一致的“无托管”承诺，仅多一项公开披露的只读数据服务（pump-watch 先例）。
4. **无奖池、无资金托管**：新功能全部 PAXI/PRC-20 计价，合约不持有用户资金。
5. **免责**：大户榜/体检/收益模拟均为数据呈现，附“不构成投资建议”。

## 6. 下一步开发建议（分 5 期，总约 16–18 周）

| 期 | 周次 | 内容 | 验收标准 |
|----|------|------|---------|
| P0 | 1–2 | 聚合数据层 v1：Cloudflare Worker + D1 + Cron 每小时同步 + /healthz + 重放校验 | 快照覆盖率与链上抽样一致；Cron 每小时成功率 ≥99% |
| P1 | 3–5 | 大户追踪 + 大额交易流（前端+API） | 大额 tx 延迟 <2 分钟；大户榜 Top100 可查 |
| P2 | 6–9 | 新合约雷达 + 合约体检 | 新合约 10 分钟内上榜；体检 6 项指标全出 |
| P3 | 10–13 | 治理看板 + 验证者透明 + 数据总览 | 投票率趋势与链上抽样误差 <1% |
| P4 | 14–18 | 公共 API 文档化、周报自动化、监控告警、SRI 本地化 | OpenAPI 发布；周报自动生成草稿 |

**每周节奏**：小步 release（前端 Pages 自动部署）；每月一次数据周报（治理动态/池深度/大户异动），同时作为 DAO 月报素材。

## 7. 预算映射（360k）
| 科目 | 金额 | 对应 |
|------|------|------|
| **工具开发资助** | 320,000 | 全套工具持续开发与迭代：v1 官方接入与维护 / 6 语国际化 / 数据服务层地基 / 测试安全加固 / 社区内容 / 钱包收录适配 |
| **后期维护（3 个月）** | 20,000 | Cloudflare Workers + D1 数据层运行成本 + 月报 + 社区 + 应急 |
| **新增：大地址交易追踪** | 20,000 | 大户榜 + 大额交易流 + 链上数据看板（单列确保落地） |
| **合计** | **360,000** | 工具开发 320,000 + 维护 20,000 + 大地址追踪 20,000 |
