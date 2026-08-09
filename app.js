/**
 * Paxi 工具箱 - 主应用逻辑
 * Paxi Network 生态工具集
 * 纯前端 · 零服务器 · 完全去中心化
 *
 * 依赖: shared.js（公共函数）+ compat.js（SDK 兼容层）+ paxi-cosmjs.umd.js（SDK）
 * toBase64/fromBase64/escapeHtml/paxiToUpaxi/parseFloatToRawUnits/buildSignAndBroadcast/
 * simulateGas/pollTxStatus/mapError/copyToClipboard/showToast/showStatus 等函数均在 shared.js 中定义
 */

// ============================================================
// 配置（网络相关字段从 shared.js 的 SHARED_CONFIG 动态获取）
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
  wallet: null,        // { address, public_key, algo }
  balance: null,
  connected: false,
  currentTool: 'batch-transfer',
  // 批量转账
  batchRecipients: [],
  batchTokenType: 'native', // native | prc20 | nft
  batchMode: 'csv',   // csv | uniform
  // NFT 市场
  nftMarket: {
    subTab: 'browse',     // browse | list | mine | import
    currentBuy: null,    // 当前购买流程 { listing, step }
    morePanel: false,    // 更多面板是否展开
  },
};

// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  renderTool('batch-transfer');
  checkWalletInjection();
});

function checkWalletInjection() {
  // 轮询检测 PaxiHub 是否注入（钱包可能异步注入）
  let attempts = 0;
  const maxAttempts = 20;
  const interval = setInterval(() => {
    attempts++;
    if (typeof window.paxihub !== 'undefined') {
      console.log('PaxiHub detected');
      clearInterval(interval);
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      if (/Mobi/.test(navigator.userAgent)) {
        console.log('Mobile device, PaxiHub may need to be installed');
      }
    }
  }, 500);
}

// ============================================================
// 导航
// ============================================================
function initNavigation() {
  document.querySelectorAll('.tab-bar-item').forEach(item => {
    item.addEventListener('click', () => {
      const tool = item.dataset.tool;
      document.querySelectorAll('.tab-bar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentTool = tool;
      state.nftMarket.moreSubTool = null;
      renderTool(tool);
    });
  });
}

// ============================================================
// 工具渲染
// ============================================================
function renderTool(tool) {
  const main = document.getElementById('mainContent');
  switch (tool) {
    case 'batch-transfer': main.innerHTML = renderBatchTransfer(); break;
    case 'balance-check': main.innerHTML = renderBalanceCheck(); break;
    case 'nft-market': main.innerHTML = renderNftMarket(); break;
    case 'tx-tracker': main.innerHTML = renderTxTracker(); break;
    case 'gas-calc': main.innerHTML = renderGasCalc(); break;
    case 'address-convert': main.innerHTML = renderAddressConvert(); break;
    case 'validator-compare': main.innerHTML = renderValidatorCompare(); break;
    case 'token-info': main.innerHTML = renderTokenInfo(); break;
    case 'more': main.innerHTML = renderMorePanel(); break;
  }
  // 绑定工具内的事件
  bindToolEvents(tool);
}

function bindToolEvents(tool) {
  switch (tool) {
    case 'batch-transfer':
      bindBatchTransferEvents();
      break;
    case 'balance-check':
      bindBalanceCheckEvents();
      break;
    case 'nft-market':
      bindNftMarketEvents();
      break;
    case 'tx-tracker':
      bindTxTrackerEvents();
      break;
    case 'gas-calc':
      bindGasCalcEvents();
      break;
    case 'address-convert':
      bindAddressConvertEvents();
      break;
    case 'validator-compare':
      loadValidatorData();
      break;
    case 'token-info':
      bindTokenInfoEvents();
      break;
    case 'more':
      // 更多面板无需额外绑定
      break;
  }
}

// ============================================================
// 钱包连接
// ============================================================
async function connectWallet() {
  if (typeof window.paxihub === 'undefined') {
    showToast('请先安装 PaxiHub 钱包', 'error');
    // 移动端引导
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
      // 使用 upaxiToPaxi 字符串转换避免大数精度丢失
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
// 通用工具函数 — 已迁移到 shared.js（toBase64/fromBase64/escapeHtml/
// paxiToUpaxi/parseFloatToRawUnits/copyToClipboard/showToast/showStatus/
// fetchAPI/buildSignAndBroadcast/checkTxResult/simulateGas/pollTxStatus/mapError）
// ============================================================

// ============================================================
// 工具 1: 批量转账
// ============================================================
function renderBatchTransfer() {
  return `
    <div class="card">
      <div class="card-title">📤 批量转账</div>
      <div class="tool-desc">
        支持 PAXI 原生代币、PRC-20 代币、NFT 的批量发送。支持 CSV 导入（不同金额）和均额模式（相同金额）。
        一笔交易打包多条消息，省 Gas、省时间。
      </div>

      <!-- Token Type Tabs -->
      <div class="tabs">
        <div class="tab active" data-bt-type="native">PAXI 原生代币</div>
        <div class="tab" data-bt-type="prc20">PRC-20 代币</div>
        <div class="tab" data-bt-type="nft">NFT (PRC-721)</div>
      </div>

      <!-- Mode Tabs -->
      <div class="tabs" style="margin-top:8px">
        <div class="tab active" data-bt-mode="csv">📋 CSV 导入（不同金额）</div>
        <div class="tab" data-bt-mode="uniform">🔄 均额模式（相同金额）</div>
      </div>

      <!-- PRC-20 contract input (hidden by default) -->
      <div class="form-group" id="bt-prc20-group" style="display:none">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="btPrc20Contract" placeholder="paxi1...">
      </div>

      <!-- NFT contract input (hidden by default) -->
      <div class="form-group" id="bt-nft-group" style="display:none">
        <label class="form-label">NFT 合约地址</label>
        <input type="text" id="btNftContract" placeholder="paxi1...">
      </div>

      <!-- CSV Mode -->
      <div id="bt-csv-area">
        <div class="form-group">
          <label class="form-label">上传 CSV 文件 或 粘贴数据</label>
          <div class="upload-area" id="btCsvUpload">
            <div style="font-size:28px;margin-bottom:8px">📁</div>
            <div>点击上传 CSV 或拖拽到此处</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">格式：地址,金额  （每行一条）</div>
          </div>
          <input type="file" id="btCsvFile" accept=".csv,.txt" style="display:none">
        </div>
        <div class="form-group">
          <label class="form-label">或手动粘贴（每行：地址,金额）</label>
          <textarea id="btCsvText" placeholder="paxi1abc123...,100
paxi1def456...,250
paxi1ghi789...,50"></textarea>
        </div>
      </div>

      <!-- Uniform Mode -->
      <div id="bt-uniform-area" style="display:none">
        <div class="form-group">
          <label class="form-label">接收地址列表（每行一个地址）</label>
          <textarea id="btUniformAddrs" placeholder="paxi1abc123...
paxi1def456...
paxi1ghi789..."></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">每地址金额</label>
          <input type="number" id="btUniformAmount" placeholder="例如：100" step="0.000001" min="0">
        </div>
      </div>

      <!-- Preview Table -->
      <div id="btPreview" style="display:none">
        <div class="card-title" style="font-size:14px">📋 转账预览</div>
        <div class="stats-row" id="btStats"></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>接收地址</th><th>金额</th><th>代币</th></tr>
            </thead>
            <tbody id="btPreviewBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div style="margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="btParseBtn" onclick="parseBatchTransfer()">
          📋 解析并预览
        </button>
        <button class="btn btn-success" id="btSendBtn" style="display:none" onclick="executeBatchTransfer()">
          🚀 执行批量转账
        </button>
        <button class="btn btn-outline btn-sm" id="btClearBtn" style="display:none" onclick="clearBatchTransfer()">
          清空
        </button>
      </div>
      <div class="status-msg" id="btStatus"></div>
    </div>

    <!-- Transaction History -->
    <div class="card">
      <div class="card-title">📜 最近转账记录</div>
      <div id="btHistory">
        <p style="color:var(--text-muted);font-size:13px">连接钱包后查看历史记录</p>
      </div>
    </div>
  `;
}

function bindBatchTransferEvents() {
  // Token type tabs
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

  // Mode tabs
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

  // CSV upload
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
    if (!text) {
      showStatus('btStatus', '请输入 CSV 数据', 'warning');
      return;
    }
    const lines = text.split('\n').filter(l => l.trim());
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) {
        invalidLines.push({ line: lineIdx + 1, reason: '格式不正确' });
        continue;
      }
      const addr = parts[0];
      const amount = parts[1];

      // 跳过标题行
      if (lineIdx === 0 && /^address|地址/i.test(addr)) continue;

      // 验证地址
      if (!addr.startsWith('paxi1') || addr.length < 38) {
        invalidLines.push({ line: lineIdx + 1, reason: '无效地址' });
        continue;
      }

      // 验证金额
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) {
        invalidLines.push({ line: lineIdx + 1, reason: '无效金额' });
        continue;
      }

      // 检查重复
      if (seenAddresses.has(addr)) {
        invalidLines.push({ line: lineIdx + 1, reason: '重复地址' });
        continue;
      }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  } else {
    // Uniform mode
    const addrsText = document.getElementById('btUniformAddrs').value.trim();
    const amount = document.getElementById('btUniformAmount').value;
    if (!addrsText || !amount) {
      showStatus('btStatus', '请输入地址列表和金额', 'warning');
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      showStatus('btStatus', '金额必须大于 0', 'warning');
      return;
    }
    const addrs = addrsText.split('\n').map(a => a.trim()).filter(a => a);
    for (let i = 0; i < addrs.length; i++) {
      const addr = addrs[i];
      if (!addr.startsWith('paxi1') || addr.length < 38) {
        invalidLines.push({ line: i + 1, reason: '无效地址' });
        continue;
      }
      if (seenAddresses.has(addr)) {
        invalidLines.push({ line: i + 1, reason: '重复地址' });
        continue;
      }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  }

  if (recipients.length === 0) {
    showStatus('btStatus', '未能解析任何有效的接收地址', 'warning');
    return;
  }

  // 验证 bech32 校验和
  const validRecipients = recipients.filter(r => {
    try {
      bech32Decode(r.address);
      return true;
    } catch {
      return false;
    }
  });

  if (validRecipients.length === 0) {
    showStatus('btStatus', '没有有效的 Paxi 地址（bech32 校验失败）', 'error');
    return;
  }

  // 限制最大数量
  if (validRecipients.length > CONFIG.maxMessagesPerTx) {
    showStatus('btStatus', `单笔交易最多 ${CONFIG.maxMessagesPerTx} 个接收地址，请分批发送`, 'warning');
    return;
  }

  state.batchRecipients = validRecipients;

  // Render preview
  renderBatchPreview(validRecipients, tokenType);

  document.getElementById('btPreview').style.display = 'block';
  document.getElementById('btSendBtn').style.display = 'inline-flex';
  document.getElementById('btClearBtn').style.display = 'inline-flex';
  document.getElementById('btStatus').style.display = 'none';

  // 显示跳过的无效行
  if (invalidLines.length > 0) {
    setTimeout(() => {
      showStatus('btStatus', `⚠️ 跳过 ${invalidLines.length} 行无效数据：${invalidLines.slice(0, 5).map(l => `第${l.line}行(${l.reason})`).join(', ')}${invalidLines.length > 5 ? '...' : ''}`, 'warning');
    }, 100);
  }
}

function renderBatchPreview(recipients, tokenType) {
  // Stats
  const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const tokenLabel = tokenType === 'native' ? 'PAXI' : tokenType === 'prc20' ? 'PRC-20' : 'NFT';

  // 手续费计算
  let feeAmount, feeNote;
  if (tokenType === 'nft') {
    feeAmount = recipients.length * 0.5; // 每笔 0.5 PAXI
    feeNote = `0.5 PAXI/笔（固定费率）`;
  } else {
    const feeRate = CONFIG.feeRate; // 1.5%
    feeAmount = totalAmount * feeRate / 100;
    feeNote = `${feeRate}%（以 PAXI 收取）`;
  }

  document.getElementById('btStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${recipients.length}</div>
      <div class="stat-label">接收地址数</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${tokenType === 'nft' ? recipients.length : totalAmount.toLocaleString()}</div>
      <div class="stat-label">${tokenType === 'nft' ? 'NFT 数量' : '总金额（' + tokenLabel + '）'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${feeAmount.toFixed(4)}</div>
      <div class="stat-label">服务费 ${feeNote}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${feeAmount.toLocaleString()}</div>
      <div class="stat-label">PAXI 手续费总额</div>
    </div>
  `;

  // Table — 使用 escapeHtml 防止 XSS
  const tbody = document.getElementById('btPreviewBody');
  tbody.innerHTML = recipients.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><code>${escapeHtml(r.address.slice(0, 14))}...${escapeHtml(r.address.slice(-8))}</code></td>
      <td>${escapeHtml(parseFloat(r.amount).toLocaleString())}</td>
      <td>${tokenLabel}</td>
    </tr>
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
  if (!state.connected) {
    showStatus('btStatus', '请先连接钱包', 'warning');
    return;
  }
  if (state.batchRecipients.length === 0) {
    showStatus('btStatus', '没有可发送的转账', 'warning');
    return;
  }

  const tokenType = state.batchTokenType;
  const btn = document.getElementById('btSendBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 构建交易中...';

  try {
    const sender = state.wallet;
    const denom = CONFIG.denom;

    // Build messages
    const messages = [];

    // 计算手续费（纯字符串运算避免精度丢失）
    const NFT_TRANSFER_FEE_PER_TX = 0.5;
    let feeAmount, feeMicro;
    if (tokenType === 'nft') {
      feeAmount = state.batchRecipients.length * NFT_TRANSFER_FEE_PER_TX;
      feeMicro = paxiToUpaxi(feeAmount.toFixed(6));
    } else {
      // 使用字符串求和避免浮点累计误差
      let totalMicro = BigInt(0);
      for (const r of state.batchRecipients) {
        totalMicro += BigInt(paxiToUpaxi(r.amount));
      }
      feeMicro = (totalMicro * BigInt(Math.round(CONFIG.feeRate * 100)) / BigInt(10000)).toString();
      const feePaxiRaw = (BigInt(feeMicro) / BigInt(1000000)).toString() + '.' + (BigInt(feeMicro) % BigInt(1000000)).toString().padStart(6, '0').replace(/0+$/, '');
      feeAmount = parseFloat(feePaxiRaw || '0');
    }

    // 对于 PRC-20，需要先查询代币精度
    let prc20Decimals = 6; // 默认 6 位
    if (tokenType === 'prc20') {
      const contractAddr = document.getElementById('btPrc20Contract').value.trim();
      if (!contractAddr) {
        showStatus('btStatus', '请输入 PRC-20 合约地址', 'warning');
        btn.disabled = false;
        btn.innerHTML = '🚀 执行批量转账';
        return;
      }
      // 查询代币精度
      try {
        const queryMsg = btoa(JSON.stringify({ token_info: {} }));
        const queryRes = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contractAddr}/smart/${queryMsg}`).then(r => r.json());
        if (queryRes?.data?.decimals !== undefined) {
          prc20Decimals = queryRes.data.decimals;
        }
      } catch (e) {
        console.warn('无法查询 PRC-20 精度，默认使用 6 位小数');
      }
    }

    // 对于 NFT，验证合约地址
    if (tokenType === 'nft') {
      const nftContract = document.getElementById('btNftContract').value.trim();
      if (!nftContract) {
        showStatus('btStatus', '请输入 NFT 合约地址', 'warning');
        btn.disabled = false;
        btn.innerHTML = '🚀 执行批量转账';
        return;
      }
    }

    // 1. 添加所有转账消息
    for (const r of state.batchRecipients) {
      if (tokenType === 'native') {
        // 使用字符串转换避免浮点精度丢失
        const amountMicro = paxiToUpaxi(r.amount);
        const msg = PaxiCosmJS.MsgSend.fromPartial({
          fromAddress: sender.address,
          toAddress: r.address,
          amount: [PaxiCosmJS.coins(amountMicro, denom)[0]],
        });
        messages.push(PaxiCosmJS.Any.fromPartial({
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: PaxiCosmJS.MsgSend.encode(msg).finish(),
        }));
      } else if (tokenType === 'prc20') {
        const contractAddr = document.getElementById('btPrc20Contract').value.trim();
        // PRC-20 transfer 的 amount 必须是原始单位字符串（基于代币精度）
        const rawAmount = parseFloatToRawUnits(r.amount, prc20Decimals);
        const msgObj = { transfer: { recipient: r.address, amount: rawAmount } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({
          sender: sender.address,
          contract: contractAddr,
          msg: new TextEncoder().encode(JSON.stringify(msgObj)),
        });
        messages.push(PaxiCosmJS.Any.fromPartial({
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish(),
        }));
      } else if (tokenType === 'nft') {
        const nftContract = document.getElementById('btNftContract').value.trim();
        // NFT 模式下 amount 是 token_id（字符串）
        const msgObj = { transfer_nft: { recipient: r.address, token_id: String(r.amount) } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({
          sender: sender.address,
          contract: nftContract,
          msg: new TextEncoder().encode(JSON.stringify(msgObj)),
        });
        messages.push(PaxiCosmJS.Any.fromPartial({
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish(),
        }));
      }
    }

    // 2. 添加手续费消息（PAXI/PRC-20: 1.5% 金额；NFT: 0.5 PAXI/笔；均以 PAXI 原生代币支付）
    if (feeMicro !== '0') {
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: sender.address,
        toAddress: CONFIG.feeCollector,
        amount: [PaxiCosmJS.coins(feeMicro, denom)[0]],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      }));
    }

    // 使用共享交易函数构建签名广播（Gas 自动估算）
    const feeNote = ` (含${CONFIG.feeRate}%手续费=${feeAmount.toFixed(4)}PAXI)`;
    const memo = `Paxi Toolbox Batch Transfer${feeNote}`;
    btn.innerHTML = '<span class="spinner"></span> 等待钱包签名...';

    const broadcastRes = await buildSignAndBroadcast(messages, memo, null, sender);
    const txResult = checkTxResult(broadcastRes);

    if (txResult.ok) {
      const feeNoteText = tokenType === 'nft'
        ? ` 手续费 ${feeAmount.toFixed(4)} PAXI (${state.batchRecipients.length}笔×0.5PAXI)`
        : ` 手续费 ${feeAmount.toFixed(4)} PAXI (${CONFIG.feeRate}%)`;
      showStatus('btStatus',
        `✅ 转账成功！${state.batchRecipients.length} 笔交易已发送。${feeNoteText} TxHash: ${txResult.txhash.slice(0, 20)}...`,
        'success');
      // 轮询交易确认
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed) showToast(conf.success ? '交易已上链确认' : '⚠️ 交易上链但执行失败', conf.success ? 'success' : 'error');
      });
      clearBatchTransfer();
      refreshBalance();
    } else {
      showStatus('btStatus', `❌ 交易失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('Batch transfer error:', e);
    showStatus('btStatus', '❌ 执行失败：' + mapError(undefined, e.message), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行批量转账';
  }
}

// ============================================================
// 工具 2: 余额查询
// ============================================================
function renderBalanceCheck() {
  return `
    <div class="card">
      <div class="card-title">💰 地址余额批量查询</div>
      <div class="tool-desc">
        粘贴多个 Paxi 地址，一键查询所有地址的 PAXI 余额和 PRC-20 代币持有情况。
        适合空投前筛查、多地址管理、财务审计。
      </div>
      <div class="form-group">
        <label class="form-label">地址列表（每行一个）</label>
        <textarea id="bcAddrs" placeholder="paxi1abc123...
paxi1def456...
paxi1ghi789..."></textarea>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="queryBalances()">🔍 查询余额</button>
        <button class="btn btn-outline btn-sm" onclick="exportBalances()" id="bcExportBtn" style="display:none">📥 导出 CSV</button>
      </div>
      <div class="status-msg" id="bcStatus"></div>
      <div id="bcResults" style="margin-top:16px"></div>
    </div>
  `;
}

function bindBalanceCheckEvents() {}

let balanceResults = [];

async function queryBalances() {
  const text = document.getElementById('bcAddrs').value.trim();
  if (!text) {
    showStatus('bcStatus', '请输入地址列表', 'warning');
    return;
  }

  const addrs = [...new Set(text.split('\n').map(a => a.trim()).filter(a => a.startsWith('paxi1')))];
  if (addrs.length === 0) {
    showStatus('bcStatus', '没有有效的 Paxi 地址', 'error');
    return;
  }

  showStatus('bcStatus', `正在查询 ${addrs.length} 个地址...`, 'info');
  balanceResults = [];

  // Batch query (limit concurrency)
  const batchSize = 10;
  for (let i = 0; i < addrs.length; i += batchSize) {
    const batch = addrs.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(addr =>
      fetch(`${CONFIG.lcd}/cosmos/bank/v1beta1/balances/${addr}`).then(r => r.json())
    ));

    for (let j = 0; j < batch.length; j++) {
      const addr = batch[j];
      const result = results[j];
      let paxiAmount = 0;
      let otherTokens = [];

      if (result.status === 'fulfilled' && result.value.balances) {
        for (const b of result.value.balances) {
          if (b.denom === CONFIG.denom) {
            // 使用 upaxiToPaxi 字符串转换避免大数精度丢失
            paxiAmount = parseFloat(upaxiToPaxi(b.amount));
          } else {
            otherTokens.push(b);
          }
        }
      }

      balanceResults.push({ address: addr, paxi: paxiAmount, tokens: otherTokens });
    }
  }

  // Render
  const totalPaxi = balanceResults.reduce((s, r) => s + r.paxi, 0);
  document.getElementById('bcResults').innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${balanceResults.length}</div>
        <div class="stat-label">查询地址数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalPaxi.toLocaleString()}</div>
        <div class="stat-label">总 PAXI 余额</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${balanceResults.filter(r => r.paxi > 0).length}</div>
        <div class="stat-label">非零地址数</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>地址</th><th>PAXI 余额</th><th>其他代币</th></tr>
        </thead>
        <tbody>
          ${balanceResults.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><code>${escapeHtml(r.address.slice(0, 14))}...${escapeHtml(r.address.slice(-8))}</code></td>
              <td style="font-weight:600;color:${r.paxi > 0 ? 'var(--success)' : 'var(--text-muted)'}">${r.paxi.toLocaleString()}</td>
              <td>${r.tokens.length > 0 ? r.tokens.map(t => escapeHtml(t.denom)).join(', ') : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('bcExportBtn').style.display = 'inline-flex';
  showStatus('bcStatus', `✅ 查询完成：${balanceResults.length} 个地址`, 'success');
}

function exportBalances() {
  if (!balanceResults.length) return;
  const csv = '地址,PAXI余额,其他代币\n' +
    balanceResults.map(r => `${r.address},${r.paxi},${r.tokens.map(t => t.denom + ':' + t.amount).join(';')}`).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'paxi_balances.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// 工具 3: 交易追踪
// ============================================================
function renderTxTracker() {
  return `
    <div class="card">
      <div class="card-title">🔍 交易追踪</div>
      <div class="tool-desc">输入交易哈希（TxHash），查看交易状态、详情和日志。</div>
      <div class="form-group">
        <label class="form-label">交易哈希</label>
        <input type="text" id="txHash" placeholder="输入 TxHash...">
      </div>
      <button class="btn btn-primary" onclick="trackTransaction()">🔍 查询</button>
      <div class="status-msg" id="txStatus"></div>
      <div id="txResult" style="margin-top:16px"></div>
    </div>
  `;
}

function bindTxTrackerEvents() {
  document.getElementById('txHash').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') trackTransaction();
  });
}

async function trackTransaction() {
  const hash = document.getElementById('txHash').value.trim();
  if (!hash) {
    showStatus('txStatus', '请输入交易哈希', 'warning');
    return;
  }

  showStatus('txStatus', '查询中...', 'info');
  try {
    const data = await fetchAPI(`/cosmos/tx/v1beta1/txs/${hash}`);
    const tx = data.tx_response || data;
    const resultDiv = document.getElementById('txResult');

    if (!tx || !tx.txhash) {
      showStatus('txStatus', '未找到该交易', 'error');
      return;
    }

    const success = tx.code === 0;
    resultDiv.innerHTML = `
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value" style="color:${success ? 'var(--success)' : 'var(--danger)'}">${success ? '✅ 成功' : '❌ 失败'}</div>
          <div class="stat-label">状态</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${tx.height || '-'}</div>
          <div class="stat-label">区块高度</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${tx.gas_used || '-'} / ${tx.gas_wanted || '-'}</div>
          <div class="stat-label">Gas 使用</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${tx.tx?.body?.messages?.length || 0}</div>
          <div class="stat-label">消息数</div>
        </div>
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
      <div class="card-title">⛽ Gas 费用计算器</div>
      <div class="tool-desc">估算不同类型交易的 Gas 消耗和费用。</div>
      <div class="form-group">
        <label class="form-label">交易类型</label>
        <select id="gcTxType">
          <option value="send">普通转账 (MsgSend)</option>
          <option value="prc20">PRC-20 转账</option>
          <option value="nft">NFT 转账</option>
          <option value="swap">AMM 兑换</option>
          <option value="stake">质押/委托</option>
          <option value="vote">治理投票</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Gas 价格 (upaxi)</label>
        <input type="number" id="gcGasPrice" value="0.05" step="0.01" min="0">
      </div>
      <button class="btn btn-primary" onclick="calculateGas()">🧮 计算</button>
      <div class="status-msg" id="gcStatus"></div>
      <div id="gcResult" style="margin-top:16px"></div>
    </div>
  `;
}

function bindGasCalcEvents() {}

function calculateGas() {
  const txType = document.getElementById('gcTxType').value;
  const gasPrice = parseFloat(document.getElementById('gcGasPrice').value);

  const gasEstimates = {
    send: 80000,
    prc20: 200000,
    nft: 250000,
    swap: 350000,
    stake: 200000,
    vote: 150000,
  };

  const gasUsed = gasEstimates[txType] || 100000;
  const feeUpaxi = gasUsed * gasPrice;
  const feePaxi = feeUpaxi / 1e6;

  document.getElementById('gcResult').innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">${gasUsed.toLocaleString()}</div>
        <div class="stat-label">预估 Gas 用量</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${feeUpaxi.toLocaleString()}</div>
        <div class="stat-label">费用 (upaxi)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${feePaxi.toFixed(6)}</div>
        <div class="stat-label">费用 (PAXI)</div>
      </div>
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
      ⚠️ 实际 Gas 消耗可能因合约逻辑复杂度而异。批量操作请在 Gas Limit 中累加。
    </p>
  `;
}

// ============================================================
// 工具 5: 地址格式转换
// ============================================================
function renderAddressConvert() {
  return `
    <div class="card">
      <div class="card-title">🔄 地址格式转换</div>
      <div class="tool-desc">
        Paxi 使用 Bech32 编码。在不同的 Cosmos 链之间，相同公钥对应不同前缀的地址。
        此工具帮助你在常见格式间转换。
      </div>
      <div class="form-group">
        <label class="form-label">输入地址</label>
        <input type="text" id="acInput" placeholder="paxi1... 或 cosmos1... 或 osmosis1...">
      </div>
      <div class="form-group">
        <label class="form-label">目标前缀</label>
        <select id="acTarget">
          <option value="paxi">paxi (Paxi Network)</option>
          <option value="cosmos">cosmos (Cosmos Hub)</option>
          <option value="osmosis">osmosis (Osmosis)</option>
          <option value="juno">juno (Juno)</option>
          <option value="stars">stars (Stargaze)</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="convertAddress()">🔄 转换</button>
      <div class="status-msg" id="acStatus"></div>
    </div>
  `;
}

function bindAddressConvertEvents() {}

function convertAddress() {
  const input = document.getElementById('acInput').value.trim();
  const targetPrefix = document.getElementById('acTarget').value;

  if (!input) {
    showStatus('acStatus', '请输入地址', 'warning');
    return;
  }

  try {
    // Use bech32 decoding/encoding
    const { prefix, data } = bech32Decode(input);
    const converted = bech32Encode(targetPrefix, data);
    showStatus('acStatus', `✅ 转换结果：<code style="word-break:break-all">${converted}</code>`, 'success');
  } catch (e) {
    showStatus('acStatus', '❌ ' + e.message, 'error');
  }
}

// Bech32 实现（含校验和验证）
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

  // 验证校验和
  if (!bech32VerifyChecksum(prefix, data)) {
    throw new Error('Bech32 校验和验证失败 — 地址无效');
  }

  // 去掉最后 6 位校验和，将剩余 5-bit 数据转为 8-bit
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
      <div class="card-title">🏦 验证节点对比</div>
      <div class="tool-desc">
        查看 Paxi Network 所有活跃验证节点的 APR、佣金率、投票权重、状态等关键指标，帮助你选择最优质押节点。
      </div>
      <button class="btn btn-primary" onclick="loadValidatorData()">🔄 加载验证节点数据</button>
      <div class="status-msg" id="vcStatus"></div>
      <div id="vcResults" style="margin-top:16px"></div>
    </div>
  `;
}

async function loadValidatorData() {
  showStatus('vcStatus', '加载中...', 'info');
  try {
    const data = await fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100');
    const poolData = await fetchAPI('/cosmos/staking/v1beta1/pool');
    const bondedTokens = parseInt(poolData.pool?.bonded_tokens || '0') / 1e6;

    const validators = data.validators || [];
    const sorted = validators
      .map(v => ({
        moniker: v.description?.moniker || 'Unknown',
        address: v.operator_address,
        votingPower: parseInt(v.tokens || '0') / 1e6,
        commission: parseFloat(v.commission?.commission_rates?.rate || '0') * 100,
        status: v.status === 'BOND_STATUS_BONDED' ? '✅ 活跃' : '⚠️ 待定',
        jailed: v.jailed,
      }))
      .sort((a, b) => b.votingPower - a.votingPower);

    // Calculate estimated APR (simplified)
    const annualInflation = 0.08; // Year 1
    const totalSupply = 72_000_000; // approximate
    const annualReward = totalSupply * annualInflation * 0.95; // 95% to stakers
    const estimatedAPR = bondedTokens > 0 ? (annualReward / bondedTokens) * 100 : 0;

    document.getElementById('vcResults').innerHTML = `
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">${sorted.length}</div>
          <div class="stat-label">验证节点数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${bondedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div class="stat-label">总质押量 (PAXI)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${estimatedAPR.toFixed(1)}%</div>
          <div class="stat-label">预估 APR</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>节点名称</th><th>状态</th><th>投票权重</th><th>佣金率</th><th>预估收益</th></tr>
          </thead>
          <tbody>
            ${sorted.map((v, i) => {
              const netAPR = estimatedAPR * (1 - v.commission / 100);
              return `
                <tr style="${v.jailed ? 'opacity:0.5' : ''}">
                  <td>${i + 1}</td>
                  <td style="font-weight:600">${escapeHtml(v.moniker)}${v.jailed ? ' 🔒' : ''}</td>
                  <td>${v.status}</td>
                  <td>${v.votingPower.toLocaleString()} PAXI</td>
                  <td>${v.commission.toFixed(1)}%</td>
                  <td style="color:var(--success);font-weight:600">~${netAPR.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    showStatus('vcStatus', `✅ 加载完成：${sorted.length} 个验证节点`, 'success');
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
      <div class="card-title">🪙 PRC-20 代币信息查询</div>
      <div class="tool-desc">输入 PRC-20 合约地址，查询代币名称、符号、总供应量、小数位等基本信息。</div>
      <div class="form-group">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="tiContract" placeholder="paxi1...">
      </div>
      <button class="btn btn-primary" onclick="queryTokenInfo()">🔍 查询</button>
      <div class="status-msg" id="tiStatus"></div>
      <div id="tiResult" style="margin-top:16px"></div>
    </div>
  `;
}

function bindTokenInfoEvents() {
  document.getElementById('tiContract').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') queryTokenInfo();
  });
}

async function queryTokenInfo() {
  const contract = document.getElementById('tiContract').value.trim();
  if (!contract) {
    showStatus('tiStatus', '请输入合约地址', 'warning');
    return;
  }

  showStatus('tiStatus', '查询中...', 'info');
  try {
    // Query PRC-20 token info via CosmWasm smart query
    const queries = [
      { name: 'name', msg: { token_info: {} } },
      { name: 'symbol', msg: { token_info: {} } },
      { name: 'decimals', msg: { token_info: {} } },
      { name: 'total_supply', msg: { token_info: {} } },
    ];

    // Use a single contract_info query
    const contractRes = await fetchAPI(`/cosmwasm/wasm/v1/contract/${contract}`);
    const codeId = contractRes.contract_info?.code_id;

    // Query token info via smart query
    const queryMsg = { token_info: {} };
    const encodedMsg = btoa(JSON.stringify(queryMsg));

    const queryRes = await fetchAPI(
      `/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`
    ).catch(() => null);

    if (queryRes?.data) {
      const info = queryRes.data;
      const decimals = info.decimals || 6;
      // 使用 BigInt 安全解析大数 total_supply
      let totalSupplyDisplay = '-';
      if (info.total_supply) {
        try {
          const supplyBigInt = BigInt(info.total_supply);
          const divisor = BigInt(10 ** decimals);
          const intPart = supplyBigInt / divisor;
          const decPart = (supplyBigInt % divisor).toString().padStart(decimals, '0');
          totalSupplyDisplay = intPart.toLocaleString() + '.' + decPart.slice(0, 4);
        } catch (e) {
          totalSupplyDisplay = info.total_supply;
        }
      }
      document.getElementById('tiResult').innerHTML = `
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value" style="font-size:16px">${escapeHtml(info.name || '-')}</div>
            <div class="stat-label">代币名称</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:16px">${escapeHtml(info.symbol || '-')}</div>
            <div class="stat-label">代币符号</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${decimals}</div>
            <div class="stat-label">小数位</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:16px">${totalSupplyDisplay}</div>
            <div class="stat-label">总供应量</div>
          </div>
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
// 更多面板（底部 tab "更多"展开的工具网格）
// ============================================================
function renderMorePanel() {
  const tools = [
    { tool: 'gas-calc', icon: '⛽', name: 'Gas计算', desc: '估算交易费用' },
    { tool: 'address-convert', icon: '🔄', name: '地址转换', desc: 'Bech32 跨链' },
    { tool: 'validator-compare', icon: '🏦', name: '验证节点', desc: '节点对比' },
    { tool: 'token-info', icon: '🪙', name: '代币查询', desc: 'PRC-20 信息' },
  ];
  return `
    <div class="card">
      <div class="card-title">更多工具</div>
      <div class="tool-desc">以下为高级工具，点击进入。</div>
      <div class="more-grid">
        ${tools.map(t => `
          <div class="more-tool-card" onclick="switchToMoreTool('${t.tool}')">
            <div class="more-tool-icon">${t.icon}</div>
            <div class="more-tool-name">${t.name}</div>
            <div class="more-tool-desc">${t.desc}</div>
          </div>
        `).join('')}
        <a href="nft-launcher/index.html" class="more-tool-card" style="text-decoration:none;color:inherit">
          <div class="more-tool-icon">🎨</div>
          <div class="more-tool-name">NFT发射</div>
          <div class="more-tool-desc">PRC-721 发行</div>
        </a>
      </div>
    </div>
  `;
}

function switchToMoreTool(tool) {
  state.nftMarket.moreSubTool = tool;
  state.currentTool = tool;
  const main = document.getElementById('mainContent');
  let content = '';
  switch (tool) {
    case 'gas-calc': content = renderGasCalc(); break;
    case 'address-convert': content = renderAddressConvert(); break;
    case 'validator-compare': content = renderValidatorCompare(); break;
    case 'token-info': content = renderTokenInfo(); break;
  }
  main.innerHTML = `<div class="back-bar" onclick="backToMore()">← 返回更多</div>` + content;
  bindToolEvents(tool);
}

function backToMore() {
  state.nftMarket.moreSubTool = null;
  state.currentTool = 'more';
  renderTool('more');
}

// ============================================================
// NFT 市场 — localStorage 辅助
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
  // 去重
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

// 合并展示所有可购买的 listing（自己的 + 导入的，排除已售/已下架）
function getAllActiveListings() {
  const own = getMarketListings().filter(l => l.status === 'listed' || l.status === 'granted');
  const imported = getImportedListings().filter(l => l.status === 'listed' || l.status === 'granted');
  // 合并去重
  const seen = new Set();
  const all = [...own, ...imported].filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  // 过滤已过期
  return all.filter(l => new Date(l.expiresAt) > new Date());
}

// ============================================================
// NFT 市场 — 分享码
// ============================================================
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

// ============================================================
// NFT 市场 — 链上查询
// ============================================================
async function queryNftOwner(contract, tokenId) {
  const queryMsg = { owner_of: { token_id: String(tokenId) } };
  const encodedMsg = btoa(JSON.stringify(queryMsg));
  const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
  if (!res.ok) throw new Error(`查询 NFT owner 失败: HTTP ${res.status}`);
  const data = await res.json();
  return data.data?.owner;
}

async function queryNftInfo(contract, tokenId) {
  // 尝试 all_nft_info（含 owner + metadata）
  try {
    const queryMsg = { all_nft_info: { token_id: String(tokenId) } };
    const encodedMsg = btoa(JSON.stringify(queryMsg));
    const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
    if (res.ok) {
      const data = await res.json();
      if (data.data) return data.data;
    }
  } catch (e) { /* 降级 */ }
  // 降级：分别查 owner_of + nft_info
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
  } catch (e) { /* 忽略 */ }
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
  // 检查是否过期
  const exp = grant.expiration ? new Date(grant.expiration) : null;
  if (exp && exp < new Date()) return null; // 已过期
  return grant;
}

// ============================================================
// NFT 市场 — UI 渲染
// ============================================================
function renderNftMarket() {
  // 如果有进行中的购买流程，显示购买页
  if (state.nftMarket.currentBuy) {
    return renderBuyFlow();
  }

  const sub = state.nftMarket.subTab;
  const tabs = [
    { key: 'browse', label: '市场浏览' },
    { key: 'list', label: '上架NFT' },
    { key: 'mine', label: '我的订单' },
    { key: 'import', label: '导入' },
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
      <div class="card-title">🏪 NFT 市场</div>
      <div class="tool-desc">
        基于 Authz 原子交换的去中心化 NFT 交易。卖家上架 → 授权 → 买家一笔交易同时付款+到账，链上原子执行。
      </div>
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
  // 导入页：渲染已有列表
  if (state.nftMarket.subTab === 'import') {
    renderImportedList();
  }
  // 购买流程页：填充购买请求码
  if (state.nftMarket.currentBuy) {
    const codeEl = document.getElementById('buyReqCode');
    if (codeEl) {
      const code = generateBuyRequestCode(state.nftMarket.currentBuy.listing, state.wallet.address);
      codeEl.textContent = code;
    }
  }
}

// 滚动到授权面板
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
              <div class="nft-card-seller">卖家: ${escapeHtml(l.seller.slice(0, 10))}...${escapeHtml(l.seller.slice(-4))}</div>
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
                <code style="word-break:break-all;font-size:10px">${escapeHtml(l.contract.slice(0, 16))}...</code>
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
    <!-- 授权面板 -->
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
      <div class="tool-desc">
        粘贴卖家分享的 NFT 上架码，导入后可在「市场浏览」中查看和购买。
      </div>
      <div class="form-group">
        <label class="form-label">分享码</label>
        <textarea id="importCode" placeholder="粘贴卖家分享的上架码..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn-primary" onclick="importListing()">📥 导入</button>
      <div class="status-msg" id="importStatus"></div>
    </div>
    <!-- 已导入列表 -->
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
          <div class="listing-item-meta">卖家: ${escapeHtml(l.seller.slice(0, 12))}...${escapeHtml(l.seller.slice(-4))}</div>
          ${expired ? '<span style="font-size:11px;color:var(--danger)">已过期</span>' : ''}
        </div>
        <div class="listing-item-actions">
          <button class="btn btn-outline btn-sm" onclick="removeImportedListing('${l.id}');renderImportedList();">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// 购买流程 UI
// ============================================================
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

      <!-- 步骤指示 -->
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
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
            将以下地址或购买请求码发送给卖家，卖家授权后进入下一步。
          </p>
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
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
            确认卖家已授权后，点击下方检查授权状态。
          </p>
          <button class="btn btn-outline btn-block" onclick="checkBuyGrant()">🔍 检查授权状态</button>
          <div class="status-msg" id="buyGrantStatus"></div>
          <button class="btn btn-primary btn-block" id="btnBuyStep3" style="margin-top:12px;display:none" onclick="advanceBuyStep(3)">授权确认，执行购买 →</button>
        </div>
      ` : ''}

      ${step === 3 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
            点击执行原子购买，一笔交易同时付款 + NFT 到账。
          </p>
          <button class="btn btn-success btn-block" id="btnExecuteBuy" onclick="executeBuy()">🚀 执行原子购买</button>
          <div class="status-msg" id="buyExecuteStatus"></div>
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================
// NFT 市场 — 操作
// ============================================================

// 查询 NFT 信息（上架表单中）
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
          <div style="font-size:12px;margin-top:4px">
            持有者: <code style="font-size:10px">${escapeHtml(owner ? owner.slice(0,14)+'...' : '未知')}</code>
          </div>
          <div style="font-size:12px;margin-top:4px;color:${isOwner ? 'var(--success)' : 'var(--danger)'}">
            ${isOwner ? '✅ 你持有此 NFT' : '❌ 你不是此 NFT 的持有者'}
          </div>
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

// 上架 NFT
async function listNft() {
  if (!state.connected) {
    showToast('请先连接钱包', 'error');
    return;
  }
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
    // 查询 NFT 信息确认持有
    const info = await queryNftInfo(contract, tokenId);
    const owner = info.access?.owner;
    if (!owner) {
      throw new Error('无法查询 NFT 持有者');
    }
    if (owner !== state.wallet.address) {
      throw new Error('你不是此 NFT 的持有者');
    }

    // 重复上架检查：同一合约+tokenId 不可重复上架
    const existingListings = getMarketListings();
    const duplicate = existingListings.find(l =>
      l.contract === contract &&
      l.tokenId === String(tokenId) &&
      (l.status === 'listed' || l.status === 'granted') &&
      new Date(l.expiresAt) > new Date()
    );
    if (duplicate) {
      throw new Error('此 NFT 已在售（已上架且未过期），请先下架再重新上架');
    }

    const ext = info.info?.extension || {};
    const name = ext.name || ext.token_name || `NFT #${tokenId}`;
    const image = ext.image || ext.image_url || '';

    const now = new Date();
    const listing = {
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      contract,
      tokenId: String(tokenId),
      price: priceStr,
      priceMicro: paxiToUpaxi(priceStr),
      seller: state.wallet.address,
      name,
      image,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CONFIG.nftMarket.listingDurationSec * 1000).toISOString(),
      status: 'listed',
    };

    saveListing(listing);

    // 生成分享码
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

// 复制分享码
function copyShareCode(listingId) {
  const listing = getMarketListings().find(l => l.id === listingId);
  if (!listing) return;
  const code = generateShareCode(listing);
  copyToClipboard(code).then(() => showToast('分享码已复制', 'success'));
}

// 导入订单
function importListing() {
  const code = document.getElementById('importCode').value.trim();
  if (!code) {
    showStatus('importStatus', '请粘贴分享码', 'warning');
    return;
  }
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

// 开始购买流程
function startBuyFlow(listingId) {
  if (!state.connected) {
    showToast('请先连接钱包', 'error');
    return;
  }
  const listings = getAllActiveListings();
  const listing = listings.find(l => l.id === listingId);
  if (!listing) {
    showToast('订单不存在或已过期', 'error');
    return;
  }
  if (listing.seller === state.wallet.address) {
    showToast('不能购买自己的 NFT', 'error');
    return;
  }
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

// 生成并复制购买请求码
function copyBuyReqCode() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const code = generateBuyRequestCode(buy.listing, state.wallet.address);
  copyToClipboard(code).then(() => showToast('购买请求码已复制', 'success'));
}

// 检查买家收到的授权
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

// 卖家授权买家
async function grantNft() {
  if (!state.connected) {
    showToast('请先连接钱包', 'error');
    return;
  }
  const code = document.getElementById('grantBuyRequest').value.trim();
  if (!code) {
    showStatus('grantStatus', '请粘贴购买请求码', 'warning');
    return;
  }

  const btn = document.getElementById('btnGrantNft');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 授权中...';

  try {
    const req = parseBuyRequestCode(code);
    if (req.type !== 'buy_request' || !req.buyer) {
      throw new Error('购买请求码格式不正确');
    }
    if (req.seller !== state.wallet.address) {
      throw new Error('此购买请求不是发给你');
    }

    // 验证 listing 存在
    const listings = getMarketListings();
    const listing = listings.find(l => l.id === req.listingId);
    if (!listing) {
      throw new Error('找不到对应的上架记录');
    }

    // 构建 MsgGrant
    const now = Math.floor(Date.now() / 1000);
    const expiration = {
      seconds: BigInt(now + CONFIG.nftMarket.grantDurationSec),
      nanos: 0,
    };

    // GenericAuthorization: 授权执行 MsgExecuteContract
    const genericAuthBytes = PaxiCosmJS.GenericAuthorization.encode({
      msg: CONFIG.nftMarket.msgTypeUrl,
    }).finish();

    const authorization = {
      typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
      value: genericAuthBytes,
    };

    const grant = {
      authorization,
      expiration,
    };

    const grantMsg = PaxiCosmJS.MsgGrant.fromPartial({
      granter: state.wallet.address,
      grantee: req.buyer,
      grant,
    });

    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: PaxiCosmJS.MsgGrant.encode(grantMsg).finish(),
    })];

    // 上架服务费
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

    const memo = `Paxi NFT Market: Grant to ${req.buyer.slice(0, 12)}... | Fee: ${CONFIG.nftMarket.listingFee} PAXI`;
    const res = await buildSignAndBroadcast(messages, memo, 300000, state.wallet);
    const txResult = checkTxResult(res);

    if (txResult.ok) {
      // 更新 listing 状态
      updateListing(listing.id, { status: 'granted', grantee: req.buyer });

      showStatus('grantStatus', `✅ 授权成功！买家可在 ${CONFIG.nftMarket.grantDurationSec / 60} 分钟内执行购买。TxHash: ${txResult.txhash.slice(0, 20)}...`, 'success');
      // 轮询交易确认
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) {
          showToast('交易已上链确认', 'success');
        } else if (conf.confirmed && !conf.success) {
          showToast('交易上链但执行失败', 'error');
        }
      });
      document.getElementById('grantBuyRequest').value = '';
      showToast('授权成功', 'success');
      // 刷新我的订单
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

// 撤销授权
async function revokeGrant(grantee, listingId) {
  if (!state.connected) {
    showToast('请先连接钱包', 'error');
    return;
  }
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
      // 轮询确认
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

// 执行原子购买
async function executeBuy() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const l = buy.listing;

  const btn = document.getElementById('btnExecuteBuy');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 构建交易...';

  try {
    // 再次检查授权状态
    const grant = await checkGrantStatus(l.seller, state.wallet.address);
    if (!grant) {
      throw new Error('卖家授权已失效或不存在，请提醒卖家重新授权');
    }

    const messages = [];

    // 1. 付款给卖家 (MsgSend)
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

    // 2. 平台费 (MsgSend 给 feeCollector)
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

    // 3. 代转 NFT (MsgExec 内嵌 MsgExecuteContract)
    //    sender = 卖家（granter），SDK 会校验 signer == granter
    const transferMsg = {
      transfer_nft: {
        recipient: state.wallet.address,
        token_id: String(l.tokenId),
      },
    };
    const innerExecMsg = PaxiCosmJS.MsgExecuteContract.fromPartial({
      sender: l.seller,  // granter 地址
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
      showStatus('buyExecuteStatus',
        `✅ 购买成功！NFT 已到账。TxHash: ${txResult.txhash.slice(0, 20)}...`,
        'success');
      // 从列表移除
      removeListing(l.id);
      removeImportedListing(l.id);
      btn.style.display = 'none';
      showToast('🎉 购买成功！NFT 已到账', 'success');
      // 轮询交易确认
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) {
          showToast('交易已上链确认', 'success');
        } else if (conf.confirmed && !conf.success) {
          showToast('⚠️ 交易上链但执行失败：' + mapError(conf.code, conf.rawLog), 'error');
        }
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

// 下架
function delistNft(listingId) {
  if (!confirm('确定下架此 NFT？')) return;
  removeListing(listingId);
  showToast('已下架', 'success');
  renderTool('nft-market');
}
