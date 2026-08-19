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
  // 批量转账按地址收费（PAXI/地址）
  batchTransfer: {
    feePerAddress: 0.03838,     // 原生/PRC-20 每地址手续费
    nftFeePerAddress: 1,        // NFT 每地址手续费
    maxAddressesPerTx: 100,     // 每笔交易最多地址数
    maxTotalAddresses: 1000,    // 总上限
  },
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
    submitFee: 0,
    defaultDeposit: 100,
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
// 带缓存的 LCD 请求（用于不常变化的数据，如验证人列表）
// cacheKey: localStorage 键名，cacheTtl: 缓存有效期（毫秒）
async function fetchAPIWithCache(path, cacheKey, cacheTtl = 60000) {
  // 尝试读缓存
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < cacheTtl) {
        return data;
      }
    }
  } catch (e) {}
  // 缓存未命中或过期，请求 LCD
  const data = await fetchAPI(path);
  // 写入缓存
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {}
  return data;
}

async function fetchAPI(path) {
  const res = await fetch(`${getLCD()}${path}`);
  if (!res.ok) throw new Error(`API 请求失败: HTTP ${res.status}`);
  return res.json();
}

// ============================================================
// IPFS / Pinata 上传辅助（NFT 铸造时集成）
// 用户自行填入 Pinata JWT，存于 localStorage，前端硬编码有滥用风险故不内置
// ============================================================
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
const PINATA_PIN_API = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

function getPinataJwt() {
  return localStorage.getItem('paxi_pinata_jwt') || '';
}
function setPinataJwt(jwt) {
  const v = (jwt || '').trim();
  if (v) localStorage.setItem('paxi_pinata_jwt', v);
  else localStorage.removeItem('paxi_pinata_jwt');
}
function hasPinataJwt() {
  return !!getPinataJwt();
}

// 从 ipfs://Qm... 或 https://gateway/ipfs/Qm... 中提取 CID
function ipfsCidFromUri(uri) {
  if (!uri) return '';
  let s = String(uri).trim();
  if (s.startsWith('ipfs://')) return s.slice(7).replace(/\/.*$/, '');
  const m = s.match(/\/ipfs\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{44,})/);
  return m ? m[1] : '';
}

// 将 ipfs:// URI 或裸 CID 转为可访问的 https 网关地址；http(s)/data 原样返回
function ipfsToHttp(uri) {
  if (!uri) return '';
  const s = String(uri).trim();
  if (s.startsWith('ipfs://')) {
    const cid = s.slice(7).replace(/\/.*$/, '');
    return cid ? IPFS_GATEWAY + cid : '';
  }
  // 裸 CID（Qm... 或 baf...）
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[a-z0-9]{44,})$/.test(s)) {
    return IPFS_GATEWAY + s;
  }
  // 已是 http(s)/data，直接返回
  if (/^(https?:\/\/|data:)/i.test(s)) return s;
  return '';
}

// 上传文件到 Pinata（XHR 以支持上传进度），返回 { cid, url, size }
function uploadFileToIpfs(file, onProgress) {
  return new Promise((resolve, reject) => {
    const jwt = getPinataJwt();
    if (!jwt) { reject(new Error('未配置 Pinata JWT')); return; }
    const fd = new FormData();
    fd.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', PINATA_PIN_API);
    xhr.setRequestHeader('Authorization', 'Bearer ' + jwt);
    if (typeof onProgress === 'function') {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      };
    }
    xhr.timeout = 120000;
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.IpfsHash) {
          resolve({ cid: data.IpfsHash, url: IPFS_GATEWAY + data.IpfsHash, size: data.PinSize });
        } else {
          reject(new Error(data.error || data.message || ('HTTP ' + xhr.status)));
        }
      } catch (e) {
        reject(new Error('IPFS 响应解析失败: ' + (xhr.responseText || '').slice(0, 120)));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误，IPFS 上传失败'));
    xhr.ontimeout = () => reject(new Error('IPFS 上传超时'));
    xhr.send(fd);
  });
}

// 上传 JSON 对象到 Pinata（作为 metadata.json），返回 { cid, url }
async function uploadJsonToIpfs(jsonObj, filename) {
  const jwt = getPinataJwt();
  if (!jwt) throw new Error('未配置 Pinata JWT');
  const blob = new Blob([JSON.stringify(jsonObj)], { type: 'application/json' });
  const fd = new FormData();
  fd.append('file', blob, filename || 'metadata.json');
  const res = await fetch(PINATA_PIN_API, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + jwt },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.IpfsHash) throw new Error(data.error || data.message || ('HTTP ' + res.status));
  return { cid: data.IpfsHash, url: IPFS_GATEWAY + data.IpfsHash };
}

// 构造符合 CW721 标准的元数据对象
function buildCw721Metadata(name, description, imageUri, attributes) {
  return {
    name: name || 'Untitled NFT',
    description: description || '',
    image: imageUri || '',
    external_url: '',
    attributes: Array.isArray(attributes) ? attributes : [],
  };
}

// 解析 token_uri 获取元数据 JSON（支持 ipfs/https/data，带超时）
async function fetchTokenUriMetadata(tokenUri, timeoutMs) {
  const http = ipfsToHttp(tokenUri);
  if (!http) return null;
  // data:application/json;base64,... 直接解码
  if (http.startsWith('data:application/json')) {
    const b64 = http.split(',')[1] || '';
    try {
      const json = atob(b64);
      // 处理 UTF-8
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch (e) { return null; }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 5000);
  try {
    const res = await fetch(http, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

// 将任意图片 URI 解析为可安全用于 <img src> 的地址（转义后返回，不可用则返回空串）
function safeNftImgSrc(uri) {
  if (!uri) return '';
  const http = ipfsToHttp(uri);
  if (!http) return '';
  // 仅允许 http/https/data:image，并转义
  return sanitizeUrl(http);
}

// UTF-8 安全的 JSON -> base64 data URI（IPFS 关闭时的降级方案）
function jsonToDataUri(jsonObj) {
  const bytes = new TextEncoder().encode(JSON.stringify(jsonObj));
  return 'data:application/json;base64,' + toBase64(bytes);
}

// ============================================================
// 交易构建 & 签名 & 广播（通用函数）
// wallet: { address, public_key, algo } 或 { address, publicKey, connected }
// ============================================================

// 链上模拟：向节点发一个"空签名"交易，让节点告诉我们真实 gas 消耗
async function simulateGas(messages, memo, accountNumber, sequence, pubKey, address) {
  const chainId = getChainId();
  const denom = getDenom();

  // 构造一个虚拟的 fee（用静态估算兜底，模拟时会被覆盖）
  let gasSum = 0;
  for (const msg of messages) {
    if (msg.typeUrl?.includes('MsgSend')) gasSum += 90000;
    else if (msg.typeUrl?.includes('MsgExecuteContract')) gasSum += 250000;
    else if (msg.typeUrl?.includes('MsgInstantiateContract')) gasSum += 500000;
    else if (msg.typeUrl?.includes('MsgSubmitProposal')) gasSum += 562000;
    else if (msg.typeUrl?.includes('MsgDeposit')) gasSum += 200000;
    else if (msg.typeUrl?.includes('MsgVote')) gasSum += 100000;
    else if (msg.typeUrl?.includes('MsgBeginRedelegate')) gasSum += 200000;
    else gasSum += 200000;
  }
  const dummyGas = gasSum + 100000;
  const dummyFeeAmount = PaxiCosmJS.coins(Math.floor(dummyGas * 0.25).toString(), denom)[0];

  const pubkeyBytes = typeof pubKey === 'string' ? fromBase64(pubKey) : new Uint8Array(pubKey);
  const pubkeyAny = {
    typeUrl: '/cosmos.crypto.secp256k1.PubKey',
    value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish(),
  };

  const txBody = PaxiCosmJS.TxBody.fromPartial({ messages, memo: memo || '' });
  const authInfo = PaxiCosmJS.AuthInfo.fromPartial({
    signerInfos: [{
      publicKey: pubkeyAny,
      modeInfo: { single: { mode: 1 } },
      sequence: BigInt(sequence),
    }],
    fee: { amount: [dummyFeeAmount], gasLimit: BigInt(dummyGas) },
  });

  // 构造一个空签名（32字节零）
  const emptySig = new Uint8Array(64);
  const txRaw = PaxiCosmJS.TxRaw.fromPartial({
    bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(),
    authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(),
    signatures: [emptySig],
  });

  const base64Tx = toBase64(PaxiCosmJS.TxRaw.encode(txRaw).finish());

  const res = await fetch(`${getLCD()}/cosmos/tx/v1beta1/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_bytes: base64Tx }),
  });

  if (!res.ok) {
    // 部分节点 /simulate 不可用，直接抛错让调用者回退
    throw new Error(`simulate HTTP ${res.status}`);
  }
  const data = await res.json();
  // 返回结构: { gas_info: { gas_used: "12345", gas_wanted: "67890" }, ... }
  //           或 { gasUsed: "..." }
  const gasUsed = data.gas_info?.gas_used || data.gasUsed || data.gas_info?.gas_wanted;
  if (gasUsed && Number(gasUsed) > 0) {
    return Number(gasUsed);
  }
  throw new Error('simulate 返回无有效 gas');
}

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

  // 1) 静态估算（兜底用）
  let totalGas = gasLimit;
  if (!totalGas) {
    let gasSum = 0;
    for (const msg of messages) {
      if (msg.typeUrl?.includes('MsgSend')) gasSum += 90000;
      else if (msg.typeUrl?.includes('MsgExecuteContract')) gasSum += 250000;
      else if (msg.typeUrl?.includes('MsgInstantiateContract')) gasSum += 500000;
      else if (msg.typeUrl?.includes('MsgGrant')) gasSum += 120000;
      else if (msg.typeUrl?.includes('MsgExec')) gasSum += 300000;
      else if (msg.typeUrl?.includes('MsgRevoke')) gasSum += 100000;
      else if (msg.typeUrl?.includes('MsgSubmitProposal')) gasSum += 562000;
      else if (msg.typeUrl?.includes('MsgDeposit')) gasSum += 200000;
      else if (msg.typeUrl?.includes('MsgVote')) gasSum += 100000;
      else if (msg.typeUrl?.includes('MsgBeginRedelegate')) gasSum += 200000;
      else if (msg.typeUrl?.includes('MsgCancelProposal')) gasSum += 150000;
      else gasSum += 200000;
    }
    totalGas = gasSum + 100000;
  }

  // 2) 链上模拟（simulate）— 用节点返回的精确 gas 覆盖估算
  //    避免静态估算不准导致 out of gas
  if (!gasLimit) {
    try {
      const simulatedGas = await simulateGas(messages, memo, accountNumber, sequence, pubKey, wallet.address);
      if (simulatedGas > 0) {
        // 模拟值再加 15% 缓冲，防止链上波动
        totalGas = Math.floor(simulatedGas * 1.15);
      }
    } catch (e) {
      // 模拟失败时回退到静态估算（上面的值）
      console.warn('[Tx] simulate 失败，使用静态估算:', e.message);
    }
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
