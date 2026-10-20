# Paxi Suite × PaxiHub 功能差距分析（行业专家对比）

> 方法：抓取 PaxiHub 官方文档核实其真实能力 → 2 位行业专家并行分析（钱包产品战略 + Cosmos/DeFi 深度工具链）→ 结论收敛。
> 定位原则：**PaxiHub = 大众入口层（钱包+旗舰 dApp）；paxi-suite = 官方 3 个注入 API 之上的"专业+批量+精确"工具层。**

## 一、PaxiHub 实际能力（官方文档核实）
- 注入接口仅 3 个：`getAddress()` / `signMessage()` / `signAndSendTransaction()`（无 signDirect 原生消息、无事件订阅）
- 内置：dApp 浏览器、PAXI/PRC-20/NFT 单笔转账、移动 App（`paxi://hub/explorer?url=` 深链可被拉起）
- 官方旗舰 dApp：Paxi Pick（预测市场）
- **链有原生 AMM Swap 模块但无任何好用的前端**：官方示例滑点保护固定 **50%**（形同虚设）
- ⚠️ 官方文档示例代码自带 `new Uint8Array(sender.public_key)` 公钥 bug（paxi-suite 已修复，可作为向官方提 PR 的协作切入点）

## 二、差距矩阵（专家收敛版）

| 功能 | PaxiHub | paxi-suite | 建议 | 优先级 | 收费兼容 | 工作量 |
|------|---------|-----------|------|--------|---------|--------|
| **Swap 辅助器**（池子查询/报价/价格影响/自定义滑点/MinReceive/allowance 原子打包） | ❌ 无 | ❌ 无 | **补**（吃掉官方 50% 滑点痛点） | **P0** | ✅ 可按笔收费 | 3–4 人日 |
| **深链拉起**（移动端"在 PaxiHub 中打开"+ 桌面二维码） | ✅ 可被拉起 | ❌ 未装钱包时跳死链文档页 | **补**（性价比之王） | **P0** | 免费引流 | 0.5 人日 |
| **Allowance 授权管理**（查询/增/减/归零 revoke） | ❌ 无 | ❌ 仅解码器能看 | **补**（安全刚需，Swap 前置） | **P0** | 免费/可收费 | 2 人日 |
| 签名消息验证器（验签 + SIWP 模板 + 钓鱼注入检测） | ⚠️ 只能签不能验 | ❌ 无 | 补（信任品牌） | P1 | 免费 | 1–2 人日 |
| 组合总览仪表盘（PAXI+PRC-20+NFT+委托+奖励，用池子 reserve 做 PRC-20 计价） | ❌ 无 | ⚠️ 分散各工具 | 补 | P1 | 免费 | 2.5 人日 |
| MsgVoteWeighted 加权投票（如 70/30 拆分） | ❌ 无 | ⚠️ 仅等权 4 选项 | 细化 | P1 | — | 0.5 人日 |
| Feegrant 管理（我补贴了谁/谁补贴我 + 发起/撤销） | ❌ 无 | ⚠️ 仅解码 | 补 | P1 | — | 1.5 人日 |
| Authz 面板（granter/grantee 双视角 + 撤销） | ❌ 无 | ⚠️ 无独立面板 | 补 | P1 | — | 1.5 人日 |
| 委托收益分析器（按验证人净 APR，localStorage 快照积累历史） | ❌ 无 | ⚠️ 仅全网 APR | 补 | P1 | 免费 | 2 人日 |
| 历史/税务 CSV 导出（按地址+时间段拉交易） | ❌ 无 | ⚠️ 仅有零散导出 | 补 | P1 | 免费 | 2 人日 |
| LP 流动性管理（添加/撤除 + LP 份额） | ❌ 无 | ❌ 仅解码 | Swap 二期 | P1 | ✅ 可收费 | 1.5 人日 |
| 多语种扩展（ko/ru/es，结构已模板化） | ✅ 官方多语言 | ⚠️ 仅 zh/en | 细化 | P1 | 免费引流 | 2–3 人日 |
| 移动端响应式（批量转账/余额/解码器三个高频页） | ⚠️ App 内渲染一般 | ⚠️ 桌面优先 | 细化 | P1 | 免费 | 1–2 人日 |
| IBC Transfer 发起 + packet 追踪 | ❌ 仅本链转账 | ❌ ibc-query 纯只读 | P2 观望（通道未启用） | P2 | ✅ | 2 人日 |
| NFT 单件转移 | ✅ 有 | ✅ 批量已覆盖更强 | 只需在"我的 NFT"加单件动作 | P2 | — | 0.5 人日 |
| 官方协作 PR（修文档公钥 bug + 建议增开 signDirect API） | — | ✅ 已有修复经验 | **战略资产**，换官方收录/深链白名单 | P1 | 免费 | 0.5 人日 |

## 三、P0 MVP 要点

**1. Swap 辅助器（唯一有付费潜力的空白）**
- 池查询 `GET /paxi/swap/pool/{contract}` → reserve_paxi/reserve_prc20 **全程 BigInt 字符串运算**；PRC-20 decimals 逐合约读 token_info，勿写死 6。
- 报价（常数积 x·y=k）：`out = reserveOut·in / (reserveIn·10000 + in·feeBps) · 10000`；滑点 0.1%–50% 自定义（默认 1%）；`minReceive = out × (10000 - slipBps) / 10000`，签名前确认框**强制显示"最少到手"**。
- ⚠️ typeUrl 需先对拍：官方示例 `/x.swap.types.MsgSwap` vs decoder-core.js:340 的 `/paxi.swap.v1.MsgSwap` — 用 tx-dryrun 对一笔真实历史 swap 双 typeUrl 验证后再写死；若 UMD 未注册该类型需手写 proto encode。
- PRC-20→PAXI 方向：`[increase_allowance→swap module(paxi1mfru9azs5nua2wxcd4sq64g5nt7nn4n80r745t), MsgSwap]` 同 Tx 原子打包，复用 `buildSignAndBroadcast`；PAXI→PRC-20 直接 MsgSwap。
- 池子发现：LCD 无池列表接口 → localStorage 白名单 + 粘贴地址手动添加。收费模式与批量转账一致（固定笔费入单地址）。

**2. 深链接入（0.5 人日）**
- 改造 `checkWalletInjection` 失败分支：移动 UA → "🚀 在 PaxiHub App 中打开"按钮（`paxi://hub/explorer?url=<encodeURIComponent(location.href)>`）；桌面 → canvas 二维码；文档跳转降为二级选项；支持 `?deep=1` 强制展示。

**3. Allowance 管理（2 人日）**
- 查询 `smart/{btoa({allowance:{owner,spender}})}`；revoke = decrease 至当前额度归零；spender 白名单含 swap module 与 NFT 市场 grant 地址。

## 四、明确不做（专家共识）
| 功能 | 理由 |
|------|------|
| 钱包本体 / 助记词管理 / 内置浏览器 | 与官方正面冲突，违背非托管定位 |
| 预测市场 / 通用交易界面复刻 | 与 Paxi Pick 冲突 / 无差异化 |
| 限价单 / DCA 条件单 | 原生 AMM 无订单簿，纯前端关页即失效，做成需后端+托管，违反硬约束 |
| 前端自建多签 | PaxiHub `signAndSendTransaction` 只回单签，无法分签；等官方出多签接口再接 |
| 交易推送通知 | 需后端常驻；pump-watch 已是唯一后台例外，勿扩大 |

## 五、顺手发现（待修）
- `validator-compare.js:69` 用 `Number(allSum)` 转全网质押 BigInt，总量增长后有精度溢出风险 → 改 `Number(allSum / 1000000n)`。

## 六、战略一句话
官方做"钱包 + 旗舰 dApp"，paxi-suite 做官方 3 个 API 之上官方自己没做好的"专业 + 批量 + 精确"层。**Swap 辅助器是唯一有付费潜力的空白；深链接入是零成本用户回流管道；给官方提公钥 bug PR 是通往生态联合与 DAO 申报背书的门票。**
