# 代码审查修复报告

## 修复概要

根据代码审查报告，共修复 **4 类 14 项** 问题，新增 `shared.js` 公共模块，涉及 5 个文件。

---

## 1. 严重安全漏洞修复

### 1.1 NFT 市场授权过于宽泛（Authz 滥用风险）
- **修复**: Authz 授权有效期从 1 小时缩短至 **5 分钟**（`grantDurationSec: 300`）
- **修复**: 授权面板新增 **安全风险提示**（醒目黄色警告框）
- **修复**: 提示文案明确告知"按消息类型授权"的风险
- **影响文件**: `shared.js`（配置）、`app.js`（grantNft + 授权UI）

### 1.2 Gas 估算偏差
- **修复**: 新增 `simulateGas()` 函数，通过 LCD `/cosmos/tx/v1beta1/simulate` 进行 Gas 模拟
- **修复**: `buildSignAndBroadcast` 按消息类型分别估算 Gas（MsgSend 90K, MsgExecuteContract 250K, MsgInstantiateContract 500K, MsgGrant 120K, MsgExec 300K, MsgRevoke 100K）
- **修复**: 模拟成功时加 20% 缓冲，失败时降级为按类型估算
- **影响文件**: `shared.js`

### 1.3 前端 XSS 防护不彻底
- **修复**: 新增 `sanitizeUrl()` 函数，仅允许 `http/https/data:image` 协议
- **修复**: 所有图片 `src` 属性从 `escapeHtml()` 改为 `sanitizeUrl()`，防止 `javascript:` 协议注入
- **修复**: 审计所有 `innerHTML` 拼接点，确保用户输入和链上返回数据均经过转义
- **影响文件**: `shared.js`、`app.js`

### 1.4 图片 Base64 存储导致 Gas 爆炸
- **修复**: 移除 `coverImageBase64.substring(0, 2000)` 存入链上的做法
- **修复**: 新增 IPFS/Arweave URI 输入框（`nftImageUri`），仅将 URI 存入合约元数据
- **修复**: 本地上传图片仅用于预览，不存入链上
- **修复**: 更新工作原理提示文案
- **影响文件**: `nft-launcher/index.html`

---

## 2. 功能性与逻辑缺陷修复

### 2.1 PRC-20 批量转账金额精度处理
- **修复**: `parseFloatToRawUnits()` 重写为**纯字符串/BigInt 解析**，不再经过 `parseFloat`
- **修复**: 支持科学计数法、任意精度小数位、大数（>2^53）安全转换
- **修复**: 批量转账手续费计算改用 BigInt 运算避免浮点累计误差
- **影响文件**: `shared.js`、`app.js`

### 2.2 NFT 市场上架验证不完整
- **修复**: `listNft()` 新增**重复上架检查** — 同一合约+tokenId 已在售且未过期时拒绝重复上架
- **影响文件**: `app.js`

### 2.3 批量铸造模式判断逻辑不可靠
- **修复**: 新增**手动模式选择器**（自动检测/批量铸造/逐个铸造）
- **修复**: 用户可明确选择模式，不再仅依赖查询成功与否判断执行支持
- **影响文件**: `nft-launcher/index.html`

### 2.4 授权检查缓存不一致
- **修复**: `executeBuy()` 在构建 MsgExec 前已重新调用 `checkGrantStatus()`（确认存在）
- **修复**: 在错误处理中补充更清晰的授权失效提示
- **影响文件**: `app.js`

---

## 3. 代码质量与可维护性改进

### 3.1 重复代码
- **修复**: 新增 `shared.js` 公共模块，提取以下函数：
  - `toBase64` / `fromBase64` / `escapeHtml` / `sanitizeUrl`
  - `parseFloatToRawUnits` / `paxiToUpaxi` / `upaxiToPaxi`
  - `buildSignAndBroadcast` / `checkTxResult` / `simulateGas` / `pollTxStatus`
  - `copyToClipboard` / `showToast` / `showStatus` / `mapError`
  - `fetchAPI` / `cleanupLocalStorage` / `renderNetworkSelector`
- **修复**: `app.js` 和 `nft-launcher/index.html` 均引用 `shared.js`，删除各自的重复实现
- **影响文件**: `shared.js`（新增）、`app.js`、`nft-launcher/index.html`、`index.html`

### 3.2 compat.js 未覆盖所有消息类型
- **修复**: 新增 `MsgUpdateAdmin` 编码器
- **修复**: 新增 `MsgMigrateContract` 编码器
- **影响文件**: `compat.js`

### 3.3 硬编码的 RPC/LCD 地址
- **修复**: `shared.js` 新增 `NETWORKS` 配置对象（主网 + 测试网）
- **修复**: 所有地址通过 `getLCD()` / `getNetworkConfig()` 动态获取
- **修复**: 两个页面 header 新增**网络选择器**下拉框
- **影响文件**: `shared.js`、`app.js`、`nft-launcher/index.html`、`index.html`

### 3.4 localStorage 存储敏感信息
- **修复**: 新增 `cleanupLocalStorage()` 函数，页面加载时自动清理
- **修复**: 30 天前过期数据自动清除
- **修复**: 已清理 initMsg 中的 base64 图片数据
- **影响文件**: `shared.js`

---

## 4. 操作体验与用户反馈改进

### 4.1 缺少交易等待提示
- **修复**: 新增 `pollTxStatus()` 函数，广播后轮询交易是否上链
- **修复**: 所有交易成功后异步轮询，确认后显示"交易已上链确认"
- **修复**: 交易上链但执行失败时也有提示
- **影响文件**: `shared.js`、`app.js`、`nft-launcher/index.html`

### 4.2 错误信息不友好
- **修复**: 新增 `mapError()` 函数，包含错误码映射表 + 关键字模式匹配
- **修复**: 所有 `catch` 和交易失败处理从直接显示 `e.message` 改为 `mapError(code, rawLog)`
- **修复**: 友好化常见错误：余额不足、授权失效、序列号不匹配、Gas不足、用户拒绝等
- **影响文件**: `shared.js`、`app.js`、`nft-launcher/index.html`

---

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `shared.js` | **新增** | 公共模块：网络配置、交易函数、Gas模拟、交易轮询、错误映射、通用工具 |
| `compat.js` | 修改 | 新增 MsgUpdateAdmin / MsgMigrateContract 编码器 |
| `app.js` | 修改 | 移除重复函数、Authz缩短至5分钟、重复上架检查、XSS修复、余额精度修复、Gas动态估算、交易轮询、错误映射 |
| `index.html` | 修改 | 引用 shared.js、新增网络选择器 |
| `nft-launcher/index.html` | 修改 | 移除重复函数、IPFS URI替代Base64、手动铸造模式、Gas动态估算、交易轮询、错误映射、网络选择器 |

## 运行方式

```
python3 -m http.server 8765
# 工具箱: http://localhost:8765
# NFT发射: http://localhost:8765/nft-launcher/
```

## 已知限制
- Authz GenericAuthorization 仍按消息类型授权（非单 NFT 粒度），通过缩短至 5 分钟 + 安全提示缓解
- 纯前端无后端，NFT 市场订单靠分享码点对点传播
- Gas 模拟依赖 LCD /simulate 端点可用性，不可用时降级为按类型估算
