/**
 * Paxi 工具箱 - 主应用逻辑
 * Paxi Network 生态工具集
 * 纯前端 · 零服务器 · 完全去中心化
 */

// ============================================================
// 全局配置
// ============================================================
const CONFIG = {
  rpc: 'https://mainnet-rpc.paxinet.io',
  lcd: 'https://mainnet-lcd.paxinet.io',
  denom: 'upaxi',
  denomDisplay: 'PAXI',
  chainId: 'paxi-mainnet',
  gasPrice: '0.05upaxi',
  gasLimit: 600000,
  // 单笔交易最大消息数（防止 gas 爆炸）
  maxMessagesPerTx: 100,
  // 手续费接收地址
  feeCollector: 'paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd',
  // 批量转账手续费比例（百分比 1.5%）
  feeRate: 1.5,
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
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tool = item.dataset.tool;
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.currentTool = tool;
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
    case 'tx-tracker': main.innerHTML = renderTxTracker(); break;
    case 'gas-calc': main.innerHTML = renderGasCalc(); break;
    case 'address-convert': main.innerHTML = renderAddressConvert(); break;
    case 'validator-compare': main.innerHTML = renderValidatorCompare(); break;
    case 'token-info': main.innerHTML = renderTokenInfo(); break;
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
      // 使用字符串解析避免大数精度丢失
      const amountStr = paxiBalance.amount;
      const intPart = amountStr.length > 6 ? amountStr.slice(0, -6) : '0';
      const decPart = amountStr.length > 6 ? amountStr.slice(-6) : amountStr.padStart(6, '0');
      state.balance = parseFloat(intPart + '.' + decPart);
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
// 通用工具函数
// ============================================================

// 安全的 Uint8Array → Base64 转换（避免大数组栈溢出）
function toBase64(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// 安全的 Base64 → Uint8Array 转换
function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 安全的字符串 → 大整数转换（避免浮点精度丢失）
// 输入: "1.15" (PAXI), 返回: "1150000" (upaxi)
function paxiToUpaxi(amountStr) {
  const num = parseFloat(amountStr);
  if (isNaN(num) || num < 0) return '0';
  // 使用 toFixed 统一格式（自动处理科学计数法），再拆分
  const fixedStr = num.toFixed(6);
  const [intPart, decPart] = fixedStr.split('.');
  try {
    return (BigInt(intPart) * 1000000n + BigInt(decPart || '0')).toString();
  } catch (e) {
    return '0';
  }
}

// 将人类可读金额转换为代币原始单位（支持任意精度）
// 输入: "1.5", 6 → "1500000"
// 输入: "1.5", 18 → "1500000000000000000"
function parseFloatToRawUnits(amountStr, decimals) {
  const num = parseFloat(amountStr);
  if (isNaN(num) || num < 0) return '0';
  // 使用 toFixed 统一格式（自动处理科学计数法）
  const fixedStr = num.toFixed(decimals);
  const [intPart, decPart] = fixedStr.split('.');
  try {
    return (BigInt(intPart) * BigInt(10 ** decimals) + BigInt(decPart || '0')).toString();
  } catch (e) {
    return '0';
  }
}

// HTML 转义（防止 XSS）
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showStatus(containerId, msg, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  el.style.display = 'block';
}

async function fetchAPI(path) {
  const res = await fetch(`${CONFIG.lcd}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

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
    const chainId = CONFIG.chainId;
    const sender = state.wallet;

    // Build account info
    const accountRes = await fetch(`${CONFIG.lcd}/cosmos/auth/v1beta1/accounts/${sender.address}`);
    const accountData = await accountRes.json();
    const account = accountData.account?.base_account || accountData.account;
    const accountNumber = Number(account.account_number);
    const sequence = Number(account.sequence);

    // Build messages
    const messages = [];
    const denom = CONFIG.denom;

    // 计算手续费
    // PAXI/PRC-20：按转账金额的 1.5% 收取（以 PAXI 原生代币支付）
    // NFT：按笔数收费，每笔 0.5 PAXI（因为 token_id 不是金额，百分比无意义）
    const NFT_TRANSFER_FEE_PER_TX = 0.5; // PAXI/笔
    let feeAmount, feeMicro;
    if (tokenType === 'nft') {
      feeAmount = state.batchRecipients.length * NFT_TRANSFER_FEE_PER_TX;
      feeMicro = paxiToUpaxi(feeAmount.toFixed(6));
    } else {
      const totalAmount = state.batchRecipients.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
      feeAmount = totalAmount * CONFIG.feeRate / 100; // 1.5%
      feeMicro = paxiToUpaxi(feeAmount.toFixed(6));
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

    // Build transaction
    // Gas 计算：原生转账每条 ~80K，合约调用每条 ~200K，再加手续费消息
    const gasPerMsg = tokenType === 'native' ? 90000 : 220000;
    const totalGas = gasPerMsg * (messages.length - 1) + 90000; // 手续费消息按 90K
    const feeNote = ` (含${CONFIG.feeRate}%手续费=${feeAmount.toFixed(4)}PAXI)`;
    const txBody = PaxiCosmJS.TxBody.fromPartial({ messages, memo: `Paxi Toolbox Batch Transfer${feeNote}` });

    const fee = {
      amount: [PaxiCosmJS.coins(Math.floor(totalGas * 0.05).toString(), denom)[0]],
      gasLimit: totalGas,
    };

    const pubkeyBytes = new Uint8Array(sender.public_key);
    const pubkeyAny = {
      typeUrl: '/cosmos.crypto.secp256k1.PubKey',
      value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish(),
    };

    const authInfo = PaxiCosmJS.AuthInfo.fromPartial({
      signerInfos: [{
        publicKey: pubkeyAny,
        modeInfo: { single: { mode: 1 } },
        sequence: BigInt(sequence),
      }],
      fee,
    });

    const signDoc = PaxiCosmJS.SignDoc.fromPartial({
      bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(),
      authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(),
      chainId,
      accountNumber: BigInt(accountNumber),
    });

    // Sign via PaxiHub
    btn.innerHTML = '<span class="spinner"></span> 等待钱包签名...';

    // 使用分块 Base64 编码，避免 spread 操作符导致大交易栈溢出
    const txObj = {
      bodyBytes: toBase64(signDoc.bodyBytes),
      authInfoBytes: toBase64(signDoc.authInfoBytes),
      chainId,
      accountNumber: signDoc.accountNumber.toString(),
    };

    const result = await window.paxihub.paxi.signAndSendTransaction(txObj);
    if (!result || !result.success) {
      throw new Error(result?.message || '钱包签名失败或被拒绝');
    }

    // 使用 fromBase64 安全解码签名
    const sigBytes = fromBase64(result.success);
    const txRaw = PaxiCosmJS.TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [sigBytes],
    });
    const txBytes = PaxiCosmJS.TxRaw.encode(txRaw).finish();
    const base64Tx = toBase64(txBytes);

    // Broadcast
    btn.innerHTML = '<span class="spinner"></span> 广播交易中...';

    const broadcastRes = await fetch(`${CONFIG.lcd}/cosmos/tx/v1beta1/txs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_bytes: base64Tx, mode: 'BROADCAST_MODE_SYNC' }),
    }).then(r => r.json());

    if (broadcastRes.tx_response?.txhash && broadcastRes.tx_response.code === 0) {
      const feeNoteText = tokenType === 'nft'
        ? ` 手续费 ${feeAmount.toFixed(4)} PAXI (${state.batchRecipients.length}笔×0.5PAXI)`
        : ` 手续费 ${feeAmount.toFixed(4)} PAXI (${CONFIG.feeRate}%)`;
      showStatus('btStatus',
        `✅ 转账成功！${state.batchRecipients.length} 笔交易已发送。${feeNoteText} TxHash: ${broadcastRes.tx_response.txhash.slice(0, 20)}...`,
        'success');
      clearBatchTransfer();
      refreshBalance();
    } else {
      const errMsg = broadcastRes.tx_response?.raw_log || broadcastRes.message || '未知错误';
      const errCode = broadcastRes.tx_response?.code || '?';
      showStatus('btStatus', `❌ 交易失败（代码 ${errCode}）：${errMsg}`, 'error');
    }
  } catch (e) {
    console.error('Batch transfer error:', e);
    showStatus('btStatus', '❌ 执行失败：' + e.message, 'error');
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
            // 使用字符串处理避免大数精度丢失
            const amtStr = b.amount;
            const intPart = amtStr.length > 6 ? amtStr.slice(0, -6) : '0';
            const decPart = amtStr.length > 6 ? amtStr.slice(-6) : amtStr.padStart(6, '0');
            paxiAmount = parseFloat(intPart + '.' + decPart);
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
