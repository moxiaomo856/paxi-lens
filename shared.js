/**
 * Paxi 工具箱 - 公共模块
 * 被 app.js（工具箱主页）和 nft-launcher/index.html（NFT发射平台）共用
 * 包含：网络配置、交易构建/签名/广播、Gas模拟、交易轮询、错误码映射、通用工具函数
 */

// ============================================================
// 网络配置（支持主网/测试网切换）
// ============================================================
const NETWORKS = {
  mainnet: {
    name: '主网',
    rpc: 'https://mainnet-rpc.paxinet.io',
    lcd: 'https://mainnet-lcd.paxinet.io',
    chainId: 'paxi-mainnet',
    denom: 'upaxi',
    denomDisplay: 'PAXI',
    sdkUrl: 'https://mainnet-api.paxinet.io/resources/js/paxi-cosmjs.umd.js',
  },
  testnet: {
    name: '测试网',
    rpc: 'https://testnet-rpc.paxinet.io',
    lcd: 'https://testnet-lcd.paxinet.io',
    chainId: 'paxi-testnet',
    denom: 'upaxi',
    denomDisplay: 'PAXI',
    sdkUrl: 'https://testnet-api.paxinet.io/resources/js/paxi-cosmjs.umd.js',
  },
};

// 当前网络（从 localStorage 读取，默认主网）
let currentNetwork = localStorage.getItem('paxi_network') || 'mainnet';

function getNetworkConfig() {
  return NETWORKS[currentNetwork] || NETWORKS.mainnet;
}

function getLCD() {
  return getNetworkConfig().lcd;
}

function getChainId() {
  return getNetworkConfig().chainId;
}

function getDenom() {
  return getNetworkConfig().denom;
}

function switchNetwork(network) {
  if (!NETWORKS[network]) return;
  currentNetwork = network;
  localStorage.setItem('paxi_network', network);
  // 刷新页面以应用新网络
  window.location.reload();
}

// 全局配置（基于当前网络动态计算）
const SHARED_CONFIG = {
  get denom() { return getDenom(); },
  get denomDisplay() { return getNetworkConfig().denomDisplay; },
  get lcd() { return getLCD(); },
  get chainId() { return getChainId(); },
  gasPrice: '0.25upaxi',
  gasLimit: 600000,
  maxMessagesPerTx: 100,
  feeCollector: 'paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd',
  feeRate: 1.5,
  // NFT 市场配置
  nftMarket: {
    listingFee: 2,
    buyFeeRate: 1,
    grantDurationSec: 300,
    listingDurationSec: 86400,
    msgTypeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
  },
  // 治理提案配置
  governance: {
    submitFee: 50,          // 工具手续费（PAXI），以后要调就改这里
    defaultDeposit: 100,    // 默认押金（PAXI）
  },
};

// ============================================================
// 通用工具函数
// ============================================================

// 安全的 Uint8Array -> Base64 转换（避免大数组栈溢出）
function toBase64(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// 安全的 Base64 -> Uint8Array 转换
function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// HTML 转义（防止 XSS）— 使用 DOM API 确保安全
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// 验证 URL scheme（防止 javascript: 等恶意协议注入）
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // 只允许 http/https/data:image 协议
  if (/^(https?:\/\/|data:image\/)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return '';
}

// 纯字符串解析金额 -> 原始单位（避免 parseFloat 精度丢失）
// 输入: "1.5", 6 -> "1500000"
// 输入: "0.000001", 6 -> "1"
// 全程使用 BigInt 运算，不经过浮点数
function parseFloatToRawUnits(amountStr, decimals) {
  if (!amountStr || typeof amountStr !== 'string') return '0';
  const str = amountStr.trim();
  if (!str || str === '.' || !/^\d+\.?\d*$/.test(str)) return '0';

  const dotIdx = str.indexOf('.');
  let intPart, decPart;
  if (dotIdx === -1) {
    intPart = str;
    decPart = '';
  } else {
    intPart = str.substring(0, dotIdx) || '0';
    decPart = str.substring(dotIdx + 1);
  }

  // 补齐或截断小数位
  if (decPart.length < decimals) {
    decPart = decPart.padEnd(decimals, '0');
  } else if (decPart.length > decimals) {
    decPart = decPart.substring(0, decimals);
  }

  try {
    const intBig = BigInt(intPart || '0');
    const decBig = BigInt(decPart || '0');
    const multiplier = BigInt(10) ** BigInt(decimals);
    return (intBig * multiplier + decBig).toString();
  } catch (e) {
    return '0';
  }
}

// PAXI -> upaxi 便捷封装（6 位小数）
function paxiToUpaxi(amountStr) {
  return parseFloatToRawUnits(amountStr, 6);
}

// upaxi -> PAXI 可读格式（字符串运算避免精度丢失）
function upaxiToPaxi(rawStr) {
  if (!rawStr || typeof rawStr !== 'string') return '0';
  const padded = rawStr.padStart(7, '0');
  const intPart = padded.slice(0, -6);
  const decPart = padded.slice(-6).replace(/0+$/, '');
  return decPart ? intPart + '.' + decPart : intPart;
}

// 复制到剪贴板（兼容移动端）
async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) { /* 降级 */ }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

// Toast 提示
function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// 状态消息显示
function showStatus(containerId, msg, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.textContent = msg;
  el.className = 'status-msg ' + type;
  el.style.display = 'block';
}

// ============================================================
// 错误码映射（友好化链上错误信息）
// ============================================================
const ERROR_CODE_MAP = {
  0: '成功',
  1: '链上通用错误（可能为空地址或编码问题）',
  2: '序列化错误',
  3: '交易字节无效',
  4: '存储空间不足',
  5: '类型解码失败',
  6: '路径越界',
  7: '序列化错误',
  8: '无效的请求类型',
  9: '地址无效',
  10: '消息序列化冲突',
  11: '越界访问',
  12: '权限不足（不满足条件）',
  13: '内部逻辑错误',
  14: '解析失败',
  15: '无效的 coin 前缀',
  16: '无效的 hex 字符串',
  17: '未知请求类型',
  18: 'gas 估算失败',
  19: '账户序列号不匹配（可能已发过其他交易，请重试）',
  20: '签名不匹配',
  21: '公钥无效',
  22: 'gas 不足',
  23: 'memo 过长',
  24: '签名无效',
  25: ' Gas 不足（交易所需的 Gas 超过了设定上限，请调高 Gas Limit）',
  26: '无效签名者数量',
  27: '地址解析失败',
  28: 'WASM 合约执行失败（合约逻辑返回错误）',
  29: '提案不存在',
  30: '无效的提议状态',
  31: '存款不足',
  32: '投票选项无效',
  33: '授权不存在或已过期',
  111: '无效的 Genesis 文件',
};

const ERROR_KEYWORD_MAP = [
  { pattern: /insufficient fund/i, msg: '账户余额不足，请确保有足够的 PAXI 支付转账+Gas' },
  { pattern: /insufficient fee/i, msg: 'Gas 费用不足，请提高 Gas Price' },
  { pattern: /unauthorized|not authorized|permission/i, msg: '权限不足：你没有执行此操作的权限' },
  { pattern: /authz.*not found|grant.*not found|no.*authorization/i, msg: '授权不存在或已过期/已撤销，请要求卖家重新授权' },
  { pattern: /account sequence mismatch|expected.*got/i, msg: '账户序列号不匹配，可能已发过其他交易，请稍后重试' },
  { pattern: /out of gas|gas.*exhausted/i, msg: 'Gas 不足，交易所需 Gas 超过设定上限' },
  { pattern: /contract.*not found|no such contract/i, msg: '合约地址不存在或不是有效合约' },
  { pattern: /nft.*not found|token.*not.*exist/i, msg: 'NFT 不存在或 token_id 无效' },
  { pattern: /not.*owner|unauthorized.*transfer/i, msg: '你不是此 NFT 的持有者，无法转移' },
  { pattern: /duplicate|already exists/i, msg: '重复操作：该资源已存在' },
  { pattern: /timeout|timed out/i, msg: '网络超时，请检查网络后重试' },
  { pattern: /rejected|denied|cancelled/i, msg: '用户在钱包中拒绝了交易' },
];

function mapError(code, rawLog) {
  // 1. 先按错误码映射
  if (code !== undefined && code !== 0 && ERROR_CODE_MAP[code]) {
    return `${ERROR_CODE_MAP[code]}（代码 ${code}）`;
  }
  // 2. 按关键字映射
  if (rawLog && typeof rawLog === 'string') {
    for (const { pattern, msg } of ERROR_KEYWORD_MAP) {
      if (pattern.test(rawLog)) {
        return `${msg}（原始信息：${rawLog.slice(0, 100)}）`;
      }
    }
  }
  // 3. 返回原始信息（截断）
  return rawLog ? (typeof rawLog === 'string' ? rawLog.slice(0, 200) : String(rawLog)) : '未知错误';
}

// ============================================================
// LCD 请求辅助
// ============================================================
async function fetchAPI(path) {
  const res = await fetch(`${getLCD()}${path}`);
  if (!res.ok) throw new Error(`API 请求失败: HTTP ${res.status}`);
  return res.json();
}

// ============================================================
// Gas 模拟（通过 LCD /cosmos/tx/v1beta1/simulate）
// 安全改进：用实际模拟值替代固定估算
// ============================================================
async function simulateGas(txBytesBase64) {
  try {
    const res = await fetch(`${getLCD()}/cosmos/tx/v1beta1/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_bytes: txBytesBase64 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const gasUsed = parseInt(data.gas_info?.gas_used || data.gasUsed || '0');
    if (gasUsed > 0) {
      // 加 20% 缓冲，防止边缘情况导致 gas 不足
      return Math.ceil(gasUsed * 1.2);
    }
  } catch (e) {
    console.warn('[Gas] 模拟失败，将使用默认估算:', e.message);
  }
  return null;
}

// ============================================================
// 交易构建 & 签名 & 广播（通用函数）
// wallet: { address, public_key, algo } 或 { address, publicKey, connected }
// ============================================================
async function buildSignAndBroadcast(messages, memo, gasLimit, wallet) {
  if (!wallet || !wallet.address) {
    throw new Error('钱包未连接');
  }

  // 兼容两种 wallet 格式
  const pubKey = wallet.public_key || wallet.publicKey;
  if (!pubKey) throw new Error('钱包公钥缺失');

  // 获取账户信息
  const accountRes = await fetch(`${getLCD()}/cosmos/auth/v1beta1/accounts/${wallet.address}`);
  if (!accountRes.ok) throw new Error(`获取账户信息失败: HTTP ${accountRes.status}`);
  const accountData = await accountRes.json();
  const account = accountData.account?.base_account || accountData.account;
  const accountNumber = Number(account.account_number);
  const sequence = Number(account.sequence);

  const chainId = getChainId();
  const denom = getDenom();

  // Gas 计算：优先用传入值，否则按消息类型动态估算
  let totalGas = gasLimit;
  if (!totalGas) {
    // 按消息类型分别估算
    let gasSum = 0;
    for (const msg of messages) {
      if (msg.typeUrl?.includes('MsgSend')) gasSum += 90000;
      else if (msg.typeUrl?.includes('MsgExecuteContract')) gasSum += 250000;
      else if (msg.typeUrl?.includes('MsgInstantiateContract')) gasSum += 500000;
      else if (msg.typeUrl?.includes('MsgGrant')) gasSum += 120000;
      else if (msg.typeUrl?.includes('MsgExec')) gasSum += 300000;
      else if (msg.typeUrl?.includes('MsgRevoke')) gasSum += 100000;
      else gasSum += 200000;
    }
    totalGas = gasSum + 100000; // 基础开销
  }

  // TxBody
  const txBody = PaxiCosmJS.TxBody.fromPartial({ messages, memo });

  // Fee - 从 SHARED_CONFIG.gasPrice 解析每 gas 的 upaxi 单价（例：'0.25upaxi' → 0.25）
  const gasPriceMatch = /^([\d.]+)\s*upaxi$/i.exec(SHARED_CONFIG.gasPrice || '0.25upaxi');
  const gasPricePerUnit = gasPriceMatch ? parseFloat(gasPriceMatch[1]) : 0.25;
  const fee = {
    amount: [PaxiCosmJS.coins(Math.floor(totalGas * gasPricePerUnit).toString(), denom)[0]],
    gasLimit: BigInt(totalGas),
  };

  // PubKey
  const pubkeyBytes = typeof pubKey === 'string' ? fromBase64(pubKey) : new Uint8Array(pubKey);
  const pubkeyAny = {
    typeUrl: '/cosmos.crypto.secp256k1.PubKey',
    value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish(),
  };

  // AuthInfo
  const authInfo = PaxiCosmJS.AuthInfo.fromPartial({
    signerInfos: [{
      publicKey: pubkeyAny,
      modeInfo: { single: { mode: 1 } },
      sequence: BigInt(sequence),
    }],
    fee,
  });

  // SignDoc
  const signDoc = PaxiCosmJS.SignDoc.fromPartial({
    bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(),
    authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(),
    chainId,
    accountNumber: BigInt(accountNumber),
  });

  // 签名 — 分块 Base64 编码避免大交易栈溢出
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

  const sigBytes = fromBase64(result.success);
  const txRaw = PaxiCosmJS.TxRaw.fromPartial({
    bodyBytes: signDoc.bodyBytes,
    authInfoBytes: signDoc.authInfoBytes,
    signatures: [sigBytes],
  });
  const txBytes = PaxiCosmJS.TxRaw.encode(txRaw).finish();
  const base64Tx = toBase64(txBytes);

  // 广播
  const broadcastRes = await fetch(`${getLCD()}/cosmos/tx/v1beta1/txs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_bytes: base64Tx, mode: 'BROADCAST_MODE_SYNC' }),
  }).then(r => r.json());

  return broadcastRes;
}

// 检查交易结果
function checkTxResult(broadcastRes) {
  const tx = broadcastRes.tx_response || broadcastRes;
  return {
    ok: tx?.code === 0 && tx?.txhash,
    txhash: tx?.txhash || '',
    code: tx?.code,
    rawLog: tx?.raw_log || broadcastRes.message || '未知错误',
  };
}

// ============================================================
// 交易轮询确认（广播后轮询交易是否上链成功）
// 改进：用户可确认交易是否真正打包进块
// ============================================================
async function pollTxStatus(txhash, maxAttempts = 30, intervalMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const data = await fetchAPI(`/cosmos/tx/v1beta1/txs/${txhash}`);
      const tx = data.tx_response || data;
      if (tx && tx.height && parseInt(tx.height) > 0) {
        return {
          confirmed: true,
          success: tx.code === 0,
          height: tx.height,
          gasUsed: tx.gas_used,
          code: tx.code,
          rawLog: tx.raw_log || '',
        };
      }
    } catch (e) {
      // 交易可能还未上链，继续等待
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return { confirmed: false };
}

// ============================================================
// localStorage 清理（清理过期数据）
// ============================================================
function cleanupLocalStorage() {
  const now = Date.now();
  const CLEAN_KEYS = [
    'paxi_nft_market_listings',
    'paxi_nft_market_imported',
    'paxi_nft_deployed',
  ];
  for (const key of CLEAN_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) continue;
      // 保留未过期或有合约地址的记录，移除 30 天前的过期数据
      const cleaned = list.filter(item => {
        if (item.expiresAt && new Date(item.expiresAt) < new Date(now - 30 * 86400000)) {
          return false; // 过期超过 30 天
        }
        if (item.timestamp && new Date(item.timestamp) < new Date(now - 30 * 86400000)) {
          // 超过 30 天的部署记录，如果没合约地址就清理
          if (!item.contractAddr) return false;
        }
        // 移除 initMsg 中的 base64 图片数据（减少存储）
        if (item.initMsg?.collection_info?.image?.startsWith('data:image')) {
          item.initMsg.collection_info.image = '[已清理大体积数据]';
        }
        return true;
      });
      if (cleaned.length !== list.length) {
        localStorage.setItem(key, JSON.stringify(cleaned));
        console.log(`[Cleanup] ${key}: 清理了 ${list.length - cleaned.length} 条过期记录`);
      }
    } catch (e) { /* 忽略 */ }
  }
}

// ============================================================
// 网络选择器 UI（在 header 中注入）
// 支持多语言显示
// ============================================================
function renderNetworkSelector(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // 从全局语言设置读取（如果存在）
  const hasLang = typeof currentLang !== 'undefined';
  const mainnetLabel = (hasLang && typeof t === 'function') ? t('common.mainnet') : (currentLang === 'zh' ? '主网' : 'Mainnet');
  const testnetLabel = (hasLang && typeof t === 'function') ? t('common.testnet') : (currentLang === 'zh' ? '测试网' : 'Testnet');

  // fallback：直接读取 NETWORKS 中的 name (兼容旧版本)
  const finalMain = currentNetwork === 'mainnet' && !hasLang ? NETWORKS.mainnet.name : mainnetLabel;
  const finalTest = currentNetwork === 'testnet' && !hasLang ? NETWORKS.testnet.name : testnetLabel;

  el.innerHTML = `
    <select id="networkSelect" onchange="switchNetwork(this.value)" style="font-size:11px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text)">
      <option value="mainnet" ${currentNetwork === 'mainnet' ? 'selected' : ''}>${mainnetLabel}</option>
      <option value="testnet" ${currentNetwork === 'testnet' ? 'selected' : ''}>${testnetLabel}</option>
    </select>
  `;
}

// 页面加载时清理过期数据
if (document.readyState !== 'loading') {
  cleanupLocalStorage();
} else {
  document.addEventListener('DOMContentLoaded', cleanupLocalStorage);
}
