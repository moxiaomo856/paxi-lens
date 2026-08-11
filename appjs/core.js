/**
 * @file 核心模块（语言包、状态、钱包、首页）
 */

// ============================================================
// 语言包
// ============================================================
const LANG = {
  zh: {
    appTitle: 'paxi工具箱',
    back: '← 返回工具箱',
    tools: {
      batchTransfer: '批量转账',
      balanceCheck: '地址余额 / 批量查询',
      nftMarket: 'NFT市场',
      txTracker: '交易追踪',
      nftLauncher: 'NFT发射',
      addressConvert: '地址转换',
      redelegate: '变更质押节点',
      gasCalc: 'gas计算',
      validatorCompare: '验证节点',
      p2pMarket: '买卖发布',
      proposal: '治理提案',
      later: '后期开发……'
    },
    batchTransfer: {
      title: '📤 批量转账',
      desc: '支持 PAXI 原生代币、PRC-20 代币、NFT 的批量发送。支持 CSV 导入和均额模式。',
      modePack: '⚡ 打包发送模式：所有转账和手续费打包在 1 笔交易中，只需 1 次签名，手续费 100% 成功。',
      note: '💡 接收方如果钱包不显示记录，请在「余额查询」中点击「📜 转入记录」查看完整链上记录。',
      native: 'PAXI 原生代币',
      prc20: 'PRC-20 代币',
      nft: 'NFT (PRC-721)',
      csvMode: '📋 CSV 导入（不同金额）',
      uniformMode: '🔄 均额模式（相同金额）',
      upload: '点击上传 CSV 或拖拽到此处',
      format: '格式：地址,金额（每行一条）',
      pastePlaceholder: 'paxi1abc123...,100\npaxi1def456...,250',
      uniformPlaceholder: 'paxi1abc123...\npaxi1def456...',
      parseBtn: '📋 解析并预览',
      sendBtn: '🚀 执行批量转账',
      clearBtn: '清空',
      preview: '📋 转账预览',
      history: '📜 最近转账记录'
    },
    balanceCheck: {
      title: '💰 地址余额 / 批量查询',
      desc: '粘贴多个 Paxi 地址，一键查询所有地址的 PAXI 余额和 PRC-20 代币持有情况。',
      placeholder: 'paxi1abc123...\npaxi1def456...',
      queryBtn: '🔍 查询余额',
      exportBtn: '📥 导出 CSV',
      querying: '正在查询 {count} 个地址...',
      done: '✅ 查询完成：{count} 个地址',
      noAddr: '没有有效的 Paxi 地址',
      records: '📜 转入记录'
    },
    txTracker: {
      title: '🔍 交易追踪',
      desc: '输入交易哈希（TxHash），查看交易状态、详情和日志。',
      placeholder: '输入 TxHash...',
      queryBtn: '🔍 查询'
    },
    gasCalc: {
      title: '⛽ Gas 费用计算器',
      desc: '估算不同类型交易的 Gas 消耗和费用。',
      type: '交易类型',
      send: '普通转账 (MsgSend)',
      prc20: 'PRC-20 转账',
      nft: 'NFT 转账',
      swap: 'AMM 兑换',
      stake: '质押/委托',
      vote: '治理投票',
      price: 'Gas 价格 (upaxi)',
      calcBtn: '🧮 计算'
    },
    addressConvert: {
      title: '🔄 地址格式转换',
      desc: 'Paxi 使用 Bech32 编码。在不同 Cosmos 链之间转换地址前缀。',
      inputPlaceholder: 'paxi1... 或 cosmos1... 或 osmosis1...',
      target: '目标前缀',
      convertBtn: '🔄 转换'
    },
    validatorCompare: {
      title: '🏦 验证节点对比',
      desc: '查看所有活跃验证节点的 APR、佣金率、投票权重、状态等关键指标。',
      loadBtn: '🔄 加载验证节点数据',
      loading: '加载中...',
      done: '✅ 加载完成：{count} 个验证节点'
    },
    tokenInfo: {
      title: '🪙 PRC-20 代币信息查询',
      desc: '输入 PRC-20 合约地址，查询代币名称、符号、总供应量、小数位等基本信息。',
      placeholder: 'paxi1...',
      queryBtn: '🔍 查询'
    },
    nftMarket: {
      title: '🏪 NFT 市场',
      desc: '基于 Authz 原子交换的去中心化 NFT 交易。',
      tabs: ['市场浏览', '上架NFT', '我的订单', '导入']
    },
    redelegate: {
      title: '🔄 质押迁移',
      desc: '一键切换验证节点，无需等待 21 天解绑期。手续费按迁移金额收取（<5万：0.2%，≥5万：0.18%）。',
      hint: '选择你当前质押的节点，再选择目标节点，输入数量即可完成迁移。',
      from: '从（当前质押节点）',
      to: '到（目标节点）',
      amount: '数量（PAXI）',
      max: '全部',
      fee: '手续费',
      feeRate: '费率',
      execute: '🚀 立即迁移',
      selectFrom: '请选择...',
      selectTo: '请选择...',
      success: '✅ 迁移成功！',
      fail: '❌ 迁移失败：',
      invalidInput: '请完整选择节点和数量',
      noDelegations: '暂无质押记录'
    },
    p2pMarket: {
      title: '📊 Paxi 买卖市场',
      desc: '发布买入/卖出 PAXI 的广告，自由交易。发布每条广告收取 1 PAXI 手续费。',
      fee: '1 PAXI / 条（防刷屏）',
      buy: '📈 发布买单',
      sell: '📉 发布卖单',
      buyLabel: '买单',
      sellLabel: '卖单',
      amount: '数量 (PAXI)',
      price: '单价 (USDT)',
      contact: '联系方式（TG / 微信 / 其他）',
      note: '备注（可选）',
      publish: '🚀 发布',
      publishing: '发布中...',
      success: '✅ 发布成功！',
      fail: '❌ 发布失败：',
      noData: '暂无买卖信息，快来发布第一条吧！',
      from: '发布者',
      time: '发布时间',
      connectFirst: '请先连接钱包',
      feeNote: '发布将收取 1 PAXI 手续费',
      confirmPublish: '确认支付 1 PAXI 发布此广告？',
      deleteConfirm: '确定删除这条广告吗？',
      deleted: '已删除'
    },
    proposal: {
      title: '📦 治理提案',
      desc: '提交 Paxi 网络治理提案，参与社区决策。提案需要支付押金，并支付平台手续费。',
      submit: '📝 提交提案',
      type: '提案类型',
      typeText: '文本提案',
      typeParam: '参数修改提案',
      paramSubspace: '参数模块 (subspace)',
      paramKey: '参数名 (key)',
      paramValue: '参数值 (value, JSON字符串)',
      paramValuePH: '例如："0.050000000000000000"',
      addParam: '➕ 添加参数',
      delParam: '删除',
      paramHint: '提示：subspace 如 gov / bank / staking / mint / slashing / distribution；value 为 JSON 字符串。',
      paramRefTitle: '📖 常用参数 & 参考示例',
      invalidParam: '请完整填写每条参数的 Subspace / Key / Value',
      invalidParamRef: '参数修改提案至少添加一条参数',
      paramBlockTitle: '🔧 参数修改配置 (ParameterChangeProposal)',
      titleLabel: '提案标题',
      titlePlaceholder: '例如：建议降低交易手续费',
      descLabel: '提案描述',
      descPlaceholder: '详细描述你的提案...',
      deposit: '押金 (PAXI)',
      fee: '手续费 (PAXI)',
      submitBtn: '🚀 提交提案',
      submitting: '提交中...',
      success: '✅ 提案提交成功！提案 ID：',
      fail: '❌ 提案提交失败：',
      list: '📋 提案列表',
      listLoading: '加载中...',
      listEmpty: '暂无提案',
      passed: '已通过',
      rejected: '已拒绝',
      voting: '投票中',
      depositFailed: '押金失败退还',
      status: '状态',
      submitTime: '提交时间',
      depositAmount: '押金金额',
      connectFirst: '请先连接钱包',
      emptyFields: '请填写提案标题和描述',
      invalidDeposit: '押金必须大于 0',
      confirmSubmit: '确认支付 {fee} PAXI 手续费 + {deposit} PAXI 押金提交提案？押金如通过将退还给您。',
    },
    common: {
      connectFirst: '请先连接钱包',
      sending: '发送中...',
      loading: '加载中...',
      connect: '连接钱包',
      disconnect: '断开',
      mainnet: '主网',
      testnet: '测试网',
      langSwitch: '中/English',
    }
  },
  en: {
    appTitle: 'Paxi Toolbox',
    back: '← Back',
    tools: {
      batchTransfer: 'Batch Transfer',
      balanceCheck: 'Balance / Batch Query',
      nftMarket: 'NFT Market',
      txTracker: 'Tx Tracker',
      nftLauncher: 'NFT Launcher',
      addressConvert: 'Address Convert',
      redelegate: 'Redelegate',
      gasCalc: 'Gas Calc',
      validatorCompare: 'Validators',
      p2pMarket: 'P2P Market',
      proposal: 'Gov Proposal',
      later: 'Coming Soon…'
    },
    batchTransfer: {
      title: '📤 Batch Transfer',
      desc: 'Batch send PAXI, PRC-20, or NFT. Supports CSV import and uniform amounts.',
      modePack: '⚡ Packed mode: all transfers + fee in 1 tx, 1 signature, 100% success.',
      note: '💡 If recipient wallet doesn\'t show records, check "Transfer Records" in Balance Query.',
      native: 'PAXI Native',
      prc20: 'PRC-20 Token',
      nft: 'NFT (PRC-721)',
      csvMode: '📋 CSV Import (different amounts)',
      uniformMode: '🔄 Uniform Amount',
      upload: 'Click or drag CSV here',
      format: 'Format: address,amount (one per line)',
      pastePlaceholder: 'paxi1abc123...,100\npaxi1def456...,250',
      uniformPlaceholder: 'paxi1abc123...\npaxi1def456...',
      parseBtn: '📋 Parse & Preview',
      sendBtn: '🚀 Execute Batch Transfer',
      clearBtn: 'Clear',
      preview: '📋 Transfer Preview',
      history: '📜 Recent Transfers'
    },
    balanceCheck: {
      title: '💰 Balance / Batch Query',
      desc: 'Paste multiple Paxi addresses to query PAXI balances and PRC-20 holdings.',
      placeholder: 'paxi1abc123...\npaxi1def456...',
      queryBtn: '🔍 Query Balances',
      exportBtn: '📥 Export CSV',
      querying: 'Querying {count} addresses...',
      done: '✅ Done: {count} addresses',
      noAddr: 'No valid Paxi addresses',
      records: '📜 Transfer Records'
    },
    txTracker: {
      title: '🔍 Tx Tracker',
      desc: 'Enter TxHash to check transaction status and details.',
      placeholder: 'Enter TxHash...',
      queryBtn: '🔍 Query'
    },
    gasCalc: {
      title: '⛽ Gas Calculator',
      desc: 'Estimate gas fees for different transaction types.',
      type: 'Tx Type',
      send: 'Transfer (MsgSend)',
      prc20: 'PRC-20 Transfer',
      nft: 'NFT Transfer',
      swap: 'AMM Swap',
      stake: 'Stake/Delegate',
      vote: 'Governance Vote',
      price: 'Gas Price (upaxi)',
      calcBtn: '🧮 Calculate'
    },
    addressConvert: {
      title: '🔄 Address Convert',
      desc: 'Convert between Bech32 prefixes for different Cosmos chains.',
      inputPlaceholder: 'paxi1... or cosmos1... or osmosis1...',
      target: 'Target Prefix',
      convertBtn: '🔄 Convert'
    },
    validatorCompare: {
      title: '🏦 Validator Compare',
      desc: 'View APR, commission, voting power, and status of all active validators.',
      loadBtn: '🔄 Load Validators',
      loading: 'Loading...',
      done: '✅ Loaded: {count} validators'
    },
    tokenInfo: {
      title: '🪙 PRC-20 Token Info',
      desc: 'Query token name, symbol, total supply, decimals from PRC-20 contract.',
      placeholder: 'paxi1...',
      queryBtn: '🔍 Query'
    },
    nftMarket: {
      title: '🏪 NFT Market',
      desc: 'Decentralized NFT trading via Authz atomic swaps.',
      tabs: ['Browse', 'List', 'My Orders', 'Import']
    },
    redelegate: {
      title: '🔄 Redelegate',
      desc: 'Switch validator instantly, no 21-day unbonding. Fee: 0.2% (<50k PAXI) or 0.18% (≥50k PAXI).',
      hint: 'Select your current validator, then target validator, enter amount to migrate.',
      from: 'From (current validator)',
      to: 'To (target validator)',
      amount: 'Amount (PAXI)',
      max: 'Max',
      fee: 'Fee',
      feeRate: 'Rate',
      execute: '🚀 Redelegate Now',
      selectFrom: 'Select...',
      selectTo: 'Select...',
      success: '✅ Redelegation successful!',
      fail: '❌ Redelegation failed: ',
      invalidInput: 'Please select both validators and amount',
      noDelegations: 'No delegations found'
    },
    p2pMarket: {
      title: '📊 Paxi P2P Market',
      desc: 'Post buy/sell PAXI ads, free trading. 1 PAXI fee per ad.',
      fee: '1 PAXI / ad (anti-spam)',
      buy: '📈 Post Buy',
      sell: '📉 Post Sell',
      buyLabel: 'Buy',
      sellLabel: 'Sell',
      amount: 'Amount (PAXI)',
      price: 'Price (USDT)',
      contact: 'Contact (TG/WeChat/Other)',
      note: 'Note (optional)',
      publish: '🚀 Publish',
      publishing: 'Publishing...',
      success: '✅ Published!',
      fail: '❌ Failed: ',
      noData: 'No ads yet, be the first!',
      from: 'From',
      time: 'Time',
      connectFirst: 'Please connect wallet first',
      feeNote: '1 PAXI fee will be charged',
      confirmPublish: 'Confirm to pay 1 PAXI to publish this ad?',
      deleteConfirm: 'Delete this ad?',
      deleted: 'Deleted'
    },
    proposal: {
      title: '📦 Governance Proposal',
      desc: 'Submit Paxi Network governance proposals. Deposit required, plus platform fee.',
      submit: '📝 Submit Proposal',
      type: 'Proposal Type',
      typeText: 'Text Proposal',
      typeParam: 'Parameter Change Proposal',
      paramSubspace: 'Subspace (module)',
      paramKey: 'Key (parameter name)',
      paramValue: 'Value (JSON string)',
      paramValuePH: 'e.g. "0.050000000000000000"',
      addParam: '➕ Add Parameter',
      delParam: 'Remove',
      paramHint: 'Common subspace: gov / bank / staking / mint / slashing / distribution. Value must be a JSON string.',
      paramRefTitle: '📖 Common preset & reference',
      invalidParam: 'Please fill in Subspace / Key / Value for every parameter row',
      invalidParamRef: 'At least one parameter required for param-change proposal',
      paramBlockTitle: '🔧 Parameter Change Config (ParameterChangeProposal)',
      titleLabel: 'Proposal Title',
      titlePlaceholder: 'e.g. Lower transaction fees',
      descLabel: 'Proposal Description',
      descPlaceholder: 'Describe your proposal in detail...',
      deposit: 'Deposit (PAXI)',
      fee: 'Platform Fee (PAXI)',
      submitBtn: '🚀 Submit Proposal',
      submitting: 'Submitting...',
      success: '✅ Proposal submitted! Proposal ID: ',
      fail: '❌ Submit failed: ',
      list: '📋 Proposal List',
      listLoading: 'Loading...',
      listEmpty: 'No proposals yet',
      passed: 'Passed',
      rejected: 'Rejected',
      voting: 'Voting',
      depositFailed: 'Deposit Refunded',
      status: 'Status',
      submitTime: 'Submit Time',
      depositAmount: 'Deposit',
      connectFirst: 'Please connect wallet first',
      emptyFields: 'Please fill in title and description',
      invalidDeposit: 'Deposit must be greater than 0',
      confirmSubmit: 'Confirm to pay {fee} PAXI platform fee + {deposit} PAXI deposit? Deposit will be refunded if proposal passes.',
    },
    common: {
      connectFirst: 'Please connect wallet first',
      sending: 'Sending...',
      loading: 'Loading...',
      connect: 'Connect Wallet',
      disconnect: 'Disconnect',
      mainnet: 'Mainnet',
      testnet: 'Testnet',
      langSwitch: 'English/中',
    }
  }
};

let currentLang = localStorage.getItem('paxi_lang') || 'zh';

function t(key) {
  const keys = key.split('.');
  let obj = LANG[currentLang];
  for (const k of keys) {
    if (obj && obj[k] !== undefined) obj = obj[k];
    else return key;
  }
  return obj || key;
}

function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('paxi_lang', currentLang);
  updateHeaderUI();
  if (state.currentView === 'home') renderHome();
  else if (state.currentTool) renderTool(state.currentTool);
}

function updateHeaderUI() {
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = t('common.langSwitch');
  const appTitle = document.getElementById('appTitle');
  if (appTitle) appTitle.textContent = t('appTitle');
  const btnConnect = document.getElementById('btnConnect');
  if (btnConnect) btnConnect.textContent = t('common.connect');
  const btnDisconnect = document.getElementById('btnDisconnect');
  if (btnDisconnect) btnDisconnect.textContent = t('common.disconnect');
  if (typeof renderNetworkSelector === 'function') renderNetworkSelector('networkSelector');
}

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  get rpc() { return getNetworkConfig().rpc; },
  get lcd() { return getLCD(); },
  get denom() { return getDenom(); },
  get denomDisplay() { return SHARED_CONFIG.denomDisplay; },
  get chainId() { return getChainId(); },
  gasPrice: SHARED_CONFIG.gasPrice,
  gasLimit: SHARED_CONFIG.gasLimit,
  maxMessagesPerTx: SHARED_CONFIG.maxMessagesPerTx,
  feeCollector: SHARED_CONFIG.feeCollector,
  feeRate: SHARED_CONFIG.feeRate,
  nftMarket: SHARED_CONFIG.nftMarket,
};

// ============================================================
// 状态管理
// ============================================================
const state = {
  wallet: null,
  balance: null,
  connected: false,
  currentView: 'home',
  currentTool: null,
  batchRecipients: [],
  batchTokenType: 'native',
  batchMode: 'csv',
  nftMarket: {
    subTab: 'browse',
    currentBuy: null,
    morePanel: false,
  },
  redelegate: {
    srcValidator: null,
    dstValidator: null,
    amount: '',
    delegations: [],
    validators: [],
  }
};

// ============================================================
// 初始化
// ============================================================
function initApp() {
  updateHeaderUI();
  renderHome();
  checkWalletInjection();
}

function checkWalletInjection() {
  let attempts = 0;
  const maxAttempts = 20;
  const interval = setInterval(() => {
    attempts++;
    if (typeof window.paxihub !== 'undefined') {
      console.log('PaxiHub detected');
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500);
}

// ============================================================
// 导航
// ============================================================
function navigateHome() {
  state.currentView = 'home';
  state.currentTool = null;
  renderHome();
}

function navigateToTool(tool) {
  state.currentView = 'tool';
  state.currentTool = tool;
  renderTool(tool);
}

// ============================================================
// 首页渲染
// ============================================================
function renderHome() {
  const main = document.getElementById('mainContent');
  const tools = [
    { id: 'batch-transfer', icon: '📤', label: 'tools.batchTransfer' },
    { id: 'balance-check', icon: '💰', label: 'tools.balanceCheck' },
    { id: 'nft-market', icon: '🏪', label: 'tools.nftMarket' },
    { id: 'tx-tracker', icon: '🔍', label: 'tools.txTracker' },
    { id: 'nft-launcher', icon: '🎨', label: 'tools.nftLauncher' },
    { id: 'address-convert', icon: '🔄', label: 'tools.addressConvert' },
    { id: 'redelegate', icon: '🔄', label: 'tools.redelegate' },
    { id: 'gas-calc', icon: '⛽', label: 'tools.gasCalc' },
    { id: 'validator-compare', icon: '🏦', label: 'tools.validatorCompare' },
    { id: 'p2p-market', icon: '📊', label: 'tools.p2pMarket' },
    { id: 'proposal', icon: '📦', label: 'tools.proposal' },
    { id: 'later', icon: '📌', label: 'tools.later' },
  ];

  main.innerHTML = `
    <div class="home-grid">
      ${tools.map(item => `
        <div class="tool-card" data-tool="${item.id}">
          <div class="icon">${item.icon}</div>
          <div class="name">${t(item.label)}</div>
        </div>
      `).join('')}
    </div>
  `;

  main.querySelectorAll('.tool-card[data-tool]').forEach(card => {
    card.addEventListener('click', () => {
      const toolId = card.dataset.tool;
      if (toolId === 'later') {
        showToast(t('tools.later'), 'info');
      } else {
        navigateToTool(toolId);
      }
    });
  });
}

// ============================================================
// 钱包连接
// ============================================================
async function connectWallet() {
  if (typeof window.paxihub === 'undefined') {
    showToast('请先安装 PaxiHub 钱包', 'error');
    if (/Mobi/.test(navigator.userAgent)) {
      setTimeout(() => {
        window.location.href = 'https://paxinet.io/paxi_docs/paxihub#paxihub-application';
      }, 1500);
    }
    return;
  }
  try {
    const sender = await window.paxihub.paxi.getAddress();
    state.wallet = sender;
    state.connected = true;
    updateWalletUI();
    await refreshBalance();
    showToast('钱包已连接', 'success');
  } catch (e) {
    console.error('Wallet connection failed:', e);
    showToast('连接钱包失败：' + e.message, 'error');
  }
}

function disconnectWallet() {
  state.wallet = null;
  state.balance = null;
  state.connected = false;
  updateWalletUI();
  showToast('钱包已断开');
}

function updateWalletUI() {
  const addrEl = document.getElementById('walletAddress');
  const balEl = document.getElementById('walletBalance');
  const btnConnect = document.getElementById('btnConnect');
  const btnDisconnect = document.getElementById('btnDisconnect');
  if (state.connected && state.wallet) {
    const addr = state.wallet.address;
    addrEl.textContent = addr.slice(0, 10) + '...' + addr.slice(-6);
    addrEl.style.display = 'inline-block';
    balEl.style.display = 'inline-block';
    btnConnect.style.display = 'none';
    btnDisconnect.style.display = 'inline-flex';
  } else {
    addrEl.style.display = 'none';
    balEl.style.display = 'none';
    btnConnect.style.display = 'inline-flex';
    btnDisconnect.style.display = 'none';
  }
}

async function refreshBalance() {
  if (!state.wallet) return;
  try {
    const res = await fetch(`${CONFIG.lcd}/cosmos/bank/v1beta1/balances/${state.wallet.address}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const paxiBalance = data.balances?.find(b => b.denom === CONFIG.denom);
    if (paxiBalance) {
      state.balance = parseFloat(upaxiToPaxi(paxiBalance.amount));
      document.getElementById('walletBalance').textContent =
        state.balance.toLocaleString(undefined, { maximumFractionDigits: 6 }) + ' ' + CONFIG.denomDisplay;
    } else {
      state.balance = 0;
      document.getElementById('walletBalance').textContent = '0 ' + CONFIG.denomDisplay;
    }
  } catch (e) {
    console.error('Balance refresh failed:', e);
  }
}

// ============================================================
// 共享命名空间 & 工具注册机制
// ============================================================
window.APP = {};
window.APP.LANG = LANG;
window.APP.currentLang = currentLang;
window.APP.state = state;
window.APP.CONFIG = CONFIG;
window.APP.t = t;
window.APP.toggleLanguage = toggleLanguage;
window.APP.updateHeaderUI = updateHeaderUI;
window.APP.navigateHome = navigateHome;
window.APP.navigateToTool = navigateToTool;
window.APP.renderHome = renderHome;
window.APP.initApp = initApp;
window.APP.connectWallet = connectWallet;
window.APP.disconnectWallet = disconnectWallet;
window.APP.updateWalletUI = updateWalletUI;
window.APP.refreshBalance = refreshBalance;
window.APP.checkWalletInjection = checkWalletInjection;

window.TOOL_REGISTRY = {};

// ============================================================
// 补充 delete 到 LANG.common
// ============================================================
if (LANG.zh.common) LANG.zh.common.delete = '删除';
if (LANG.en.common) LANG.en.common.delete = 'Delete';
