# Paxi Lens · 360k 资助版完整架构与开发建议

> 申请额度：**360,000 PAXI**（开发 342,000 + 运营 18,000 / 6 个月）
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
│  数据服务层  paxi-data（新增，Node 单服务，开源可接管）        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Block Scanner│→ │ SQLite 索引  │→ │ Public REST API  │  │
│  │ 增量扫块      │  │ 事件/余额/提案│  │ /api/v1/* 只读   │  │
│  │ (pump-watch  │  │ 快照表        │  │ OpenAPI 文档     │  │
│  │  同款架构)    │  │              │  │ 限流+CORS 开放   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  原则：只读、不持私钥、不托管资金、数据可复现、可被官方接管     │
└───────────────────────────┬─────────────────────────────────┘
                            │ LCD/RPC 只读
┌───────────────────────────▼─────────────────────────────────┐
│  Paxi 链（Cosmos SDK + CosmWasm + 原生 Swap + DAO + IBC）    │
└─────────────────────────────────────────────────────────────┘
```

## 2. 数据服务层规格（100k 中的服务端部分）

### 2.1 Block Scanner（复用 pump-watch 验证过的架构）
- **增量扫描**：记录 last_height，每轮从 last+1 扫到 latest（LCD `/cosmos/tx/v1beta1/txs/block/{height}` 官方端点，CLI 指令 §2.2）；停机用 MAX_BLOCKS_PER_RUN 兜底；并发 6 抓取。
- **事件提取**（每笔 tx 解析入 SQLite）：
  | 事件 | 来源消息 | 用途 |
  |------|---------|------|
  | transfer | MsgSend/MultiSend | 大户追踪、大额交易流、地址时间线 |
  | swap | /x.swap.types.MsgSwap、ProvideLiquidity、WithdrawLiquidity | 大额 swap 警报、池深度变化 |
  | instantiate | MsgInstantiateContract2 | 新合约雷达 |
  | burn / mint | wasm execute 解码 | 燃烧统计、新币发行监测 |
  | vote / deposit / submit | gov 消息 | 治理看板、验证者投票行为 |
  | delegate/undelegate/redelegate | staking 消息 | 验证者委托流 |
- **可复现性**：全量重放模式（`RESCAN=1`）可从高度 0 重建索引——DAO 评审最看重的“数据可信”证据。

### 2.2 SQLite 索引（轻量起步，单 VPS 够用）
- `blocks(height, ts)`、`txs(hash, height, code, ts, memo)`
- `transfers(tx_hash, from, to, denom, amount)`（denom+amount 全字符串）
- `swaps(tx_hash, prc20, offer_denom, offer_amount, min_receive, creator)`
- `contracts(addr, code_id, label, creator, created_height)`（新合约雷达）
- `proposals/votes/validators`（治理看板；votes 表沉淀历史）
- 每日快照表 `balances_snapshot(addr, denom, amount, date)`（大户榜、组合仪表盘历史）

### 2.3 Public REST API（只读、免费、限流）
| 端点 | 内容 | 前端用途 |
|------|------|---------|
| `GET /api/v1/txs/large?min=1000000000&limit=50` | 大额交易流 | 大额交易 Feed 页 |
| `GET /api/v1/whales/top?denom=upaxi&limit=100` | 大户榜 | 大户追踪页 |
| `GET /api/v1/address/{addr}/timeline` | 地址活动时间线 | 地址档案（解码器升级） |
| `GET /api/v1/contracts/new?limit=50` | 新上线合约 | 新合约雷达 |
| `GET /api/v1/governance/stats` | 投票率/提案统计 | 治理看板 |
| `GET /api/v1/validators/{addr}/stats` | 漏块/委托流/投票记录 | 验证者透明页 |
| `GET /api/v1/stats/overview` | 全链总览 | 数据总览仪表盘 |
- 规范：限流 60 次/分/IP、CORS `*`（生态复用）、OpenAPI 3 文档、状态页 `/healthz`。

### 2.4 部署与成本（计入 36k 运营）
- 单 VPS（2C4G，~$12/月）+ 域名（~$10/年）；Node + PM2 + SQLite + Nginx 反代。
- 与既有 pump-watch 同架构同机器可合并部署，边际成本极低。
- 6 个月运营服务成本合计约 **$80–100 ≈ 600–750 PAXI 量级**（按现价），运营预算大头是内容与社区（见 §6）。

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
- **雷达**：scanner 发现 instantiate 即入榜（code_id/label/创建者/时间），一键送检。
- **体检报告**（复用解码器 probeSchema 实测能力 + LP 数据）：
  - 铸造权是否已撤销（minter=null）、admin 是否放弃、是否可增发
  - 流动性池是否存在/深度（防假币貔貅）
  - 持仓集中度（Top5 占比）、总供应量
  - 输出「安全评分」+ 风险项清单（**只做数据呈现，不做投资建议**——合规红线）

### 3.4 治理参与度看板（DAO 最愿听）
- 全链投票率趋势、提案通过率、平均参与人数；**16 个验证者投票行为对比**（谁在投票、谁在缺席）。
- 治理参与周报数据源（自动化喂给内容运营）。

### 3.5 验证者透明化套件
- uptime/漏块历史（scanner 记录 signing_infos 轮询）、佣金变化时间线、委托流入/流出榜。
- 委托人收益模拟器（净 APR = 奖励 − 佣金）。

### 3.6 数据总览仪表盘
- 流通/锁定/解锁（circulating_supply/locked_vesting/unlock_schedules）+ 质押率 + 池深度 + 燃烧总量——一页看完，日活锚点。

## 4. 仓库结构（新增独立仓库，MIT）

```
paxi-data/                 # 新增：数据服务（Node + SQLite，开源）
  src/scanner.js           # 区块扫描（pump-watch 同款架构）
  src/indexer.js           # 事件提取入库
  src/api.js               # 公开 REST API
  src/db.js                # SQLite schema + 迁移
  test/                    # 重放测试（可复现性证据）
  docs/openapi.yaml        # API 文档
  deploy/                  # PM2 + Nginx 配置
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
3. **不托管**：与工具集一致的“无托管”承诺，仅多一项公开披露的扫描服务（pump-watch 先例）。
4. **零 TKCC**：新功能全部 PAXI/PRC-20 计价，无任何 TKCC 触点。
5. **免责**：大户榜/体检/收益模拟均为数据呈现，附“不构成投资建议”。

## 6. 下一步开发建议（分 5 期，总约 16–18 周）

| 期 | 周次 | 内容 | 验收标准 |
|----|------|------|---------|
| P0 | 1–2 | 扫描服务 v1：SQLite + block scanner + /healthz + 重放测试 | 落后补扫 ≤5 分钟；重放高度 0–N 与链上抽样一致 |
| P1 | 3–5 | 大户追踪 + 大额交易流（前端+API） | 大额 tx 延迟 <2 分钟；大户榜 Top100 可查 |
| P2 | 6–9 | 新合约雷达 + 合约体检 | 新合约 10 分钟内上榜；体检 6 项指标全出 |
| P3 | 10–13 | 治理看板 + 验证者透明 + 数据总览 | 投票率趋势与链上抽样误差 <1% |
| P4 | 14–18 | 公共 API 文档化、周报自动化、监控告警、SRI 本地化 | OpenAPI 发布；周报自动生成草稿 |

**每周节奏**：小步 release（前端 Pages 自动部署）；每月一次数据周报（治理动态/池深度/大户异动），同时作为 DAO 月报素材。

## 7. 预算映射（360k）
| 科目 | 金额 | 对应 |
|------|------|------|
| 开发 · **官方钱包 dApp 收录适配**（新增诉求） | 45,000 | 深链协议规范与实现 / 钱包内嵌浏览器(WebView)兼容改造 / 6 语 dApp 元数据 / 兼容性回归测试 / 收录后版本跟进 |
| 开发 · 已交付 v1 官方接入与维护 | 75,000 | 官方 PR/审计/文档/可用性 |
| 开发 · 多语言国际化（已交付） | 60,000 | 6 语界面（en/ja/ko/id/vi/繁中）+ 6 语法律文档，已上线 |
| 开发 · 数据服务层 | 50,000 | 扫描+索引+API |
| 开发 · 数据应用前端 | 60,000 | 7 个数据应用 |
| 开发 · 测试与安全加固 | 30,000 | SDK 本地化/SRI/守卫/重放 |
| 开发 · 社区与内容运营 | 22,000 | ko/ru/es + 周报月报 |
| 运营服务（6 个月） | 18,000 | VPS 6 个月 + 月报 + 社区 + 应急 |
| **合计** | **360,000** | 开发 342,000 + 运营 18,000 |
