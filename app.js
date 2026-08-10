/**
 * Paxi 工具箱 - 主应用逻辑（完整版）
 * 包含：首页网格导航 + 所有工具 + 中英文切换 + 质押迁移 + P2P 买卖市场
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
    common: {
      connectFirst: '请先连接钱包',
      sending: '发送中...',
      loading: '加载中...'
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
    common: {
      connectFirst: 'Please connect wallet first',
      sending: 'Sending...',
      loading: 'Loading...'
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
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = currentLang === 'zh' ? '中/english' : 'english/中';
  document.getElementById('appTitle').textContent = t('appTitle');
  if (state.currentView === 'home') renderHome();
  else if (state.currentTool) renderTool(state.currentTool);
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
document.addEventListener('DOMContentLoaded', () => {
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = currentLang === 'zh' ? '中/english' : 'english/中';
  document.getElementById('appTitle').textContent = t('appTitle');
  renderHome();
  checkWalletInjection();
});

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
    { id: 'later', icon: '📌', label: 'tools.later' },
  ];

  main.innerHTML = `
    <div class="home-grid">
      ${tools.map(t => `
        <div class="tool-card" data-tool="${t.id}">
          <div class="icon">${t.icon}</div>
          <div class="name">${t(t.label)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // 事件委托，避免内联 onclick 注入翻译文本导致的 XSS / 语法破坏
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
// 工具渲染（二级页面）
// ============================================================
function renderTool(tool) {
  const main = document.getElementById('mainContent');
  let content = '';
  switch (tool) {
    case 'batch-transfer': content = renderBatchTransfer(); break;
    case 'balance-check': content = renderBalanceCheck(); break;
    case 'nft-market': content = renderNftMarket(); break;
    case 'tx-tracker': content = renderTxTracker(); break;
    case 'nft-launcher':
      content = `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:20px;">🎨 NFT发射平台<br><br><a href="nft-launcher/index.html" target="_blank" style="color:var(--primary);">点击打开独立页面 →</a></p></div>`;
      break;
    case 'address-convert': content = renderAddressConvert(); break;
    case 'redelegate': content = renderRedelegate(); break;
    case 'gas-calc': content = renderGasCalc(); break;
    case 'validator-compare': content = renderValidatorCompare(); break;
    case 'p2p-market': content = renderP2pMarket(); break;
    default: content = '<p style="color:var(--text-muted);text-align:center;padding:20px;">工具加载中...</p>';
  }
  main.innerHTML = `
    <div class="back-bar" onclick="navigateHome()">${t('back')}</div>
    ${content}
  `;
  bindToolEvents(tool);
}

function bindToolEvents(tool) {
  switch (tool) {
    case 'batch-transfer': bindBatchTransferEvents(); break;
    case 'balance-check': bindBalanceCheckEvents(); break;
    case 'nft-market': bindNftMarketEvents(); break;
    case 'tx-tracker': bindTxTrackerEvents(); break;
    case 'gas-calc': bindGasCalcEvents(); break;
    case 'address-convert': bindAddressConvertEvents(); break;
    case 'validator-compare': loadValidatorData(); break;
    case 'token-info': bindTokenInfoEvents(); break;
    case 'redelegate': loadRedelegateData(); break;
    case 'p2p-market': break; // P2P 市场不需要额外绑定事件
  }
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
// 工具 1: 批量转账
// ============================================================
function renderBatchTransfer() {
  return `
    <div class="card">
      <div class="card-title">${t('batchTransfer.title')}</div>
      <div class="info-box">
        <strong>⚡ ${t('batchTransfer.modePack')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">${t('batchTransfer.note')}</span>
      </div>
      <div class="tool-desc">${t('batchTransfer.desc')}</div>
      <div class="tabs">
        <div class="tab active" data-bt-type="native">${t('batchTransfer.native')}</div>
        <div class="tab" data-bt-type="prc20">${t('batchTransfer.prc20')}</div>
        <div class="tab" data-bt-type="nft">${t('batchTransfer.nft')}</div>
      </div>
      <div class="tabs" style="margin-top:8px">
        <div class="tab active" data-bt-mode="csv">${t('batchTransfer.csvMode')}</div>
        <div class="tab" data-bt-mode="uniform">${t('batchTransfer.uniformMode')}</div>
      </div>
      <div class="form-group" id="bt-prc20-group" style="display:none">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="btPrc20Contract" placeholder="paxi1...">
      </div>
      <div class="form-group" id="bt-nft-group" style="display:none">
        <label class="form-label">NFT 合约地址</label>
        <input type="text" id="btNftContract" placeholder="paxi1...">
      </div>
      <div id="bt-csv-area">
        <div class="form-group">
          <label class="form-label">上传 CSV 文件 或 粘贴数据</label>
          <div class="upload-area" id="btCsvUpload">
            <div style="font-size:28px;margin-bottom:8px">📁</div>
            <div>${t('batchTransfer.upload')}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${t('batchTransfer.format')}</div>
          </div>
          <input type="file" id="btCsvFile" accept=".csv,.txt" style="display:none">
        </div>
        <div class="form-group">
          <label class="form-label">或手动粘贴（每行：地址,金额）</label>
          <textarea id="btCsvText" placeholder="${t('batchTransfer.pastePlaceholder')}"></textarea>
        </div>
      </div>
      <div id="bt-uniform-area" style="display:none">
        <div class="form-group">
          <label class="form-label">接收地址列表（每行一个地址）</label>
          <textarea id="btUniformAddrs" placeholder="${t('batchTransfer.uniformPlaceholder')}"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">每地址金额</label>
          <input type="number" id="btUniformAmount" placeholder="例如：100" step="0.000001" min="0">
        </div>
      </div>
      <div id="btPreview" style="display:none">
        <div class="card-title" style="font-size:14px">${t('batchTransfer.preview')}</div>
        <div class="stats-row" id="btStats"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>接收地址</th><th>金额</th><th>代币</th></tr></thead>
            <tbody id="btPreviewBody"></tbody>
          </table>
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btParseBtn" onclick="parseBatchTransfer()">${t('batchTransfer.parseBtn')}</button>
        <button class="btn btn-success" id="btSendBtn" style="display:none" onclick="executeBatchTransfer()">${t('batchTransfer.sendBtn')}</button>
        <button class="btn btn-outline btn-sm" id="btClearBtn" style="display:none" onclick="clearBatchTransfer()">${t('batchTransfer.clearBtn')}</button>
      </div>
      <div class="status-msg" id="btStatus"></div>
    </div>
    <div class="card">
      <div class="card-title">${t('batchTransfer.history')}</div>
      <div id="btHistory"><p style="color:var(--text-muted);font-size:13px">连接钱包后查看历史记录</p></div>
    </div>
  `;
}

function bindBatchTransferEvents() {
  document.querySelectorAll('[data-bt-type]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-bt-type]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.batchTokenType = tab.dataset.btType;
      document.getElementById('bt-prc20-group').style.display = tab.dataset.btType === 'prc20' ? 'block' : 'none';
      document.getElementById('bt-nft-group').style.display = tab.dataset.btType === 'nft' ? 'block' : 'none';
      clearBatchTransfer();
    });
  });
  document.querySelectorAll('[data-bt-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-bt-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.batchMode = tab.dataset.btMode;
      document.getElementById('bt-csv-area').style.display = tab.dataset.btMode === 'csv' ? 'block' : 'none';
      document.getElementById('bt-uniform-area').style.display = tab.dataset.btMode === 'uniform' ? 'block' : 'none';
      clearBatchTransfer();
    });
  });
  const uploadArea = document.getElementById('btCsvUpload');
  const fileInput = document.getElementById('btCsvFile');
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) parseCSVFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) parseCSVFile(e.target.files[0]);
  });
}

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('btCsvText').value = e.target.result;
    parseBatchTransfer();
  };
  reader.readAsText(file);
}

function parseBatchTransfer() {
  const tokenType = state.batchTokenType;
  const mode = state.batchMode;
  let recipients = [];
  const seenAddresses = new Set();
  const invalidLines = [];
  if (mode === 'csv') {
    const text = document.getElementById('btCsvText').value.trim();
    if (!text) { showStatus('btStatus', '请输入 CSV 数据', 'warning'); return; }
    const lines = text.split('\n').filter(l => l.trim());
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) { invalidLines.push({ line: lineIdx + 1, reason: '格式不正确' }); continue; }
      const addr = parts[0], amount = parts[1];
      if (lineIdx === 0 && /^address|地址/i.test(addr)) continue;
      if (!addr.startsWith('paxi1') || addr.length < 38) { invalidLines.push({ line: lineIdx + 1, reason: '无效地址' }); continue; }
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) { invalidLines.push({ line: lineIdx + 1, reason: '无效金额' }); continue; }
      if (seenAddresses.has(addr)) { invalidLines.push({ line: lineIdx + 1, reason: '重复地址' }); continue; }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  } else {
    const addrsText = document.getElementById('btUniformAddrs').value.trim();
    const amount = document.getElementById('btUniformAmount').value;
    if (!addrsText || !amount) { showStatus('btStatus', '请输入地址列表和金额', 'warning'); return; }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) { showStatus('btStatus', '金额必须大于 0', 'warning'); return; }
    const addrs = addrsText.split('\n').map(a => a.trim()).filter(a => a);
    for (let i = 0; i < addrs.length; i++) {
      const addr = addrs[i];
      if (!addr.startsWith('paxi1') || addr.length < 38) { invalidLines.push({ line: i + 1, reason: '无效地址' }); continue; }
      if (seenAddresses.has(addr)) { invalidLines.push({ line: i + 1, reason: '重复地址' }); continue; }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  }
  if (recipients.length === 0) { showStatus('btStatus', '未能解析任何有效的接收地址', 'warning'); return; }
  const validRecipients = recipients.filter(r => { try { bech32Decode(r.address); return true; } catch { return false; } });
  if (validRecipients.length === 0) { showStatus('btStatus', '没有有效的 Paxi 地址（bech32 校验失败）', 'error'); return; }
  if (validRecipients.length > CONFIG.maxMessagesPerTx) {
    showStatus('btStatus', `单笔交易最多 ${CONFIG.maxMessagesPerTx} 个接收地址，请分批发送`, 'warning');
    return;
  }
  state.batchRecipients = validRecipients;
  renderBatchPreview(validRecipients, tokenType);
  document.getElementById('btPreview').style.display = 'block';
  document.getElementById('btSendBtn').style.display = 'inline-flex';
  document.getElementById('btClearBtn').style.display = 'inline-flex';
  document.getElementById('btStatus').style.display = 'none';
  if (invalidLines.length > 0) {
    setTimeout(() => {
      showStatus('btStatus', `⚠️ 跳过 ${invalidLines.length} 行无效数据：${invalidLines.slice(0,5).map(l => `第${l.line}行(${l.reason})`).join(', ')}${invalidLines.length>5?'...':''}`, 'warning');
    }, 100);
  }
}

function renderBatchPreview(recipients, tokenType) {
  const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const tokenLabel = tokenType === 'native' ? 'PAXI' : tokenType === 'prc20' ? 'PRC-20' : 'NFT';
  let feeAmount, feeNote;
  if (tokenType === 'nft') {
    feeAmount = recipients.length * 0.5;
    feeNote = '0.5 PAXI/笔（固定费率）';
  } else {
    const feeRate = CONFIG.feeRate;
    feeAmount = totalAmount * feeRate / 100;
    feeNote = `${feeRate}%（以 PAXI 收取）`;
  }
  document.getElementById('btStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${recipients.length}</div><div class="stat-label">接收地址数</div></div>
    <div class="stat-card"><div class="stat-value">${tokenType === 'nft' ? recipients.length : totalAmount.toLocaleString()}</div><div class="stat-label">${tokenType === 'nft' ? 'NFT 数量' : '总金额（' + tokenLabel + '）'}</div></div>
    <div class="stat-card"><div class="stat-value">${feeAmount.toFixed(4)}</div><div class="stat-label">服务费 ${feeNote}</div></div>
    <div class="stat-card"><div class="stat-value">${feeAmount.toFixed(4)}</div><div class="stat-label">PAXI 手续费总额</div></div>
  `;
  const tbody = document.getElementById('btPreviewBody');
  tbody.innerHTML = recipients.map((r, i) => `
    <tr><td>${i+1}</td><td><code>${escapeHtml(r.address.slice(0,14))}...${escapeHtml(r.address.slice(-8))}</code></td><td>${escapeHtml(parseFloat(r.amount).toLocaleString())}</td><td>${tokenLabel}</td></tr>
  `).join('');
}

function clearBatchTransfer() {
  state.batchRecipients = [];
  document.getElementById('btPreview').style.display = 'none';
  document.getElementById('btSendBtn').style.display = 'none';
  document.getElementById('btClearBtn').style.display = 'none';
  document.getElementById('btStatus').style.display = 'none';
}

async function executeBatchTransfer() {
  if (!state.connected) { showStatus('btStatus', '请先连接钱包', 'warning'); return; }
  if (state.batchRecipients.length === 0) { showStatus('btStatus', '没有可发送的转账', 'warning'); return; }
  const btn = document.getElementById('btSendBtn');
  btn.disabled = true;
  const statusEl = document.getElementById('btStatus');
  const total = state.batchRecipients.length;
  statusEl.className = 'status-msg info';
  statusEl.style.display = 'block';
  statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 准备打包发送（共 ${total} 笔）...</div>`;
  try {
    const sender = state.wallet;
    const denom = CONFIG.denom;
    const tokenType = state.batchTokenType;
    const chainId = CONFIG.chainId;
    let totalAmountMicro = BigInt(0);
    for (const r of state.batchRecipients) totalAmountMicro += BigInt(paxiToUpaxi(r.amount));
    const feeMicro = (totalAmountMicro * BigInt(Math.round(CONFIG.feeRate * 100)) / BigInt(10000)).toString();
    let fixedFeeMicro = '0';
    if (tokenType === 'nft') {
      const totalFee = state.batchRecipients.length * 0.5;
      fixedFeeMicro = paxiToUpaxi(totalFee.toFixed(6));
    }
    const actualFeeMicro = tokenType === 'nft' ? fixedFeeMicro : feeMicro;
    const actualFeePaxi = upaxiToPaxi(actualFeeMicro);

    const allMessages = [];
    for (const r of state.batchRecipients) {
      let amountMicro;
      if (tokenType === 'native') {
        amountMicro = paxiToUpaxi(r.amount);
        const msg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: r.address, amount: [PaxiCosmJS.coins(amountMicro, denom)[0]] });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(msg).finish() }));
      } else if (tokenType === 'prc20') {
        const contractAddr = document.getElementById('btPrc20Contract')?.value.trim();
        if (!contractAddr) throw new Error('缺少 PRC-20 合约地址');
        let prc20Decimals = 6;
        try {
          const queryMsg = btoa(JSON.stringify({ token_info: {} }));
          const queryRes = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contractAddr}/smart/${queryMsg}`).then(r => r.json());
          if (queryRes?.data?.decimals !== undefined) prc20Decimals = queryRes.data.decimals;
        } catch (e) {}
        const rawAmount = parseFloatToRawUnits(r.amount, prc20Decimals);
        const msgObj = { transfer: { recipient: r.address, amount: rawAmount } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: contractAddr, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
      } else if (tokenType === 'nft') {
        const nftContract = document.getElementById('btNftContract')?.value.trim();
        if (!nftContract) throw new Error('缺少 NFT 合约地址');
        const msgObj = { transfer_nft: { recipient: r.address, token_id: String(r.amount) } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: nftContract, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
      }
    }
    if (actualFeeMicro !== '0') {
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: CONFIG.feeCollector, amount: [PaxiCosmJS.coins(actualFeeMicro, denom)[0]] });
      allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(feeMsg).finish() }));
    }

    const accountRes = await fetch(`${CONFIG.lcd}/cosmos/auth/v1beta1/accounts/${sender.address}`);
    const accountData = await accountRes.json();
    const account = accountData.account?.base_account || accountData.account;
    const accountNumber = Number(account.account_number);
    const sequence = Number(account.sequence);

    btn.innerHTML = '<span class="spinner"></span> 构建交易...';
    statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 打包发送 ${total} 笔转账 + 手续费</div><div style="font-size:13px;">📤 共 ${allMessages.length} 条消息打包中...</div>`;

    const txBody = PaxiCosmJS.TxBody.fromPartial({ messages: allMessages, memo: `Paxi Toolbox Transfer (${total} recipients) | Fee: ${actualFeePaxi} PAXI` });
    const totalGas = allMessages.length * 90000 + 200000;
    const fee = { amount: [PaxiCosmJS.coins(Math.floor(totalGas * 0.05).toString(), denom)[0]], gasLimit: totalGas };
    const pubkeyBytes = typeof sender.public_key === 'string' ? fromBase64(sender.public_key) : new Uint8Array(sender.public_key);
    const pubkeyAny = { typeUrl: '/cosmos.crypto.secp256k1.PubKey', value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish() };
    const authInfo = PaxiCosmJS.AuthInfo.fromPartial({ signerInfos: [{ publicKey: pubkeyAny, modeInfo: { single: { mode: 1 } }, sequence: BigInt(sequence) }], fee });
    const signDoc = PaxiCosmJS.SignDoc.fromPartial({ bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(), authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(), chainId, accountNumber: BigInt(accountNumber) });
    const txObj = { bodyBytes: toBase64(signDoc.bodyBytes), authInfoBytes: toBase64(signDoc.authInfoBytes), chainId, accountNumber: signDoc.accountNumber.toString() };

    btn.innerHTML = '<span class="spinner"></span> 等待钱包签名...';
    const result = await window.paxihub.paxi.signAndSendTransaction(txObj);
    if (!result || !result.success) throw new Error(result?.message || '签名失败或被拒绝');
    const sigBytes = fromBase64(result.success);
    const txRaw = PaxiCosmJS.TxRaw.fromPartial({ bodyBytes: signDoc.bodyBytes, authInfoBytes: signDoc.authInfoBytes, signatures: [sigBytes] });
    const txBytes = PaxiCosmJS.TxRaw.encode(txRaw).finish();
    const base64Tx = toBase64(txBytes);

    btn.innerHTML = '<span class="spinner"></span> 广播交易中...';
    const broadcastRes = await fetch(`${CONFIG.lcd}/cosmos/tx/v1beta1/txs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_bytes: base64Tx, mode: 'BROADCAST_MODE_SYNC' })
    }).then(r => r.json());
    const txResult = checkTxResult(broadcastRes);
    if (txResult.ok) {
      statusEl.className = 'status-msg success';
      statusEl.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:10px;color:var(--success)">✅ 全部完成！</div>
        <div style="font-size:13px;line-height:1.8;">📤 转账：${total} 笔${actualFeeMicro !== '0' ? `<br>💰 手续费：${actualFeePaxi} PAXI（已包含）` : ''}<br>🔗 <a href="https://explorer.paxinet.io/tx/${txResult.txhash}" target="_blank" style="color:var(--primary)">查看交易详情</a></div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;background:rgba(99,102,241,0.1);padding:8px 12px;border-radius:6px;">💡 接收方如果钱包不显示记录，请在「余额查询」中点击「📜 转入记录」查看完整链上记录</div>
      `;
      pollTxStatus(txResult.txhash);
      showToast(`✅ 完成！${total} 笔转账 + 手续费`, 'success');
    } else {
      throw new Error(`交易失败：${mapError(txResult.code, txResult.rawLog)}`);
    }
    refreshBalance();
    clearBatchTransfer();
  } catch (e) {
    console.error('Batch transfer error:', e);
    statusEl.className = 'status-msg error';
    statusEl.innerHTML = `❌ 执行失败：${mapError(undefined, e.message)}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行批量转账';
  }
}

// ============================================================
// 工具 2: 余额查询 + 转入记录
// ============================================================
function renderBalanceCheck() {
  return `
    <div class="card">
      <div class="card-title">${t('balanceCheck.title')}</div>
      <div class="tool-desc">${t('balanceCheck.desc')}</div>
      <div class="form-group">
        <label class="form-label">地址列表（每行一个）</label>
        <textarea id="bcAddrs" placeholder="${t('balanceCheck.placeholder')}"></textarea>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="queryBalances()">${t('balanceCheck.queryBtn')}</button>
        <button class="btn btn-outline btn-sm" onclick="exportBalances()" id="bcExportBtn" style="display:none">${t('balanceCheck.exportBtn')}</button>
      </div>
      <div class="status-msg" id="bcStatus"></div>
      <div id="bcResults" style="margin-top:16px"></div>
    </div>
    <div class="card" id="txHistoryCard" style="display:none">
      <div class="card-title">${t('balanceCheck.records')}</div>
      <div id="txHistoryContainer"></div>
    </div>
  `;
}

function bindBalanceCheckEvents() {}

let balanceResults = [];

async function queryBalances() {
  const text = document.getElementById('bcAddrs').value.trim();
  if (!text) { showStatus('bcStatus', '请输入地址列表', 'warning'); return; }
  const addrs = [...new Set(text.split('\n').map(a => a.trim()).filter(a => a.startsWith('paxi1')))];
  if (addrs.length === 0) { showStatus('bcStatus', t('balanceCheck.noAddr'), 'error'); return; }
  showStatus('bcStatus', t('balanceCheck.querying').replace('{count}', addrs.length), 'info');
  balanceResults = [];
  const batchSize = 10;
  for (let i = 0; i < addrs.length; i += batchSize) {
    const batch = addrs.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(addr => fetch(`${CONFIG.lcd}/cosmos/bank/v1beta1/balances/${addr}`).then(r => r.json())));
    for (let j = 0; j < batch.length; j++) {
      const addr = batch[j];
      const result = results[j];
      let paxiAmount = 0, otherTokens = [];
      if (result.status === 'fulfilled' && result.value.balances) {
        for (const b of result.value.balances) {
          if (b.denom === CONFIG.denom) paxiAmount = parseFloat(upaxiToPaxi(b.amount));
          else otherTokens.push(b);
        }
      }
      balanceResults.push({ address: addr, paxi: paxiAmount, tokens: otherTokens });
    }
  }
  const totalPaxi = balanceResults.reduce((s, r) => s + r.paxi, 0);
  document.getElementById('bcResults').innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${balanceResults.length}</div><div class="stat-label">查询地址数</div></div>
      <div class="stat-card"><div class="stat-value">${totalPaxi.toLocaleString()}</div><div class="stat-label">总 PAXI 余额</div></div>
      <div class="stat-card"><div class="stat-value">${balanceResults.filter(r => r.paxi > 0).length}</div><div class="stat-label">非零地址数</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>地址</th><th>PAXI 余额</th><th>其他代币</th><th>操作</th></tr></thead>
        <tbody>
          ${balanceResults.map((r, i) => `
            <tr>
              <td>${i+1}</td>
              <td><code>${escapeHtml(r.address.slice(0,14))}...${escapeHtml(r.address.slice(-8))}</code></td>
              <td style="font-weight:600;color:${r.paxi > 0 ? 'var(--success)' : 'var(--text-muted)'}">${r.paxi.toLocaleString()}</td>
              <td>${r.tokens.length > 0 ? r.tokens.map(t => escapeHtml(t.denom)).join(', ') : '-'}</td>
              <td><button class="btn btn-outline btn-sm" onclick="showAddressTxHistory('${r.address}')">📜 ${t('balanceCheck.records')}</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('bcExportBtn').style.display = 'inline-flex';
  showStatus('bcStatus', t('balanceCheck.done').replace('{count}', balanceResults.length), 'success');
}

function exportBalances() {
  if (!balanceResults.length) return;
  const csv = '地址,PAXI余额,其他代币\n' + balanceResults.map(r => `${r.address},${r.paxi},${r.tokens.map(t => t.denom + ':' + t.amount).join(';')}`).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'paxi_balances.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function showAddressTxHistory(address) {
  const card = document.getElementById('txHistoryCard');
  const container = document.getElementById('txHistoryContainer');
  if (!card || !container) return;
  card.style.display = 'block';
  container.innerHTML = '<p style="color:var(--text-muted)">⏳ 加载中...</p>';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    let txs = [], found = false;
    const queryMethods = [
      `events=transfer.recipient='${address}'`,
      `events=message.recipient='${address}'`,
      `events=coin_received.receiver='${address}'`
    ];
    for (const query of queryMethods) {
      try {
        const url = `${CONFIG.lcd}/cosmos/tx/v1beta1/txs?${query}&pagination.limit=30&order_by=DESC`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.tx_responses && data.tx_responses.length > 0) {
            txs = data.tx_responses;
            found = true;
            break;
          }
        }
      } catch (e) {}
    }
    if (!found || txs.length === 0) {
      try {
        const url = `${CONFIG.lcd}/cosmos/tx/v1beta1/txs?events=message.sender='${address}'&pagination.limit=10&order_by=DESC`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.tx_responses && data.tx_responses.length > 0) {
            const sentTxs = data.tx_responses || [];
            const allTxMap = {};
            for (const tx of [...txs, ...sentTxs]) if (tx.txhash) allTxMap[tx.txhash] = tx;
            txs = Object.values(allTxMap);
            found = true;
          }
        }
      } catch (e) {}
    }
    if (!found || txs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:40px;margin-bottom:12px;">🔍</div>
          <p style="color:var(--text-muted);font-size:14px;margin-bottom:12px;">未找到该地址的交易记录</p>
          <p style="font-size:13px;margin-bottom:16px;">请直接在区块浏览器查看完整交易记录：</p>
          <a href="https://explorer.paxinet.io/address/${address}" target="_blank" style="display:inline-block;padding:10px 24px;background:var(--primary);color:white;border-radius:8px;text-decoration:none;font-weight:600;">🔗 打开区块浏览器</a>
          <div style="font-size:12px;color:var(--text-muted);margin-top:12px;">💡 在区块浏览器中搜索你的地址，即可看到所有转入/转出记录</div>
        </div>
      `;
      return;
    }
    let html = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">📌 地址：<code style="word-break:break-all;font-size:11px;">${escapeHtml(address)}</code><span style="margin-left:12px;font-size:11px;color:var(--success);">✅ 找到 ${txs.length} 笔交易</span></div><div style="max-height:500px;overflow-y:auto;">`;
    let hasTransfer = false;
    for (const tx of txs.slice(0,30)) {
      const msgs = tx.tx?.body?.messages || [];
      const success = tx.code === 0;
      const time = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '--';
      for (const m of msgs) {
        const typeUrl = m['@type'] || m.typeUrl || '';
        let from='', to='', amount='0', denom='upaxi';
        if (typeUrl.includes('MsgSend')) {
          const msgData = m.value || m;
          from = msgData.from_address || '--';
          to = msgData.to_address || '--';
          if (msgData.amount && msgData.amount.length > 0) {
            amount = msgData.amount[0].amount || '0';
            denom = msgData.amount[0].denom || 'upaxi';
          }
        }
        if (from === address || to === address) {
          hasTransfer = true;
          const isReceived = to === address;
          const displayAmount = denom === 'upaxi' ? upaxiToPaxi(amount) : amount;
          const isBatch = msgs.length > 1;
          html += `
            <div style="background:var(--bg);border-radius:6px;padding:8px 12px;margin-bottom:4px;border-left:3px solid ${success ? (isReceived ? 'var(--success)' : 'var(--warning)') : 'var(--danger)'};">
              <div style="display:flex;justify-content:space-between;font-size:11px;">
                <span>
                  ${success ? '✅' : '❌'}
                  ${isReceived ? `<span style="color:var(--success);font-weight:600;">⬇️ +${displayAmount} ${denom === 'upaxi' ? 'PAXI' : denom}</span>` : `<span style="color:var(--warning);font-weight:600;">⬆️ -${displayAmount} ${denom === 'upaxi' ? 'PAXI' : denom}</span>`}
                  <span style="color:var(--text-muted);font-size:10px;">${isReceived ? '从' : '到'} ${isReceived ? from.slice(0,10) : to.slice(0,10)}...${isReceived ? from.slice(-4) : to.slice(-4)}</span>
                  ${isBatch ? `<span style="color:var(--warning);font-size:9px;background:rgba(245,158,11,0.15);padding:1px 6px;border-radius:4px;">📦 批量</span>` : ''}
                </span>
                <span style="color:var(--text-muted);font-size:10px;">${time}</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">
                Tx: <code>${tx.txhash.slice(0,16)}...</code>
                <a href="https://explorer.paxinet.io/tx/${tx.txhash}" target="_blank" style="color:var(--primary);">🔗</a>
                ${isBatch ? `<span style="color:var(--text-muted);font-size:10px;">（共${msgs.length}条消息）</span>` : ''}
              </div>
            </div>
          `;
        }
      }
    }
    if (!hasTransfer) html += `<p style="color:var(--text-muted);text-align:center;padding:20px 0;">未找到与当前地址相关的转账记录</p>`;
    html += `</div><div style="text-align:center;margin-top:10px;font-size:12px;"><a href="https://explorer.paxinet.io/address/${address}" target="_blank" style="color:var(--primary);">🔗 在区块浏览器查看全部交易 →</a><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">💡 批量空投的转账都在「转入记录」中，如果钱包不显示，请以区块浏览器为准</div></div>`;
    container.innerHTML = html;
  } catch (e) {
    console.error('查询交易记录失败:', e);
    container.innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:40px;margin-bottom:12px;">🔍</div>
        <p style="color:var(--danger);font-size:14px;margin-bottom:12px;">❌ 查询失败：${e.message}</p>
        <p style="font-size:13px;margin-bottom:16px;">请直接在区块浏览器查看完整交易记录：</p>
        <a href="https://explorer.paxinet.io/address/${address}" target="_blank" style="display:inline-block;padding:10px 24px;background:var(--primary);color:white;border-radius:8px;text-decoration:none;font-weight:600;">🔗 打开区块浏览器</a>
        <div style="font-size:12px;color:var(--text-muted);margin-top:12px;">💡 在区块浏览器中搜索你的地址，即可看到所有转入/转出记录</div>
      </div>
    `;
  }
}

// ============================================================
// 工具 3: 交易追踪
// ============================================================
function renderTxTracker() {
  return `
    <div class="card">
      <div class="card-title">${t('txTracker.title')}</div>
      <div class="tool-desc">${t('txTracker.desc')}</div>
      <div class="form-group">
        <label class="form-label">交易哈希</label>
        <input type="text" id="txHash" placeholder="${t('txTracker.placeholder')}">
      </div>
      <button class="btn btn-primary" onclick="trackTransaction()">${t('txTracker.queryBtn')}</button>
      <div class="status-msg" id="txStatus"></div>
      <div id="txResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindTxTrackerEvents() {
  document.getElementById('txHash').addEventListener('keydown', (e) => { if (e.key === 'Enter') trackTransaction(); });
}
async function trackTransaction() {
  const hash = document.getElementById('txHash').value.trim();
  if (!hash) { showStatus('txStatus', '请输入交易哈希', 'warning'); return; }
  showStatus('txStatus', '查询中...', 'info');
  try {
    const data = await fetchAPI(`/cosmos/tx/v1beta1/txs/${hash}`);
    const tx = data.tx_response || data;
    const resultDiv = document.getElementById('txResult');
    if (!tx || !tx.txhash) { showStatus('txStatus', '未找到该交易', 'error'); return; }
    const success = tx.code === 0;
    resultDiv.innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value" style="color:${success ? 'var(--success)' : 'var(--danger)'}">${success ? '✅ 成功' : '❌ 失败'}</div><div class="stat-label">状态</div></div>
        <div class="stat-card"><div class="stat-value">${tx.height || '-'}</div><div class="stat-label">区块高度</div></div>
        <div class="stat-card"><div class="stat-value">${tx.gas_used || '-'} / ${tx.gas_wanted || '-'}</div><div class="stat-label">Gas 使用</div></div>
        <div class="stat-card"><div class="stat-value">${tx.tx?.body?.messages?.length || 0}</div><div class="stat-label">消息数</div></div>
      </div>
      <div class="card" style="background:var(--bg)">
        <div class="card-title" style="font-size:14px">📝 详细信息</div>
        <pre style="font-size:11px;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap;word-break:break-all">${JSON.stringify(tx, null, 2)}</pre>
      </div>
    `;
    showStatus('txStatus', '', '');
    document.getElementById('txStatus').style.display = 'none';
  } catch (e) {
    showStatus('txStatus', '查询失败：' + e.message, 'error');
  }
}

// ============================================================
// 工具 4: Gas 计算器
// ============================================================
function renderGasCalc() {
  return `
    <div class="card">
      <div class="card-title">${t('gasCalc.title')}</div>
      <div class="tool-desc">${t('gasCalc.desc')}</div>
      <div class="form-group">
        <label class="form-label">${t('gasCalc.type')}</label>
        <select id="gcTxType">
          <option value="send">${t('gasCalc.send')}</option>
          <option value="prc20">${t('gasCalc.prc20')}</option>
          <option value="nft">${t('gasCalc.nft')}</option>
          <option value="swap">${t('gasCalc.swap')}</option>
          <option value="stake">${t('gasCalc.stake')}</option>
          <option value="vote">${t('gasCalc.vote')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('gasCalc.price')}</label>
        <input type="number" id="gcGasPrice" value="0.05" step="0.01" min="0">
      </div>
      <button class="btn btn-primary" onclick="calculateGas()">${t('gasCalc.calcBtn')}</button>
      <div class="status-msg" id="gcStatus"></div>
      <div id="gcResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindGasCalcEvents() {}
function calculateGas() {
  const txType = document.getElementById('gcTxType').value;
  const gasPrice = parseFloat(document.getElementById('gcGasPrice').value);
  const gasEstimates = { send:80000, prc20:200000, nft:250000, swap:350000, stake:200000, vote:150000 };
  const gasUsed = gasEstimates[txType] || 100000;
  const feeUpaxi = gasUsed * gasPrice;
  const feePaxi = feeUpaxi / 1e6;
  document.getElementById('gcResult').innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${gasUsed.toLocaleString()}</div><div class="stat-label">预估 Gas 用量</div></div>
      <div class="stat-card"><div class="stat-value">${feeUpaxi.toLocaleString()}</div><div class="stat-label">费用 (upaxi)</div></div>
      <div class="stat-card"><div class="stat-value">${feePaxi.toFixed(6)}</div><div class="stat-label">费用 (PAXI)</div></div>
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">⚠️ 实际 Gas 消耗可能因合约逻辑复杂度而异。批量操作请在 Gas Limit 中累加。</p>
  `;
}

// ============================================================
// 工具 5: 地址格式转换
// ============================================================
function renderAddressConvert() {
  return `
    <div class="card">
      <div class="card-title">${t('addressConvert.title')}</div>
      <div class="tool-desc">${t('addressConvert.desc')}</div>
      <div class="form-group">
        <label class="form-label">输入地址</label>
        <input type="text" id="acInput" placeholder="${t('addressConvert.inputPlaceholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('addressConvert.target')}</label>
        <select id="acTarget">
          <option value="paxi">paxi (Paxi Network)</option>
          <option value="cosmos">cosmos (Cosmos Hub)</option>
          <option value="osmosis">osmosis (Osmosis)</option>
          <option value="juno">juno (Juno)</option>
          <option value="stars">stars (Stargaze)</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="convertAddress()">${t('addressConvert.convertBtn')}</button>
      <div class="status-msg" id="acStatus"></div>
    </div>
  `;
}
function bindAddressConvertEvents() {}
function convertAddress() {
  const input = document.getElementById('acInput').value.trim();
  const targetPrefix = document.getElementById('acTarget').value;
  if (!input) { showStatus('acStatus', '请输入地址', 'warning'); return; }
  try {
    const { prefix, data } = bech32Decode(input);
    const converted = bech32Encode(targetPrefix, data);
    showStatus('acStatus', `✅ 转换结果：<code style="word-break:break-all">${converted}</code>`, 'success');
  } catch (e) {
    showStatus('acStatus', '❌ ' + e.message, 'error');
  }
}

// Bech32 实现
const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_CONST = 1;
function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}
function bech32HrpExpand(hrp) {
  const result = [];
  for (const ch of hrp) {
    result.push(ch.charCodeAt(0) >> 5);
  }
  result.push(0);
  for (const ch of hrp) {
    result.push(ch.charCodeAt(0) & 31);
  }
  return result;
}
function bech32VerifyChecksum(hrp, data) {
  return bech32Polymod([...bech32HrpExpand(hrp), ...data]) === BECH32_CONST;
}
function bech32CreateChecksum(hrp, data) {
  const values = [...bech32HrpExpand(hrp), ...data];
  const polymod = bech32Polymod([...values, 0, 0, 0, 0, 0, 0]) ^ BECH32_CONST;
  const result = [];
  for (let i = 0; i < 6; i++) {
    result.push((polymod >> (5 * (5 - i))) & 31);
  }
  return result;
}
function bech32Decode(str) {
  if (str.length > 90) throw new Error('地址过长（超过90字符）');
  const separatorIdx = str.lastIndexOf('1');
  if (separatorIdx === -1 || separatorIdx === 0) throw new Error('无效的 Bech32 格式');
  const prefix = str.slice(0, separatorIdx);
  const dataStr = str.slice(separatorIdx + 1);
  if (dataStr.length < 6) throw new Error('数据部分过短');
  const data = [];
  for (const ch of dataStr) {
    const idx = BECH32_ALPHABET.indexOf(ch.toLowerCase());
    if (idx === -1) throw new Error('无效字符: ' + ch);
    data.push(idx);
  }
  if (!bech32VerifyChecksum(prefix, data)) {
    throw new Error('Bech32 校验和验证失败 — 地址无效');
  }
  const dataPart = data.slice(0, -6);
  const bytes = convertBits(dataPart, 5, 8, false);
  return { prefix, data: bytes };
}
function bech32Encode(prefix, bytes) {
  const data = convertBits(bytes, 8, 5, true);
  const checksum = bech32CreateChecksum(prefix, data);
  let result = prefix + '1';
  for (const w of [...data, ...checksum]) {
    result += BECH32_ALPHABET[w];
  }
  return result;
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0;
  let bits = 0;
  const result = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || (value >> fromBits) !== 0) {
      throw new Error('数值超出范围');
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) result.push((acc << (toBits - bits)) & maxv);
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('数据有填充位残留，可能已损坏');
  }
  return result;
}

// ============================================================
// 工具 6: 验证节点对比
// ============================================================
function renderValidatorCompare() {
  return `
    <div class="card">
      <div class="card-title">${t('validatorCompare.title')}</div>
      <div class="tool-desc">${t('validatorCompare.desc')}</div>
      <button class="btn btn-primary" onclick="loadValidatorData()">${t('validatorCompare.loadBtn')}</button>
      <div class="status-msg" id="vcStatus"></div>
      <div id="vcResults" style="margin-top:16px"></div>
    </div>
  `;
}
async function loadValidatorData() {
  showStatus('vcStatus', t('validatorCompare.loading'), 'info');
  try {
    const data = await fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100');
    const poolData = await fetchAPI('/cosmos/staking/v1beta1/pool');
    const bondedTokens = parseInt(poolData.pool?.bonded_tokens || '0') / 1e6;
    const validators = data.validators || [];
    const sorted = validators.map(v => ({
      moniker: v.description?.moniker || 'Unknown',
      address: v.operator_address,
      votingPower: parseInt(v.tokens || '0') / 1e6,
      commission: parseFloat(v.commission?.commission_rates?.rate || '0') * 100,
      status: v.status === 'BOND_STATUS_BONDED' ? '✅ 活跃' : '⚠️ 待定',
      jailed: v.jailed,
    })).sort((a,b) => b.votingPower - a.votingPower);
    const annualInflation = 0.08;
    const totalSupply = 72_000_000;
    const annualReward = totalSupply * annualInflation * 0.95;
    const estimatedAPR = bondedTokens > 0 ? (annualReward / bondedTokens) * 100 : 0;
    document.getElementById('vcResults').innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${sorted.length}</div><div class="stat-label">验证节点数</div></div>
        <div class="stat-card"><div class="stat-value">${bondedTokens.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="stat-label">总质押量 (PAXI)</div></div>
        <div class="stat-card"><div class="stat-value">${estimatedAPR.toFixed(1)}%</div><div class="stat-label">预估 APR</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>节点名称</th><th>状态</th><th>投票权重</th><th>佣金率</th><th>预估收益</th></tr></thead>
          <tbody>
            ${sorted.map((v,i) => {
              const netAPR = estimatedAPR * (1 - v.commission/100);
              return `<tr style="${v.jailed ? 'opacity:0.5' : ''}"><td>${i+1}</td><td style="font-weight:600">${escapeHtml(v.moniker)}${v.jailed ? ' 🔒' : ''}</td><td>${v.status}</td><td>${v.votingPower.toLocaleString()} PAXI</td><td>${v.commission.toFixed(1)}%</td><td style="color:var(--success);font-weight:600">~${netAPR.toFixed(1)}%</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    showStatus('vcStatus', t('validatorCompare.done').replace('{count}', sorted.length), 'success');
  } catch (e) {
    showStatus('vcStatus', '加载失败：' + e.message, 'error');
  }
}

// ============================================================
// 工具 7: 代币信息查询
// ============================================================
function renderTokenInfo() {
  return `
    <div class="card">
      <div class="card-title">${t('tokenInfo.title')}</div>
      <div class="tool-desc">${t('tokenInfo.desc')}</div>
      <div class="form-group">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="tiContract" placeholder="${t('tokenInfo.placeholder')}">
      </div>
      <button class="btn btn-primary" onclick="queryTokenInfo()">${t('tokenInfo.queryBtn')}</button>
      <div class="status-msg" id="tiStatus"></div>
      <div id="tiResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindTokenInfoEvents() {
  document.getElementById('tiContract').addEventListener('keydown', (e) => { if (e.key === 'Enter') queryTokenInfo(); });
}
async function queryTokenInfo() {
  const contract = document.getElementById('tiContract').value.trim();
  if (!contract) { showStatus('tiStatus', '请输入合约地址', 'warning'); return; }
  showStatus('tiStatus', '查询中...', 'info');
  try {
    const contractRes = await fetchAPI(`/cosmwasm/wasm/v1/contract/${contract}`);
    const codeId = contractRes.contract_info?.code_id;
    const queryMsg = { token_info: {} };
    const encodedMsg = btoa(JSON.stringify(queryMsg));
    const queryRes = await fetchAPI(`/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`).catch(() => null);
    if (queryRes?.data) {
      const info = queryRes.data;
      const decimals = info.decimals || 6;
      let totalSupplyDisplay = '-';
      if (info.total_supply) {
        try {
          const supplyBigInt = BigInt(info.total_supply);
          const divisor = BigInt(10 ** decimals);
          const intPart = supplyBigInt / divisor;
          const decPart = (supplyBigInt % divisor).toString().padStart(decimals, '0');
          totalSupplyDisplay = intPart.toLocaleString() + '.' + decPart.slice(0,4);
        } catch (e) { totalSupplyDisplay = info.total_supply; }
      }
      document.getElementById('tiResult').innerHTML = `
        <div class="stats-row">
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${escapeHtml(info.name || '-')}</div><div class="stat-label">代币名称</div></div>
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${escapeHtml(info.symbol || '-')}</div><div class="stat-label">代币符号</div></div>
          <div class="stat-card"><div class="stat-value">${decimals}</div><div class="stat-label">小数位</div></div>
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${totalSupplyDisplay}</div><div class="stat-label">总供应量</div></div>
        </div>
        <div class="card" style="background:var(--bg);margin-top:12px">
          <div class="card-title" style="font-size:14px">📋 合约信息</div>
          <p style="font-size:13px"><strong>合约地址：</strong><code>${contract}</code></p>
          <p style="font-size:13px"><strong>Code ID：</strong>${codeId || '-'}</p>
          <p style="font-size:13px"><strong>创建者：</strong><code>${contractRes.contract_info?.creator || '-'}</code></p>
        </div>
      `;
      showStatus('tiStatus', '', '');
      document.getElementById('tiStatus').style.display = 'none';
    } else {
      showStatus('tiStatus', '⚠️ 无法查询该合约信息（可能不是 PRC-20 合约）', 'warning');
    }
  } catch (e) {
    showStatus('tiStatus', '查询失败：' + e.message, 'error');
  }
}

// ============================================================
// 工具 8: NFT 市场（完整）
// ============================================================
const LS_KEY_LISTINGS = 'paxi_nft_market_listings';
const LS_KEY_IMPORTED = 'paxi_nft_market_imported';

function getMarketListings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_LISTINGS) || '[]'); }
  catch { return []; }
}
function saveListing(listing) {
  const list = getMarketListings();
  list.unshift(listing);
  localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
}
function removeListing(listingId) {
  let list = getMarketListings();
  list = list.filter(l => l.id !== listingId);
  localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
}
function updateListing(listingId, updates) {
  const list = getMarketListings();
  const idx = list.findIndex(l => l.id === listingId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
  }
}
function getImportedListings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_IMPORTED) || '[]'); }
  catch { return []; }
}
function saveImportedListing(listing) {
  const list = getImportedListings();
  if (!list.find(l => l.id === listing.id)) {
    list.unshift(listing);
    localStorage.setItem(LS_KEY_IMPORTED, JSON.stringify(list));
  }
}
function removeImportedListing(listingId) {
  let list = getImportedListings();
  list = list.filter(l => l.id !== listingId);
  localStorage.setItem(LS_KEY_IMPORTED, JSON.stringify(list));
}
function getAllActiveListings() {
  const own = getMarketListings().filter(l => l.status === 'listed' || l.status === 'granted');
  const imported = getImportedListings().filter(l => l.status === 'listed' || l.status === 'granted');
  const seen = new Set();
  const all = [...own, ...imported].filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  return all.filter(l => new Date(l.expiresAt) > new Date());
}

function generateShareCode(listing) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(listing))));
}
function parseShareCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}
function generateBuyRequestCode(listing, buyer) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({
    type: 'buy_request',
    listingId: listing.id,
    contract: listing.contract,
    tokenId: listing.tokenId,
    price: listing.price,
    seller: listing.seller,
    buyer,
    timestamp: new Date().toISOString(),
  }))));
}
function parseBuyRequestCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}

async function queryNftOwner(contract, tokenId) {
  const queryMsg = { owner_of: { token_id: String(tokenId) } };
  const encodedMsg = btoa(JSON.stringify(queryMsg));
  const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
  if (!res.ok) throw new Error(`查询 NFT owner 失败: HTTP ${res.status}`);
  const data = await res.json();
  return data.data?.owner;
}
async function queryNftInfo(contract, tokenId) {
  const owner = await queryNftOwner(contract, tokenId);
  let info = {};
  try {
    const queryMsg = { nft_info: { token_id: String(tokenId) } };
    const encodedMsg = btoa(JSON.stringify(queryMsg));
    const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
    if (res.ok) {
      const data = await res.json();
      info = data.data || {};
    }
  } catch (e) {}
  return {
    access: { owner, approvals: [] },
    info: { token_uri: info.token_uri || '', extension: info.extension || {} },
  };
}
async function checkGrantStatus(seller, buyer) {
  const url = `${CONFIG.lcd}/cosmos/authz/v1beta1/grants?granter=${seller}&grantee=${buyer}&msg_type_url=${encodeURIComponent(CONFIG.nftMarket.msgTypeUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`查询授权失败: HTTP ${res.status}`);
  const data = await res.json();
  const grants = data.grants || [];
  if (grants.length === 0) return null;
  const grant = grants[0];
  const exp = grant.expiration ? new Date(grant.expiration) : null;
  if (exp && exp < new Date()) return null;
  return grant;
}

function renderNftMarket() {
  if (state.nftMarket.currentBuy) {
    return renderBuyFlow();
  }
  const sub = state.nftMarket.subTab;
  const tabs = [
    { key: 'browse', label: t('nftMarket.tabs')[0] },
    { key: 'list', label: t('nftMarket.tabs')[1] },
    { key: 'mine', label: t('nftMarket.tabs')[2] },
    { key: 'import', label: t('nftMarket.tabs')[3] },
  ];
  let content = '';
  switch (sub) {
    case 'browse': content = renderMarketBrowse(); break;
    case 'list': content = renderMarketListForm(); break;
    case 'mine': content = renderMarketMine(); break;
    case 'import': content = renderMarketImport(); break;
  }
  return `
    <div class="card">
      <div class="card-title">${t('nftMarket.title')}</div>
      <div class="tool-desc">${t('nftMarket.desc')}</div>
      <div class="sub-tabs">
        ${tabs.map(t => `<div class="sub-tab ${sub === t.key ? 'active' : ''}" data-nft-tab="${t.key}">${t.label}</div>`).join('')}
      </div>
    </div>
    ${content}
  `;
}
function bindNftMarketEvents() {
  document.querySelectorAll('[data-nft-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.nftMarket.subTab = tab.dataset.nftTab;
      renderTool('nft-market');
    });
  });
  if (state.nftMarket.subTab === 'import') {
    renderImportedList();
  }
  if (state.nftMarket.currentBuy) {
    const codeEl = document.getElementById('buyReqCode');
    if (codeEl) {
      const code = generateBuyRequestCode(state.nftMarket.currentBuy.listing, state.wallet.address);
      codeEl.textContent = code;
    }
  }
}
function scrollToGrantPanel() {
  const el = document.getElementById('grantBuyRequest');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  }
}

function renderMarketBrowse() {
  const listings = getAllActiveListings();
  if (listings.length === 0) {
    return `
      <div class="card">
        <div style="text-align:center;padding:32px 16px;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">🏪</div>
          <div style="font-size:14px;margin-bottom:8px">暂无在售 NFT</div>
          <div style="font-size:12px">从卖家获取分享码，在「导入」页粘贴即可浏览</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="nft-market-grid">
      ${listings.map(l => {
        const isOwn = l.seller === state.wallet?.address;
        const expired = new Date(l.expiresAt) < new Date();
        return `
          <div class="nft-card">
            <div class="nft-card-img">
              ${l.image ? `<img src="${sanitizeUrl(l.image)}" alt="NFT" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
              <div class="nft-card-placeholder" style="${l.image ? 'display:none' : 'display:flex'}">🎨</div>
            </div>
            <div class="nft-card-body">
              <div class="nft-card-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
              <div class="nft-card-meta">Token #${escapeHtml(l.tokenId)}</div>
              <div class="nft-card-price">${escapeHtml(l.price)} PAXI</div>
              <div class="nft-card-seller">卖家: ${escapeHtml(l.seller.slice(0,10))}...${escapeHtml(l.seller.slice(-4))}</div>
              ${expired
                ? '<div class="nft-card-badge" style="color:var(--danger)">已过期</div>'
                : isOwn
                  ? '<div class="nft-card-badge" style="color:var(--text-muted)">我的</div>'
                  : `<button class="btn btn-primary btn-block" onclick="startBuyFlow('${l.id}')">购买</button>`
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
function renderMarketListForm() {
  return `
    <div class="card">
      <div class="card-title">📤 上架 NFT</div>
      <div class="tool-desc">
        填写 NFT 合约地址和 Token ID，系统将查询链上信息确认你持有该 NFT，
        然后生成分享码供买家导入。上架免费，授权时收取 ${CONFIG.nftMarket.listingFee} PAXI 服务费。
      </div>
      <div class="form-group">
        <label class="form-label">NFT 合约地址 *</label>
        <input type="text" id="nmContract" placeholder="paxi1...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Token ID *</label>
          <input type="text" id="nmTokenId" placeholder="例如：1">
        </div>
        <div class="form-group">
          <label class="form-label">售价 (PAXI) *</label>
          <input type="number" id="nmPrice" placeholder="100" step="0.01" min="0">
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="queryNftForListing()">🔍 查询NFT信息</button>
        <button class="btn btn-primary" id="btnListNft" onclick="listNft()">📤 上架</button>
      </div>
      <div id="nmPreview" style="margin-top:16px"></div>
      <div class="status-msg" id="nmStatus"></div>
    </div>
  `;
}
function renderMarketMine() {
  const listings = getMarketListings();
  if (listings.length === 0) {
    return `
      <div class="card">
        <div style="text-align:center;padding:32px 16px;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">📋</div>
          <div style="font-size:14px">暂无上架记录</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="card">
      <div class="card-title">📋 我的上架</div>
      ${listings.map(l => {
        const expired = new Date(l.expiresAt) < new Date();
        const statusLabel = l.status === 'sold' ? '已售' : l.status === 'delisted' ? '已下架' : expired ? '已过期' : l.status === 'granted' ? '已授权' : '在售';
        const statusColor = l.status === 'sold' ? 'var(--success)' : l.status === 'delisted' ? 'var(--text-muted)' : expired ? 'var(--danger)' : l.status === 'granted' ? 'var(--warning)' : 'var(--primary)';
        return `
          <div class="listing-item">
            <div class="listing-item-main">
              <div class="listing-item-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
              <div class="listing-item-meta">
                Token #${escapeHtml(l.tokenId)} · ${escapeHtml(l.price)} PAXI
              </div>
              <div class="listing-item-meta">
                <code style="word-break:break-all;font-size:10px">${escapeHtml(l.contract.slice(0,16))}...</code>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(99,102,241,0.15);color:${statusColor}">${statusLabel}</span>
                <span style="font-size:11px;color:var(--text-muted)">${new Date(l.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="listing-item-actions">
              ${(l.status === 'listed' || l.status === 'granted') && !expired
                ? `<button class="btn btn-outline btn-sm" onclick="copyShareCode('${l.id}')">📋 分享码</button>`
                : ''}
              ${l.status === 'listed' && !expired
                ? `<button class="btn btn-outline btn-sm" onclick="scrollToGrantPanel()">🔑 授权</button>`
                : ''}
              ${l.status === 'granted' && l.grantee && !expired
                ? `<button class="btn btn-danger btn-sm" onclick="revokeGrant('${l.grantee}','${l.id}')">撤销授权</button>`
                : ''}
              ${l.status !== 'sold'
                ? `<button class="btn btn-outline btn-sm" onclick="delistNft('${l.id}')">下架</button>`
                : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">🔑 授权买家</div>
      <div class="tool-desc">
        买家向你发送购买请求码后，在此粘贴并授权。授权后买家可在 <strong style="color:var(--warning)">${CONFIG.nftMarket.grantDurationSec / 60} 分钟</strong>内执行购买。
      </div>
      <div class="info-box" style="background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.3)">
        <strong style="color:var(--warning)">⚠️ 安全提示：</strong>
        Authz 授权按消息类型生效，买家可在有效期内代表你执行任意 <code>MsgExecuteContract</code>。
        请仅授权给信任的买家，授权时长已缩短至 ${CONFIG.nftMarket.grantDurationSec / 60} 分钟。成交或下架后授权将自动失效。
      </div>
      <div class="form-group">
        <label class="form-label">购买请求码</label>
        <textarea id="grantBuyRequest" placeholder="粘贴买家发来的购买请求码..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn-primary" id="btnGrantNft" onclick="grantNft()">🔑 授权交易</button>
      <div class="status-msg" id="grantStatus"></div>
    </div>
  `;
}
function renderMarketImport() {
  return `
    <div class="card">
      <div class="card-title">📥 导入 NFT 订单</div>
      <div class="tool-desc">粘贴卖家分享的 NFT 上架码，导入后可在「市场浏览」中查看和购买。</div>
      <div class="form-group">
        <label class="form-label">分享码</label>
        <textarea id="importCode" placeholder="粘贴卖家分享的上架码..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn-primary" onclick="importListing()">📥 导入</button>
      <div class="status-msg" id="importStatus"></div>
    </div>
    <div class="card">
      <div class="card-title">📥 已导入的订单</div>
      <div id="importedList"></div>
    </div>
  `;
}
function renderImportedList() {
  const list = getImportedListings();
  const el = document.getElementById('importedList');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">暂无导入的订单</p>';
    return;
  }
  el.innerHTML = list.map(l => {
    const expired = new Date(l.expiresAt) < new Date();
    return `
      <div class="listing-item">
        <div class="listing-item-main">
          <div class="listing-item-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
          <div class="listing-item-meta">Token #${escapeHtml(l.tokenId)} · ${escapeHtml(l.price)} PAXI</div>
          <div class="listing-item-meta">卖家: ${escapeHtml(l.seller.slice(0,12))}...${escapeHtml(l.seller.slice(-4))}</div>
          ${expired ? '<span style="font-size:11px;color:var(--danger)">已过期</span>' : ''}
        </div>
        <div class="listing-item-actions">
          <button class="btn btn-outline btn-sm" onclick="removeImportedListing('${l.id}');renderImportedList();">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderBuyFlow() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return '';
  const l = buy.listing;
  const step = buy.step;
  const fee = (parseFloat(l.price) * CONFIG.nftMarket.buyFeeRate / 100).toFixed(4);
  const total = (parseFloat(l.price) + parseFloat(fee)).toFixed(6);
  return `
    <div class="card">
      <div class="back-bar" onclick="cancelBuyFlow()">← 返回市场</div>
      <div class="card-title">🛒 购买 NFT</div>
      <div class="nft-buy-detail">
        <div class="nft-card-img" style="width:120px;height:120px;margin:0 auto 12px">
          ${l.image ? `<img src="${sanitizeUrl(l.image)}" style="width:120px;height:120px;border-radius:12px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:120px;height:120px;border-radius:12px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:40px">🎨</div>'}
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-weight:700">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
          <div style="font-size:12px;color:var(--text-muted)">Token #${escapeHtml(l.tokenId)}</div>
        </div>
        <div class="price-breakdown">
          <div class="price-row"><span>售价</span><span>${escapeHtml(l.price)} PAXI</span></div>
          <div class="price-row"><span>平台费 (${CONFIG.nftMarket.buyFeeRate}%)</span><span>${fee} PAXI</span></div>
          <div class="price-row total"><span>合计</span><span>${total} PAXI</span></div>
        </div>
      </div>
      <div class="buy-steps">
        <div class="buy-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}">
          <div class="buy-step-num">${step > 1 ? '✓' : '1'}</div>
          <div class="buy-step-label">复制地址</div>
        </div>
        <div class="buy-step-line ${step > 1 ? 'done' : ''}"></div>
        <div class="buy-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}">
          <div class="buy-step-num">${step > 2 ? '✓' : '2'}</div>
          <div class="buy-step-label">等待授权</div>
        </div>
        <div class="buy-step-line"></div>
        <div class="buy-step ${step >= 3 ? 'active' : ''}">
          <div class="buy-step-num">3</div>
          <div class="buy-step-label">执行购买</div>
        </div>
      </div>
      ${step === 1 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">将以下地址或购买请求码发送给卖家，卖家授权后进入下一步。</p>
          <div class="copy-box">
            <label class="form-label">你的钱包地址</label>
            <div class="copy-row">
              <code style="flex:1;word-break:break-all;font-size:11px">${escapeHtml(state.wallet?.address || '')}</code>
              <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${state.wallet?.address || ''}').then(()=>showToast('已复制','success'))">📋</button>
            </div>
          </div>
          <div class="copy-box">
            <label class="form-label">购买请求码（含NFT信息，推荐）</label>
            <div class="copy-row">
              <code id="buyReqCode" style="flex:1;word-break:break-all;font-size:10px"></code>
              <button class="btn btn-outline btn-sm" id="btnCopyBuyReq" onclick="copyBuyReqCode()">📋</button>
            </div>
          </div>
          <button class="btn btn-primary btn-block" onclick="advanceBuyStep(2)">已发送，下一步 →</button>
        </div>
      ` : ''}
      ${step === 2 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">确认卖家已授权后，点击下方检查授权状态。</p>
          <button class="btn btn-outline btn-block" onclick="checkBuyGrant()">🔍 检查授权状态</button>
          <div class="status-msg" id="buyGrantStatus"></div>
          <button class="btn btn-primary btn-block" id="btnBuyStep3" style="margin-top:12px;display:none" onclick="advanceBuyStep(3)">授权确认，执行购买 →</button>
        </div>
      ` : ''}
      ${step === 3 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">点击执行原子购买，一笔交易同时付款 + NFT 到账。</p>
          <button class="btn btn-success btn-block" id="btnExecuteBuy" onclick="executeBuy()">🚀 执行原子购买</button>
          <div class="status-msg" id="buyExecuteStatus"></div>
        </div>
      ` : ''}
    </div>
  `;
}

// ---- NFT 市场操作函数 ----
async function queryNftForListing() {
  const contract = document.getElementById('nmContract')?.value.trim();
  const tokenId = document.getElementById('nmTokenId')?.value.trim();
  const preview = document.getElementById('nmPreview');
  if (!contract || !tokenId) {
    showStatus('nmStatus', '请填写合约地址和 Token ID', 'warning');
    return;
  }
  showStatus('nmStatus', '查询中...', 'info');
  try {
    const info = await queryNftInfo(contract, tokenId);
    const owner = info.access?.owner;
    const ext = info.info?.extension || {};
    const name = ext.name || ext.token_name || '';
    const image = ext.image || ext.image_url || '';
    const isOwner = state.wallet && owner === state.wallet.address;
    preview.innerHTML = `
      <div class="nft-preview-box">
        ${image ? `<img src="${sanitizeUrl(image)}" style="width:100px;height:100px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:100px;height:100px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:32px">🎨</div>'}
        <div>
          <div style="font-weight:700">${escapeHtml(name || 'NFT #' + tokenId)}</div>
          <div style="font-size:12px;color:var(--text-muted)">Token #${escapeHtml(tokenId)}</div>
          <div style="font-size:12px;margin-top:4px">持有者: <code style="font-size:10px">${escapeHtml(owner ? owner.slice(0,14)+'...' : '未知')}</code></div>
          <div style="font-size:12px;margin-top:4px;color:${isOwner ? 'var(--success)' : 'var(--danger)'}">${isOwner ? '✅ 你持有此 NFT' : '❌ 你不是此 NFT 的持有者'}</div>
        </div>
      </div>
    `;
    showStatus('nmStatus', '', '');
    document.getElementById('nmStatus').style.display = 'none';
  } catch (e) {
    showStatus('nmStatus', '查询失败：' + e.message, 'error');
    preview.innerHTML = '';
  }
}
async function listNft() {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const contract = document.getElementById('nmContract').value.trim();
  const tokenId = document.getElementById('nmTokenId').value.trim();
  const priceStr = document.getElementById('nmPrice').value.trim();
  if (!contract || !tokenId || !priceStr) {
    showStatus('nmStatus', '请填写所有必填项', 'warning');
    return;
  }
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) {
    showStatus('nmStatus', '价格必须大于 0', 'warning');
    return;
  }
  const btn = document.getElementById('btnListNft');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 上架中...';
  try {
    const info = await queryNftInfo(contract, tokenId);
    const owner = info.access?.owner;
    if (!owner) throw new Error('无法查询 NFT 持有者');
    if (owner !== state.wallet.address) throw new Error('你不是此 NFT 的持有者');
    const existingListings = getMarketListings();
    const duplicate = existingListings.find(l =>
      l.contract === contract &&
      l.tokenId === String(tokenId) &&
      (l.status === 'listed' || l.status === 'granted') &&
      new Date(l.expiresAt) > new Date()
    );
    if (duplicate) throw new Error('此 NFT 已在售（已上架且未过期），请先下架再重新上架');
    const ext = info.info?.extension || {};
    const name = ext.name || ext.token_name || `NFT #${tokenId}`;
    const image = ext.image || ext.image_url || '';
    const now = new Date();
    const listing = {
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      contract, tokenId: String(tokenId), price: priceStr,
      priceMicro: paxiToUpaxi(priceStr),
      seller: state.wallet.address, name, image,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CONFIG.nftMarket.listingDurationSec * 1000).toISOString(),
      status: 'listed'
    };
    saveListing(listing);
    const shareCode = generateShareCode(listing);
    showStatus('nmStatus', '✅ 上架成功！', 'success');
    document.getElementById('nmPreview').innerHTML = `
      <div class="info-box">
        <strong>📋 分享码（发送给买家）：</strong>
        <div class="copy-row" style="margin-top:8px">
          <code id="listShareCode" style="flex:1;word-break:break-all;font-size:10px">${escapeHtml(shareCode)}</code>
          <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${shareCode}').then(()=>showToast('已复制','success'))">📋</button>
        </div>
      </div>
    `;
    showToast('上架成功！', 'success');
  } catch (e) {
    showStatus('nmStatus', '❌ 上架失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📤 上架';
  }
}
function copyShareCode(listingId) {
  const listing = getMarketListings().find(l => l.id === listingId);
  if (!listing) return;
  const code = generateShareCode(listing);
  copyToClipboard(code).then(() => showToast('分享码已复制', 'success'));
}
function importListing() {
  const code = document.getElementById('importCode').value.trim();
  if (!code) { showStatus('importStatus', '请粘贴分享码', 'warning'); return; }
  try {
    const listing = parseShareCode(code);
    if (!listing.contract || !listing.tokenId || !listing.seller || !listing.price) {
      throw new Error('分享码格式不正确');
    }
    saveImportedListing(listing);
    showStatus('importStatus', `✅ 导入成功：${escapeHtml(listing.name || 'NFT #' + listing.tokenId)}`, 'success');
    document.getElementById('importCode').value = '';
    renderImportedList();
  } catch (e) {
    showStatus('importStatus', '❌ 导入失败：' + e.message, 'error');
  }
}
function startBuyFlow(listingId) {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const listings = getAllActiveListings();
  const listing = listings.find(l => l.id === listingId);
  if (!listing) { showToast('订单不存在或已过期', 'error'); return; }
  if (listing.seller === state.wallet.address) { showToast('不能购买自己的 NFT', 'error'); return; }
  state.nftMarket.currentBuy = { listing, step: 1 };
  renderTool('nft-market');
}
function cancelBuyFlow() {
  state.nftMarket.currentBuy = null;
  state.nftMarket.subTab = 'browse';
  renderTool('nft-market');
}
function advanceBuyStep(step) {
  if (state.nftMarket.currentBuy) {
    state.nftMarket.currentBuy.step = step;
    renderTool('nft-market');
  }
}
function copyBuyReqCode() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const code = generateBuyRequestCode(buy.listing, state.wallet.address);
  copyToClipboard(code).then(() => showToast('购买请求码已复制', 'success'));
}
async function checkBuyGrant() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const seller = buy.listing.seller;
  const buyer = state.wallet.address;
  showStatus('buyGrantStatus', '查询授权中...', 'info');
  try {
    const grant = await checkGrantStatus(seller, buyer);
    if (grant) {
      showStatus('buyGrantStatus', '✅ 卖家已授权！可以执行购买了', 'success');
      document.getElementById('btnBuyStep3').style.display = 'inline-flex';
    } else {
      showStatus('buyGrantStatus', '⏳ 卖家尚未授权，或授权已过期。请提醒卖家授权。', 'warning');
    }
  } catch (e) {
    showStatus('buyGrantStatus', '❌ 查询失败：' + e.message, 'error');
  }
}
async function grantNft() {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const code = document.getElementById('grantBuyRequest').value.trim();
  if (!code) { showStatus('grantStatus', '请粘贴购买请求码', 'warning'); return; }
  const btn = document.getElementById('btnGrantNft');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 授权中...';
  try {
    const req = parseBuyRequestCode(code);
    if (req.type !== 'buy_request' || !req.buyer) throw new Error('购买请求码格式不正确');
    if (req.seller !== state.wallet.address) throw new Error('此购买请求不是发给你');
    const listings = getMarketListings();
    const listing = listings.find(l => l.id === req.listingId);
    if (!listing) throw new Error('找不到对应的上架记录');
    const now = Math.floor(Date.now() / 1000);
    const expiration = { seconds: BigInt(now + CONFIG.nftMarket.grantDurationSec), nanos: 0 };
    const genericAuthBytes = PaxiCosmJS.GenericAuthorization.encode({
      msg: CONFIG.nftMarket.msgTypeUrl,
    }).finish();
    const authorization = { typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization', value: genericAuthBytes };
    const grant = { authorization, expiration };
    const grantMsg = PaxiCosmJS.MsgGrant.fromPartial({
      granter: state.wallet.address,
      grantee: req.buyer,
      grant,
    });
    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: PaxiCosmJS.MsgGrant.encode(grantMsg).finish(),
    })];
    const feeMicro = paxiToUpaxi(CONFIG.nftMarket.listingFee.toFixed(6));
    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [PaxiCosmJS.coins(feeMicro, CONFIG.denom)[0]],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    }));
    btn.innerHTML = '<span class="spinner"></span> 等待签名...';
    const memo = `Paxi NFT Market: Grant to ${req.buyer.slice(0,12)}... | Fee: ${CONFIG.nftMarket.listingFee} PAXI`;
    const res = await buildSignAndBroadcast(messages, memo, 300000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      updateListing(listing.id, { status: 'granted', grantee: req.buyer });
      showStatus('grantStatus', `✅ 授权成功！买家可在 ${CONFIG.nftMarket.grantDurationSec / 60} 分钟内执行购买。TxHash: ${txResult.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) showToast('交易已上链确认', 'success');
        else if (conf.confirmed && !conf.success) showToast('交易上链但执行失败', 'error');
      });
      document.getElementById('grantBuyRequest').value = '';
      showToast('授权成功', 'success');
      setTimeout(() => {
        state.nftMarket.subTab = 'mine';
        renderTool('nft-market');
      }, 2000);
    } else {
      showStatus('grantStatus', `❌ 授权失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('Grant error:', e);
    showStatus('grantStatus', '❌ 授权失败：' + mapError(undefined, e.message), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔑 授权交易';
  }
}
async function revokeGrant(grantee, listingId) {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  if (!confirm('确定撤销对该买家的授权？')) return;
  try {
    const revokeMsg = PaxiCosmJS.MsgRevoke.fromPartial({
      granter: state.wallet.address,
      grantee,
      msgTypeUrl: CONFIG.nftMarket.msgTypeUrl,
    });
    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
      value: PaxiCosmJS.MsgRevoke.encode(revokeMsg).finish(),
    })];
    showToast('等待签名...', 'info');
    const res = await buildSignAndBroadcast(messages, 'Paxi NFT Market: Revoke grant', 200000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      updateListing(listingId, { status: 'listed', grantee: null });
      showToast('授权已撤销', 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed) showToast(conf.success ? '撤销已上链' : '撤销交易失败', conf.success ? 'success' : 'error');
      });
      renderTool('nft-market');
    } else {
      showToast('撤销失败：' + mapError(txResult.code, txResult.rawLog), 'error');
    }
  } catch (e) {
    showToast('撤销失败：' + mapError(undefined, e.message), 'error');
  }
}
async function executeBuy() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const l = buy.listing;
  const btn = document.getElementById('btnExecuteBuy');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 构建交易...';
  try {
    const grant = await checkGrantStatus(l.seller, state.wallet.address);
    if (!grant) throw new Error('卖家授权已失效或不存在，请提醒卖家重新授权');
    const messages = [];
    const priceMicro = l.priceMicro || paxiToUpaxi(l.price);
    const payMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: l.seller,
      amount: [PaxiCosmJS.coins(priceMicro, CONFIG.denom)[0]],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(payMsg).finish(),
    }));
    const feeAmount = parseFloat(l.price) * CONFIG.nftMarket.buyFeeRate / 100;
    const feeMicro = paxiToUpaxi(feeAmount.toFixed(6));
    if (feeMicro !== '0') {
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: state.wallet.address,
        toAddress: CONFIG.feeCollector,
        amount: [PaxiCosmJS.coins(feeMicro, CONFIG.denom)[0]],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      }));
    }
    const transferMsg = { transfer_nft: { recipient: state.wallet.address, token_id: String(l.tokenId) } };
    const innerExecMsg = PaxiCosmJS.MsgExecuteContract.fromPartial({
      sender: l.seller,
      contract: l.contract,
      msg: new TextEncoder().encode(JSON.stringify(transferMsg)),
    });
    const innerAny = {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: PaxiCosmJS.MsgExecuteContract.encode(innerExecMsg).finish(),
    };
    const execMsg = PaxiCosmJS.MsgExec.fromPartial({
      grantee: state.wallet.address,
      msgs: [innerAny],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: PaxiCosmJS.MsgExec.encode(execMsg).finish(),
    }));
    btn.innerHTML = '<span class="spinner"></span> 等待签名...';
    const memo = `Paxi NFT Market: Buy ${l.name || 'NFT #'+l.tokenId} | ${l.price} PAXI`;
    const res = await buildSignAndBroadcast(messages, memo, 600000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      showStatus('buyExecuteStatus', `✅ 购买成功！NFT 已到账。TxHash: ${txResult.txhash.slice(0,20)}...`, 'success');
      removeListing(l.id);
      removeImportedListing(l.id);
      btn.style.display = 'none';
      showToast('🎉 购买成功！NFT 已到账', 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) showToast('交易已上链确认', 'success');
        else if (conf.confirmed && !conf.success) showToast('⚠️ 交易上链但执行失败：' + mapError(conf.code, conf.rawLog), 'error');
      });
      setTimeout(() => {
        cancelBuyFlow();
        refreshBalance();
      }, 3000);
    } else {
      showStatus('buyExecuteStatus', `❌ 购买失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('Buy error:', e);
    showStatus('buyExecuteStatus', '❌ 执行失败：' + mapError(undefined, e.message), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行原子购买';
  }
}
function delistNft(listingId) {
  if (!confirm('确定下架此 NFT？')) return;
  removeListing(listingId);
  showToast('已下架', 'success');
  renderTool('nft-market');
}

// ============================================================
// 工具 9: 质押迁移（按金额阶梯收费）
// ============================================================
function renderRedelegate() {
  return `
    <div class="card">
      <div class="card-title">${t('redelegate.title')}</div>
      <div class="tool-desc">${t('redelegate.desc')}</div>
      <div class="info-box">
        <strong>💡 ${t('redelegate.hint')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">📊 手续费：&lt;50,000 PAXI 按 0.2%，≥50,000 PAXI 按 0.18%</span>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.from')}</label>
        <select id="rdFrom" onchange="updateRdPreview()">
          <option value="">${t('redelegate.selectFrom')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.to')}</label>
        <select id="rdTo" onchange="updateRdPreview()">
          <option value="">${t('redelegate.selectTo')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.amount')}</label>
        <div style="display:flex;gap:8px;">
          <input type="number" id="rdAmount" placeholder="0" step="0.000001" min="0" oninput="updateRdPreview()">
          <button class="btn btn-outline btn-sm" onclick="setMaxRedelegate()" style="min-height:44px;">${t('redelegate.max')}</button>
        </div>
      </div>
      <div id="rdPreview" style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:16px;display:none;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${t('redelegate.feeRate')}</span>
          <span id="rdFeeRateDisplay" style="color:var(--primary);font-weight:600;">-</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px;">
          <span>${t('redelegate.fee')}</span>
          <span id="rdFeeDisplay" style="color:var(--primary);font-weight:600;">-</span>
        </div>
      </div>
      <button class="btn btn-success btn-block" id="btnRedelegate" onclick="executeRedelegate()">
        ${t('redelegate.execute')}
      </button>
      <div class="status-msg" id="rdStatus"></div>
    </div>
  `;
}

async function loadRedelegateData() {
  if (!state.connected) {
    showToast(t('common.connectFirst'), 'error');
    return;
  }
  try {
    const address = state.wallet.address;
    const delRes = await fetch(`${CONFIG.lcd}/cosmos/staking/v1beta1/delegations/${address}`);
    const delData = await delRes.json();
    const delegations = delData.delegation_responses || [];
    if (delegations.length === 0) {
      document.getElementById('rdFrom').innerHTML = `<option value="">${t('redelegate.noDelegations')}</option>`;
      return;
    }
    const valRes = await fetch(`${CONFIG.lcd}/cosmos/staking/v1beta1/validators?pagination.limit=100`);
    const valData = await valRes.json();
    const validators = valData.validators || [];
    const valMap = {};
    validators.forEach(v => { valMap[v.operator_address] = v; });

    const fromSelect = document.getElementById('rdFrom');
    const toSelect = document.getElementById('rdTo');
    fromSelect.innerHTML = `<option value="">${t('redelegate.selectFrom')}</option>`;
    toSelect.innerHTML = `<option value="">${t('redelegate.selectTo')}</option>`;

    for (const d of delegations) {
      const val = valMap[d.delegation.validator_address];
      const label = val ? `${val.description?.moniker || 'Unknown'} (${(parseInt(d.balance.amount)/1e6).toFixed(2)} PAXI)` : d.delegation.validator_address.slice(0,12);
      fromSelect.innerHTML += `<option value="${d.delegation.validator_address}" data-amount="${parseInt(d.balance.amount)/1e6}">${label}</option>`;
    }
    for (const v of validators) {
      const commission = parseFloat(v.commission?.commission_rates?.rate || 0) * 100;
      toSelect.innerHTML += `<option value="${v.operator_address}">${v.description?.moniker || 'Unknown'} (${commission.toFixed(1)}%)</option>`;
    }
  } catch (e) {
    console.error('加载质押数据失败:', e);
    showToast(e.message, 'error');
  }
}

function updateRdPreview() {
  const from = document.getElementById('rdFrom').value;
  const to = document.getElementById('rdTo').value;
  const amount = parseFloat(document.getElementById('rdAmount').value) || 0;
  const preview = document.getElementById('rdPreview');
  if (from && to && amount > 0) {
    preview.style.display = 'block';
    let feeRate, fee;
    if (amount < 50000) {
      feeRate = 0.002;
    } else {
      feeRate = 0.0018;
    }
    fee = amount * feeRate;
    document.getElementById('rdFeeRateDisplay').textContent = (feeRate * 100).toFixed(2) + '%';
    document.getElementById('rdFeeDisplay').textContent = fee.toFixed(4) + ' PAXI';
  } else {
    preview.style.display = 'none';
  }
}

function setMaxRedelegate() {
  const from = document.getElementById('rdFrom').value;
  if (!from) return;
  const option = document.querySelector(`#rdFrom option[value="${from}"]`);
  if (option) {
    const max = parseFloat(option.dataset.amount) || 0;
    document.getElementById('rdAmount').value = max;
    updateRdPreview();
  }
}

async function executeRedelegate() {
  if (!state.connected) {
    showToast(t('common.connectFirst'), 'error');
    return;
  }
  const from = document.getElementById('rdFrom').value;
  const to = document.getElementById('rdTo').value;
  const amount = parseFloat(document.getElementById('rdAmount').value);
  if (!from || !to || !amount || amount <= 0) {
    showStatus('rdStatus', t('redelegate.invalidInput'), 'warning');
    return;
  }
  let feeRate, fee;
  if (amount < 50000) {
    feeRate = 0.002;
  } else {
    feeRate = 0.0018;
  }
  fee = amount * feeRate;
  if (fee < 0.000001) fee = 0.000001;

  const btn = document.getElementById('btnRedelegate');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${t('common.sending')}`;
  try {
    const denom = CONFIG.denom;
    const amountMicro = (amount * 1e6).toFixed(0);
    const feeMicro = (fee * 1e6).toFixed(0);

    const redelegateMsg = {
      delegator_address: state.wallet.address,
      validator_src_address: from,
      validator_dst_address: to,
      amount: { denom, amount: amountMicro }
    };
    const msgAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: PaxiCosmJS.MsgBeginRedelegate.encode(redelegateMsg).finish(),
    });

    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [{ denom, amount: feeMicro }]
    });
    const feeAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    });

    const messages = [msgAny, feeAny];
    const memo = `Paxi Toolbox Redelegate (${amount} PAXI) Fee: ${fee.toFixed(4)} PAXI`;
    const broadcastRes = await buildSignAndBroadcast(messages, memo, null, state.wallet);
    const result = checkTxResult(broadcastRes);
    if (result.ok) {
      showStatus('rdStatus', `${t('redelegate.success')} TxHash: ${result.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(result.txhash);
      showToast(`✅ 迁移成功！手续费 ${fee.toFixed(4)} PAXI`, 'success');
    } else {
      showStatus('rdStatus', `${t('redelegate.fail')} ${mapError(result.code, result.rawLog)}`, 'error');
    }
  } catch (e) {
    showStatus('rdStatus', `${t('redelegate.fail')} ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = t('redelegate.execute');
  }
}

// ============================================================
// 工具 10: P2P 买卖市场
// ============================================================
const LS_KEY_P2P = 'paxi_p2p_ads';

function getP2pAds() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_P2P) || '[]'); }
  catch { return []; }
}
function saveP2pAd(ad) {
  const list = getP2pAds();
  list.unshift(ad);
  if (list.length > 200) list.length = 200;
  localStorage.setItem(LS_KEY_P2P, JSON.stringify(list));
}
function removeP2pAd(id) {
  let list = getP2pAds();
  list = list.filter(a => a.id !== id);
  localStorage.setItem(LS_KEY_P2P, JSON.stringify(list));
}

function renderP2pMarket() {
  const ads = getP2pAds();

  return `
    <div class="card">
      <div class="card-title">${t('p2pMarket.title')}</div>
      <div class="tool-desc">${t('p2pMarket.desc')}</div>
      <div class="info-box" style="margin-bottom:16px;">
        <strong>💡 ${t('p2pMarket.fee')}</strong>
      </div>

      <!-- 发布表单 -->
      <div style="background:var(--bg);border-radius:8px;padding:16px;margin-bottom:16px;">
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">类型</label>
            <select id="p2pType">
              <option value="buy">${t('p2pMarket.buyLabel')}</option>
              <option value="sell">${t('p2pMarket.sellLabel')}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">${t('p2pMarket.amount')}</label>
            <input type="number" id="p2pAmount" placeholder="1000" min="0.000001" step="0.000001">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('p2pMarket.price')}</label>
          <input type="number" id="p2pPrice" placeholder="0.20" min="0" step="0.000001">
        </div>
        <div class="form-group">
          <label class="form-label">${t('p2pMarket.contact')}</label>
          <input type="text" id="p2pContact" placeholder="TG：@xxx 或 微信：xxx">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">${t('p2pMarket.note')}</label>
          <input type="text" id="p2pNote" placeholder="例如：仅限大额交易">
        </div>
        <button class="btn btn-success btn-block" id="btnPublishP2p" onclick="publishP2pAd()" style="margin-top:12px;">
          ${t('p2pMarket.publish')}
        </button>
        <div class="status-msg" id="p2pStatus"></div>
      </div>

      <!-- 广告列表 -->
      <div style="margin-top:12px;">
        ${ads.length === 0 ? `
          <p style="color:var(--text-muted);text-align:center;padding:24px 0;">${t('p2pMarket.noData')}</p>
        ` : `
          ${ads.map(ad => {
            const isBuy = ad.type === 'buy';
            const time = ad.timestamp ? new Date(ad.timestamp).toLocaleString() : '--';
            const addr = ad.publisher ? ad.publisher.slice(0, 10) + '...' + ad.publisher.slice(-6) : '--';
            return `
              <div class="p2p-item ${isBuy ? 'buy' : 'sell'}">
                <div class="p2p-header">
                  <span class="p2p-type ${isBuy ? 'buy' : 'sell'}">${isBuy ? '📈 ' + t('p2pMarket.buyLabel') : '📉 ' + t('p2pMarket.sellLabel')}</span>
                  <span class="p2p-time">${time}</span>
                </div>
                <div class="p2p-body">
                  <span><span class="label">数量</span> ${ad.amount} PAXI</span>
                  <span><span class="label">单价</span> ${ad.price} USDT</span>
                  ${ad.note ? `<span><span class="label">备注</span> ${escapeHtml(ad.note)}</span>` : ''}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-top:4px;">
                  <span class="p2p-contact">📱 ${escapeHtml(ad.contact || '--')}</span>
                  <span class="p2p-addr">👤 ${addr}</span>
                </div>
                ${state.connected && state.wallet?.address === ad.publisher ? `
                  <div style="margin-top:6px;">
                    <button class="btn btn-danger btn-sm" onclick="deleteP2pAd('${ad.id}')">${t('common.delete') || '删除'}</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        `}
      </div>
    </div>
  `;
}

async function publishP2pAd() {
  if (!state.connected) {
    showStatus('p2pStatus', t('p2pMarket.connectFirst'), 'warning');
    return;
  }

  const type = document.getElementById('p2pType').value;
  const amount = document.getElementById('p2pAmount').value.trim();
  const price = document.getElementById('p2pPrice').value.trim();
  const contact = document.getElementById('p2pContact').value.trim();
  const note = document.getElementById('p2pNote').value.trim();

  if (!amount || parseFloat(amount) <= 0) {
    showStatus('p2pStatus', '请输入有效的数量', 'warning');
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    showStatus('p2pStatus', '请输入有效的价格', 'warning');
    return;
  }
  if (!contact) {
    showStatus('p2pStatus', '请填写联系方式', 'warning');
    return;
  }

  if (!confirm(t('p2pMarket.confirmPublish'))) return;

  const btn = document.getElementById('btnPublishP2p');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${t('p2pMarket.publishing')}`;

  try {
    const denom = CONFIG.denom;
    const feeMicro = (1 * 1e6).toFixed(0);

    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [{ denom, amount: feeMicro }]
    });
    const feeAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    });

    const messages = [feeAny];
    const memo = `Paxi Toolbox P2P Ad: ${type} ${amount} PAXI @ ${price} USDT`;
    const broadcastRes = await buildSignAndBroadcast(messages, memo, null, state.wallet);
    const result = checkTxResult(broadcastRes);

    if (result.ok) {
      const ad = {
        id: 'p2p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: type,
        amount: amount,
        price: price,
        contact: contact,
        note: note || '',
        publisher: state.wallet.address,
        timestamp: Date.now(),
        txhash: result.txhash,
      };
      saveP2pAd(ad);
      showStatus('p2pStatus', `${t('p2pMarket.success')} TxHash: ${result.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(result.txhash);
      renderP2pMarket();
      document.getElementById('p2pAmount').value = '';
      document.getElementById('p2pPrice').value = '';
      document.getElementById('p2pContact').value = '';
      document.getElementById('p2pNote').value = '';
      showToast('✅ 广告发布成功！', 'success');
    } else {
      showStatus('p2pStatus', `${t('p2pMarket.fail')} ${mapError(result.code, result.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('P2P publish error:', e);
    showStatus('p2pStatus', `${t('p2pMarket.fail')} ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = t('p2pMarket.publish');
  }
}

function deleteP2pAd(id) {
  if (!confirm(t('p2pMarket.deleteConfirm'))) return;
  removeP2pAd(id);
  renderP2pMarket();
  showToast(t('p2pMarket.deleted'), 'success');
}

// ============================================================
// 在 LANG 的 common 中添加 delete 翻译（补充）
// ============================================================
// 由于 LANG 中 common 没有 delete，临时补充
if (LANG.zh.common) LANG.zh.common.delete = '删除';
if (LANG.en.common) LANG.en.common.delete = 'Delete';

// ============================================================
// 通用工具（来自 shared.js）
// ============================================================
// toBase64, fromBase64, escapeHtml, sanitizeUrl, paxiToUpaxi, upaxiToPaxi,
// parseFloatToRawUnits, copyToClipboard, showToast, showStatus,
// fetchAPI, buildSignAndBroadcast, checkTxResult, pollTxStatus, mapError
// 均在 shared.js 中定义，无需重复
// ============================================================