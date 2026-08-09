# Paxi 工具箱 + NFT 发射平台 — 超详细部署教程

> 本教程面向零基础用户，每一步都有截图说明和命令复制粘贴。
> 跟着做，15 分钟内你的网站就能上线。

---

## 你将获得什么

完成后你会有一个网址，任何人打开就能使用：

- 📤 批量转账工具（PAXI/PRC-20/NFT）
- 💰 余额批量查询
- 🔍 交易追踪
- ⛽ Gas 计算器
- 🔄 地址格式转换
- 🏦 验证节点对比
- 🪙 代币信息查询
- 🎨 NFT 合约部署 + 批量铸造 + 元数据存储

网址类似：`https://你的用户名.github.io/paxi-toolbox/`

---

## 前置准备

你需要准备以下东西（全部免费）：

| 需要什么 | 在哪注册 | 需要多久 |
|----------|----------|---------|
| GitHub 账号 | [github.com](https://github.com) | 2 分钟 |
| 一个浏览器 | Chrome / Edge / Firefox | 已有 |
| 项目文件 | 本文档提供 | 已有 |

> ⚠️ 不需要服务器、不需要域名、不需要付任何钱。

---

## 第一步：注册 GitHub 账号

1. 打开 [https://github.com](https://github.com)
2. 点击右上角 **Sign up**（注册）
3. 输入邮箱、设置密码、用户名
4. 验证邮箱（去你的邮箱点击验证链接）

> 如果你已经有 GitHub 账号，跳过这一步。

---

## 第二步：下载安装 Git

### Windows

1. 打开 [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. 下载 **64-bit Git for Windows Setup**
3. 双击安装，**一路点 Next**，全部默认即可
4. 安装完成后，按 `Win + R`，输入 `cmd`，回车
5. 在弹出的黑色窗口输入：
   ```
   git --version
   ```
   如果显示 `git version 2.x.x`，说明安装成功 ✅

### Mac

1. 打开终端（Terminal）
2. 输入：
   ```
   git --version
   ```
3. 如果提示安装，点安装即可。如果显示版本号，说明已有 ✅

---

## 第三步：把项目文件保存到本地

### 方法 A：直接下载（推荐新手）

1. 在你的电脑上创建一个文件夹，比如 `D:\paxi-toolbox`
2. 我会把项目文件打包给你——你需要把以下 4 个文件保存到这个文件夹：

```
paxi-toolbox/
├── index.html
├── app.js
├── nft-launcher/
│   └── index.html
└── README.md
```

3. 注意 `nft-launcher` 是一个子文件夹，里面放 `index.html`

### 方法 B：用命令行（如果你熟悉终端）

```bash
mkdir -p paxi-toolbox/nft-launcher
cd paxi-toolbox
# 把 /workspace/paxi-toolbox/ 下的文件复制到这里
```

---

## 第四步：在 GitHub 上创建仓库

1. 登录 GitHub，点击右上角 **+** 号 → **New repository**（新建仓库）

2. 填写信息：
   - **Repository name**（仓库名）：`paxi-toolbox`
   - **Description**（描述）：`Paxi Network 生态工具集`
   - 选择 **Public**（公开）
   - ⚠️ **不要**勾选 "Add a README file"
   - ⚠️ **不要**勾选 "Add .gitignore"
   - ⚠️ **不要**选择 License

3. 点击绿色的 **Create repository** 按钮

4. 创建完成后，你会看到一个页面，上面有一些命令。**先不要关这个页面**，下一步要用。

---

## 第五步：把文件上传到 GitHub

### 打开命令行

**Windows**：按 `Win + R`，输入 `cmd`，回车
**Mac**：打开"终端"

### 进入项目文件夹

```cmd
cd D:\paxi-toolbox
```

（把 `D:\paxi-toolbox` 换成你实际的文件夹路径）

### 依次输入以下命令（一行一行来，每行回车）

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Paxi 工具箱 v1.0"
```

```bash
git branch -M main
```

### 关联你的 GitHub 仓库

把下面命令中的 `你的用户名` 换成你的 GitHub 用户名：

```bash
git remote add origin https://github.com/你的用户名/paxi-toolbox.git
```

例如，如果你的用户名是 `zhangsan`，就输入：
```bash
git remote add origin https://github.com/zhangsan/paxi-toolbox.git
```

### 推送到 GitHub

```bash
git push -u origin main
```

> ⚠️ 这时候可能会弹出 GitHub 登录窗口，输入你的 GitHub 账号密码登录。
>
> 注意：GitHub 已不支持密码登录，需要用 **Personal Access Token** 代替密码。
> 如果弹出登录窗口直接登录即可（浏览器授权方式）。
> 如果要求输入密码，去 GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 repo 权限，生成后复制 token 当密码用。

### 验证是否成功

1. 打开你的 GitHub 仓库页面：`https://github.com/你的用户名/paxi-toolbox`
2. 你应该能看到 4 个文件/文件夹：`index.html`、`app.js`、`nft-launcher/`、`README.md`
3. 看到了？恭喜，文件已上传 ✅

---

## 第六步：开启 GitHub Pages（关键步骤）

1. 在你的仓库页面，点击顶部标签栏的 **Settings**（设置）

2. 在左侧菜单找到 **Pages**（页面），点击

3. 在 **Source**（来源）下面：
   - 下拉菜单选择 **main** 分支
   - 旁边的文件夹选择 **/ (root)**
   - 点击 **Save**（保存）

4. 等待 1-2 分钟，刷新页面

5. 页面顶部会出现一行绿色文字：
   ```
   Your site is live at https://你的用户名.github.io/paxi-toolbox/
   ```

6. 点击那个链接——**你的网站上线了！** 🎉

---

## 第七步：测试网站

### 在电脑上测试

1. 打开 `https://你的用户名.github.io/paxi-toolbox/`
2. 你应该看到深色主题的工具箱界面
3. 点击顶部导航栏的各项功能试试

### 在手机上测试（需要安装 PaxiHub）

1. 在手机上安装 **PaxiHub App**（从 [paxinet.io](https://paxinet.io) 下载 APK）
2. 在 PaxiHub 的 DApp Hub 中输入你的网址
3. 或者直接在手机浏览器打开你的网址
4. 点击"连接钱包"——PaxiHub 会自动注入

### 测试 NFT 发射平台

1. 打开 `https://你的用户名.github.io/paxi-toolbox/nft-launcher/`
2. 或者在工具箱主页点击导航栏的"NFT发射"

---

## 常见问题

### Q: 推送代码时提示 "Permission denied"

**A:** 你的 Git 没有登录。在命令行输入：
```bash
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"
```
然后重新推送。如果还是不行，用 GitHub Desktop 软件上传（见下面替代方案）。

### Q: GitHub Pages 打开后是空白页

**A:** 检查文件结构是否正确：
- `index.html` 必须在仓库**根目录**，不能在子文件夹里
- `app.js` 必须和 `index.html` 在同一级
- `nft-launcher` 文件夹里必须有 `index.html`

### Q: 网站打开后功能不正常

**A:** 按 `F12` 打开浏览器开发者工具，看 Console 标签有没有红色错误。最可能的原因：
- Paxi CosmJS SDK 加载失败（网络问题）
- LCD API 连接超时（Paxi 节点暂时不可用）

### Q: 连接钱包没反应

**A:** 你需要在有 PaxiHub 钱包的环境中打开：
- 手机上用 PaxiHub App 的 DApp 浏览器打开你的网址
- 电脑上需要安装 PaxiHub 浏览器扩展（如果有的话）
- 如果只是预览界面，不需要钱包也能看页面

### Q: 手续费地址能改吗

**A:** 可以。打开 `app.js` 第 19 行，把地址改成你自己的：
```javascript
feeCollector: '你的新地址',
```
NFT 发射平台在 `nft-launcher/index.html` 里搜 `feeCollector` 修改。
改完后重新 `git add . && git commit -m "update" && git push` 推送。

---

## 替代方案：用 GitHub Desktop 上传（不想用命令行）

如果你觉得命令行太麻烦，可以用图形界面工具：

1. 下载 [GitHub Desktop](https://desktop.github.com/)
2. 安装后登录你的 GitHub 账号
3. 点击 **File → New Repository**
   - Name: `paxi-toolbox`
   - Local path: 选择你保存项目文件的文件夹
   - 勾选 "Push to GitHub"
4. 点击 **Create Repository**
5. 把项目文件（index.html、app.js、nft-launcher 文件夹）复制到仓库文件夹
6. 回到 GitHub Desktop，你会看到文件变化
7. 在左下角输入提交信息：`Paxi 工具箱 v1.0`
8. 点击 **Commit to main**
9. 点击 **Push origin** 推送
10. 然后回到上面的第六步开启 GitHub Pages

---

## 发布后做什么

### 1. 发到 Paxi 社区

- **Discord**: [https://discord.gg/rA9Xzs69tx](https://discord.gg/rA9Xzs69tx)
- **Telegram**: [https://t.me/paxi_network](https://t.me/paxi_network)
- **Twitter/X**: @paxiweb3

发帖示例：
```
🛠️ 我为 Paxi 生态开发了工具箱！

功能：
✅ 批量转账（PAXI/PRC-20/NFT）
✅ 余额批量查询
✅ 交易追踪
✅ Gas 计算器
✅ 地址格式转换
✅ 验证节点对比
✅ PRC-721 NFT 发射平台

完全去中心化，纯链上运行，无需信任。
网址：https://你的用户名.github.io/paxi-toolbox/

欢迎试用和反馈！
```

### 2. 申请 DAO Grant

拿着这个成果去 Paxi DAO 提案，申请生态资助。

### 3. 持续迭代

根据用户反馈添加新功能。

---

## 最后检查清单

部署前确认以下事项：

- [ ] GitHub 账号已注册
- [ ] Git 已安装
- [ ] 项目文件已保存到本地（4 个文件/文件夹）
- [ ] GitHub 仓库已创建（名称 paxi-toolbox，公开）
- [ ] 文件已推送到 GitHub
- [ ] GitHub Pages 已开启（Source: main 分支）
- [ ] 网站能正常打开
- [ ] 手续费地址正确（paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd）

---

祝部署顺利！有问题随时问。
