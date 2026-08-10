# Paxi 工具箱 + NFT 发射平台

Paxi Network 生态工具集，纯前端部署，零服务器成本。

## 项目结构

```
paxi-toolbox/
├── index.html              # 工具箱主页（11个工具）
├── app.js                  # 工具箱核心逻辑
├── shared.js               # 公共模块（i18n / 状态 / 通用函数）
├── compat.js               # SDK 兼容层（补充 PaxiCosmJS 缺失的类）
├── nft-launcher/
│   └── index.html          # PRC-721 NFT 发射平台
├── DEPLOY.md               # 超详细部署教程
└── README.md
```

## 工具箱功能

| 功能 | 说明 |
|------|------|
| 📤 批量转账 | PAXI/PRC-20/NFT 批量发送，CSV 导入，1.5% 手续费 |
| 💰 余额查询 | 批量查询多地址余额，导出 CSV |
| 🏪 NFT 市场 | 上架/浏览/购买/授权/导入（Authz 原子交换） |
| 🔍 交易追踪 | 输入 TxHash 查询交易状态 |
| 🎨 NFT 发射 | 独立页面，三步创建 NFT 合集 |
| 🔄 地址转换 | Bech32 地址跨链前缀转换 |
| 🔄 变更质押节点 | 质押从一个验证节点迁移到另一个 |
| ⛽ Gas 计算器 | 估算不同类型交易费用 |
| 🏦 验证节点对比 | 实时节点 APR、佣金率对比 |
| 📊 P2P 买卖市场 | 发布 PAXI 买单/卖单，分享码传播 |
| 📌 后期开发 | 占位提示 |

## NFT 发射平台

- 三步创建 NFT 合集（信息填写 → 上传素材 → 预览部署）
- 支持自定义名称、符号、供应量、版税、Mint 价格
- 图片上传（Base64 存储在链上元数据中）
- 部署时收取 10 PAXI 平台服务费（一次性）
- 批量铸造 NFT（5 PAXI/批 + 合约 Mint 价格）
- 自定义元数据存储（2 PAXI/枚）
- 部署记录本地保存

## 手续费配置

| 功能 | 费率 | 收款地址 |
|------|------|----------|
| 批量转账（PAXI/PRC-20） | 1.5%（以 PAXI 原生代币收取） | `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` |
| 批量转账（NFT） | 0.5 PAXI/笔（固定费率） | `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` |
| NFT 合约部署 | 10 PAXI/次（一次性） | `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` |
| 批量铸造 NFT | 5 PAXI/批 | `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` |
| 自定义元数据存储 | 2 PAXI/枚 | `paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd` |

## 快速部署到 GitHub Pages

```bash
# 1. 在 GitHub 创建新仓库（例如 paxi-toolbox）

# 2. 克隆到本地
git clone https://github.com/你的用户名/paxi-toolbox.git
cd paxi-toolbox

# 3. 复制项目文件到仓库目录
# 把 index.html, app.js, nft-launcher/ 复制进去

# 4. 提交并推送
git add .
git commit -m "Paxi 工具箱 v1.0"
git push origin main

# 5. 开启 GitHub Pages
# 仓库 Settings → Pages → Source: main 分支 → Save
# 等待 1-2 分钟，访问：
# https://你的用户名.github.io/paxi-toolbox/
```

## 技术栈

- 纯 HTML/CSS/JavaScript（无框架依赖）
- PaxiCosmJS SDK（链上交互）
- PaxiHub 钱包集成（签名交易）
- Paxi LCD API（数据查询）
- GitHub Pages（静态托管）
- Authz 原子交换（NFT 市场成交机制）

## 技术文档

- [Paxi Network 官网](https://paxinet.io)
- [PaxiHub 开发文档](https://paxinet.io/paxi_docs/paxihub)
- [Paxi 区块浏览器](https://explorer.paxinet.io)
- [GitHub 仓库](https://github.com/paxi-web3/paxi)
