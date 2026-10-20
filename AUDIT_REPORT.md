# Paxi Suite · 安全合规审计报告（2026-10-20）

> 审计范围：纯前端 dApp 工具集 `paxi-suite/`（18 个工具 + pump-watch 监控后台）
> 审计方式：5 个领域专家并行只读审计（合规 / 安全 / 产品UX / Cosmos工具链 / DAO资助就绪）+ 本期修复落地
> 审计结论：**四条合规硬约束已满足；发现 3 项致命功能缺陷（已修复）+ 若干中低风险项（部分已修复，部分待拍板）**

---

## 一、合规硬约束核对（DAO 申报核心卖点）

| 硬约束 | 状态 | 说明 |
|--------|------|------|
| ① 零 TKCC 触碰 | ✅ 满足 | 全仓无 TKCC 计价/转账/质押/投票交互；新工具一律 PAXI 计价 |
| ② 单一收款地址 | ✅ 满足 | 所有服务费进入 `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd`（CONFIG.feeCollector）；已合并 pump-watch 后台 |
| ③ 服务费措辞统一 | ✅ 满足 | "手续费"仅出现在解码器 gas 展示（官方 gas 例外），其余一律"服务费" |
| ④ 无资金托管 | ✅ 满足 | 无私钥/助记词落盘或上传；签名全部在 `window.paxihub` 钱包内完成，dApp 仅本地构造并广播 |
| ⑤ 收费透明 | ⚠️ 基本满足 | 多数工具签名前 `confirm()` 明示金额+代币+收款地址；**NFT 批量铸造此前缺失**（已修复） |

---

## 二、本期已修复（关键缺陷 + 合规/安全）

### 🔴 致命功能缺陷（原为 100% 上链失败 / 资金风险）
1. **治理投票 MsgVote.option 用了字符串** → 被编码为 `0`(UNSPECIFIED)，投票必被链拒绝。
   → 改为数字枚举 `{YES:1, ABSTAIN:2, NO:3, NO_WITH_VETO:4}`，`proposal_id` 改 `BigInt`。（`gov-vote.js`）
2. **燃烧/发币公钥未解码** → `new Uint8Array(public_key)` 把 base64 字符串当字节，签名验签失败。
   → 改为 `fromBase64(public_key)`（paxihub 路径）。（`burn.js`、`pump.js`）
3. **交易模拟 Mode A 的 Any.value 未 encode** → 模拟功能失效/返回 0 gas。
   → 改为 `PaxiCosmJS.MsgSend.encode(msg).finish()`。（`tx-dryrun.js`）

### 🟠 合规 / 安全 / 正确性
4. **NFT 批量铸造 5 PAXI 服务费**：签名前无强制确认且**不展示收款地址** → 已加 `confirm()` 显金额+收款地址。（`nft-launcher.js`）
5. **NFT 铸造硬编码错误备用收款地址** → 改为官方 `CONFIG.feeCollector`。（`nft-launcher.js`）
6. **发币免责声明缺失证券/归零/流动性/未审计风险** → 已补四类风险提示。（`pump.js`）
7. **燃烧 gas 0.05 vs 全局 0.25 不一致**（可能导致 insufficient fee）→ 改为从 `SHARED_CONFIG.gasPrice` 派生。（`burn.js`）
8. **"假成功"误判** → 治理投票 `pollTxStatus` 改为 `await` 并据真实 DeliverTx 结果分支。（`gov-vote.js`）
9. **验证人列表无分页** → 补全 `next_key` 翻页，避免漏节点导致统计失真。（`validator-compare.js`）
10. **链错误未走友好映射 / XSS 转义** → 燃烧失败改 `mapError`；质押加载 `e.message` 加 `escapeHtml`。（`burn.js`、`stake-manage.js`）

### 🟢 验证结果
- 7 个改动文件 `node --check` 全部通过
- `check-decls.js`：272 顶层声明零冲突
- 拼接多脚本作用域 `--check`：通过（无重复声明）

---

## 三、待拍板 / 待后续（未在本期改动）

| 级别 | 项 | 建议 |
|------|----|----|
| 需拍板 | 治理提案是否实际收费（当前 `submitFee=0`，注释误写 50） | 明确口径，避免误导 |
| 需拍板 | 游戏"pay 5 PAXI"死代码（index.html 已注释脚本） | 暂不实现，或实现时务必路由 `feeCollector` 并披露 |
| 需拍板 | burn.js 是否复用 `shared.buildSignAndBroadcast`（统一 gas 模拟） | 建议复用 |
| 待优化 | **burn.js / decoder.js 完全无 i18n**（英文环境全中文） | 提取字典，建议作为下一轮专门任务 |
| 待优化 | stake-manage / gov-vote 签名期间按钮未禁用（双击双花风险） | 加 `btn.disabled` + `finally` 恢复 |
| 待优化 | claim-rewards 复投金额浮点截断、redelegate/stake 浮点换微单位 | 统一 `parseFloatToRawUnits` |
| 待优化 | IBC denom "解析"返回的是 IBC 路径非可读 symbol | 可补 bank denom metadata 查询 |
| 待优化 | pump.js ImgBB API Key 明文在前端 | 迁后端代理/用户自填 |

---

## 四、DAO 申报就绪度（详见 DAO_FUNDING_PROPOSAL.md）
- 非托管、单一收款、零 TKCC、透明计费 —— 已具备硬指标优势。
- **待补 P0**：`LICENSE`（MIT）、正式审计报告（即本文件）、澄清"无用户费用 vs 收取服务费"与"纯前端 vs pump-watch 后台"两处声明矛盾。
- **待补 P1**：架构图、路线图、KPI、演示视频、公开 git 仓库。
