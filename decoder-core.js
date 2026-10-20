/* ============================================================================
 * Paxi Tx Decoder · 核心引擎 v2
 * ----------------------------------------------------------------------------
 * 设计原则（全部基于 Paxi 主网真实链上数据验证）：
 *
 * 1. 资金解析走「事件」而非 proto 解码
 *    实测 LCD 返回 tx.body.messages 为 anypb 展开格式（顶层平铺字段，
 *    无 value/base64 包装），用 cosmjs decoder 解 value 必然失败。
 *    而 coin_spent / coin_received / transfer / wasm 事件在任何节点、
 *    任何客户端配置下都稳定存在，因此资金流向一律从事件推导。
 *
 * 2. 事件逐条独立解析（v2 修复）
 *    旧版按事件 type 聚合属性：一笔交易里两个合约都发 wasm 事件时，
 *    action/_contract_address 会被合并成数组，导致合约转账整笔丢失；
 *    多笔 coin_spent 同理。v2 改为逐事件独立解析，仅 transfer 仍与
 *    coin_* 做同源去重（防金额翻倍）。
 *
 * 3. 合约功能用「错误探测」而非猜测
 *    链上不存 schema，但 cosmwasm 反序列化失败时会回显完整枚举。
 *    无回显时退化为 KNOWN_PROBES 逐个实试（查询只读、无副作用）。
 *
 * 4. 只读、不签名、不碰私钥。纯前端直连公共节点。
 * ==========================================================================*/

const LCD = 'https://mainnet-lcd.paxinet.io';
const RPC = 'https://mainnet-rpc.paxinet.io';
const DENOM_EXP = 6;                 // 1 PAXI = 10^6 upaxi
const TIMEOUT = 20000;

/* ---------------------------------------------------------------- 基础工具 */

/* DOM 快捷函数。
 * 刻意不使用顶层 const $ —— 那会让它只存在于本文件的词法环境，
 * 一旦本文件被内联进 try{} 或模块作用域，app.js 就会抛
 * "ReferenceError: $ is not defined" 而整页交互失效。
 * 这里用 window 挂载，作用域无关，最稳妥。 */
if (typeof window !== 'undefined') window.$ = (id) => document.getElementById(id);

function shortAddr(a) {
  if (!a) return '—';
  a = String(a);
  return a.length <= 20 ? a : a.slice(0, 10) + '…' + a.slice(-8);
}

/** 数值安全转字符串（避免大数精度丢失） */
function toBig(n) {
  try { return BigInt(String(n)); } catch (_) { return 0n; }
}

/** 微单位 -> 可读十进制（纯字符串运算，不丢精度） */
function formatUnits(raw, denom, exp = DENOM_EXP) {
  const s = String(raw ?? '0').trim();
  if (!/^-?\d+$/.test(s)) return s + (denom ? ' ' + denom : '');
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  const pad = digits.padStart(exp + 1, '0');
  const int = pad.slice(0, pad.length - exp).replace(/^0+(?=\d)/, '');
  const frac = pad.slice(pad.length - exp).replace(/0+$/, '');
  const out = frac ? `${int}.${frac}` : int;
  return (neg ? '-' : '') + out;
}

/**
 * 数量展示。
 * - upaxi → 换算 PAXI
 * - ibc/... denom 不大写（哈希大小写敏感，大写即错误）
 * - 其他仅展示原值（调用方若拿到 token 精度请用 formatToken 换算）
 */
function fmtCoin(amount, denom) {
  const d = String(denom || '');
  if (d === 'upaxi') return formatUnits(amount, 'upaxi') + ' PAXI';
  if (d.startsWith('ibc/')) return String(amount) + ' ' + d;
  return String(amount) + (d ? ' ' + d.toUpperCase() : '');
}

/** 按 token_info 的 decimals/symbol 换算 PRC-20 数量 */
function formatToken(raw, info) {
  if (!info) return String(raw ?? '');
  return formatUnits(raw, '', Number(info.decimals) || 0)
    + ' ' + String(info.symbol || '').toUpperCase();
}

/* ------------------------------------------------------------ 本机地址簿 */
/* 用户给地址起的备注名（localStorage 持久化，由界面层写入）。
 * 故事文案优先显示备注名，普通用户才能"一眼看懂"。 */

let NAMEBOOK = {};
function setAddressBook(map) { NAMEBOOK = (map && typeof map === 'object') ? map : {}; }
function nameOf(addr) {
  const a = String(addr || '');
  return NAMEBOOK[a] || shortAddr(a);
}

/** 相对时间：把 RFC3339 时间戳译成"3 分钟前" */
function timeAgo(ts) {
  const t = Date.parse(ts);
  if (isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return s + ' 秒前';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  if (s < 86400 * 30) return Math.floor(s / 86400) + ' 天前';
  return Math.floor(s / 86400 / 30) + ' 个月前';
}

async function getJSON(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch (_) {}
      const err = new Error(`HTTP ${res.status}`);
      err.body = detail;
      throw err;
    }
    return await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('请求超时，节点可能无响应');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function getB64(str) {
  // UTF-8 安全的手写 base64（避免 btoa 对非 ASCII 抛错）
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------ 事件解析核心 */

/** 把 events 数组转成 Map<type, attrs[]> 结构（保留为兼容导出，内部不再使用） */
function groupEvents(events) {
  const out = [];
  for (const ev of events || []) {
    const attrs = {};
    for (const a of ev.attributes || []) {
      // 同名属性保留全部值（如多 amount）
      if (attrs[a.key] === undefined) attrs[a.key] = a.value;
      else if (Array.isArray(attrs[a.key])) attrs[a.key].push(a.value);
      else attrs[a.key] = [attrs[a.key], a.value];
    }
    out.push({ type: ev.type, attrs });
  }
  return out;
}

const asArr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** 单个事件内的属性表（事件之间互不合并 —— v2 关键修复） */
function attrsOf(ev) {
  const o = {};
  for (const a of ev.attributes || []) {
    if (o[a.key] === undefined) o[a.key] = a.value;
    else if (Array.isArray(o[a.key])) o[a.key].push(a.value);
    else o[a.key] = [o[a.key], a.value];
  }
  return o;
}

/**
 * 资金流向全量提取（v2：逐事件解析）
 * 返回 { native, contract, semanticTransfers, feePayer, fee }
 *
 * native   : 原生币(upaxi) 净变动，按 地址|denom 聚合（BigInt，不丢精度）
 * contract : 合约内资产转移（PRC-20 / PRC-721 / mint / burn / cw20.send 等）
 */
function extractFlows(txr) {
  const nativeMap = new Map();
  const contract = [];
  const semanticTransfers = [];
  let sawCoinEvent = false;
  let feePayer = '';
  let feeFromEvent = '';

  /** 记一笔原生币变动；sign=+1 收入，-1 支出 */
  const addNative = (addr, amountStr, sign) => {
    if (!addr || Array.isArray(addr)) addr = asArr(addr)[0];
    const m = String(amountStr).match(/^(\d+)(.+)$/);
    if (!addr || !m) return;
    const denom = m[2];
    const key = addr + '|' + denom;
    if (!nativeMap.has(key)) nativeMap.set(key, { address: addr, denom, delta: 0n });
    nativeMap.get(key).delta += (sign < 0 ? -1n : 1n) * toBig(m[1]);
  };

  for (const ev of txr.events || []) {
    const a = attrsOf(ev);

    // 原生币：支出（每个事件独立处理，多笔互不污染）
    if (ev.type === 'coin_spent') {
      sawCoinEvent = true;
      for (const amt of asArr(a.amount)) addNative(a.spender, amt, -1);
    }
    // 原生币：收入
    if (ev.type === 'coin_received') {
      sawCoinEvent = true;
      for (const amt of asArr(a.amount)) addNative(a.receiver, amt, +1);
    }
    // transfer 是 coin_spent/coin_received 的语义镜像，同源累加会重复计数。
    // 因此仅在该笔交易完全没有资金事件时，才用它兜底还原。
    if (ev.type === 'transfer' && a.sender && a.recipient) {
      if (!sawCoinEvent) {
        for (const amt of asArr(a.amount)) {
          addNative(a.sender, amt, -1);
          addNative(a.recipient, amt, +1);
        }
      }
      // 无论是否兜底，都记录这笔转账的语义（供故事层使用）
      semanticTransfers.push({
        from: a.sender, to: a.recipient, amount: asArr(a.amount)
      });
    }
    // 手续费
    if (ev.type === 'tx') {
      if (a.fee_payer) feePayer = a.fee_payer;
      if (a.fee) feeFromEvent = a.fee;
    }

    // 合约事件：cw20 / cw721 / 自定义（逐事件独立，多合约交易不再互相污染）
    if (ev.type === 'wasm') {
      const c = a._contract_address || '';
      const action = a.action || '';
      // PRC-20 转账（cw20 标准 transfer：from/to 都是普通地址或合约）
      if (action === 'transfer' && a.from && a.to) {
        contract.push({
          kind: 'PRC-20', contract: c,
          from: a.from, to: a.to,
          amount: asArr(a.amount).join(', '), tokenId: ''
        });
      }
      // PRC-721 转账
      if (action === 'transfer_nft' && a.from && a.to) {
        contract.push({
          kind: 'PRC-721', contract: c,
          from: a.from, to: a.to, amount: '', tokenId: a.token_id || ''
        });
      }
      // cw20 send：接收方是「合约」，随后会触发该合约的接收钩子，
      // 不是空投 —— 标注清楚避免误导（v2 语义修正）
      if (action === 'send') {
        contract.push({
          kind: '合约间转账', contract: c,
          from: a.sender || '', to: a.to || a.recipient || '',
          amount: asArr(a.amount).join(', '), tokenId: '', viaHook: true
        });
      }
      // mint / burn（recipient 命名因实现而异，多路径兼容）
      if (action === 'mint' || action === 'burn') {
        contract.push({
          kind: action === 'mint' ? '铸造' : '销毁', contract: c,
          from: action === 'mint' ? '' : (a.from || a.sender || a.owner || ''),
          to: action === 'mint' ? (a.to || a.recipient || a.owner || '') : '',
          amount: asArr(a.amount).join(', '), tokenId: a.token_id || ''
        });
      }
      // 兜底：任何带 amount 且带 from/to 的 wasm 事件
      if (!['transfer', 'transfer_nft', 'send', 'mint', 'burn'].includes(action)
          && a.amount && (a.from || a.to)) {
        contract.push({
          kind: action ? `合约:${action}` : '合约资产转移', contract: c,
          from: a.from || '', to: a.to || '',
          amount: asArr(a.amount).join(', '), tokenId: ''
        });
      }
    }
  }

  const native = [...nativeMap.values()]
    .map(x => ({ ...x }))
    .filter(x => x.delta !== 0n);

  return { native, contract, semanticTransfers, feePayer, fee: feeFromEvent };
}

/* ------------------------------------------------------- 消息类型 → 中文语义 */

/**
 * 关键：LCD 返回的消息是 anypb 展开格式，字段直接平铺在 value 层。
 * 因此这里做多形态兼容：
 *   m.value.from_address / m.from_address / m.fromAddress
 */
function readMsg(m) {
  const v = (m && (m.value && typeof m.value === 'object')) ? m.value : (m || {});
  const pick = (...keys) => {
    for (const k of keys) if (v[k] !== undefined && v[k] !== null && v[k] !== '') return v[k];
    return '';
  };
  return {
    type: (m && m['@type']) || '',
    from: pick('from_address', 'fromAddress', 'sender', 'voter', 'signer', 'grantee'),
    to: pick('to_address', 'toAddress', 'recipient'),
    amount: pick('amount', 'amounts', 'value'),
    raw: v,
  };
}

const TYPE_LABEL = {
  '/cosmos.bank.v1beta1.MsgSend': '原生转账',
  '/cosmos.bank.v1beta1.MsgMultiSend': '批量转账',
  '/cosmwasm.wasm.v1.MsgExecuteContract': '合约调用',
  '/cosmwasm.wasm.v1.MsgInstantiateContract': '部署合约实例',
  '/cosmwasm.wasm.v1.MsgStoreCode': '上传合约代码',
  '/cosmwasm.wasm.v1.MsgMigrateContract': '合约迁移升级',
  '/cosmwasm.wasm.v1.MsgUpdateAdmin': '转移合约管理权',
  '/cosmwasm.wasm.v1.MsgClearAdmin': '放弃合约管理权',
  '/cosmos.staking.v1beta1.MsgDelegate': '质押委托',
  '/cosmos.staking.v1beta1.MsgUndelegate': '解除质押',
  '/cosmos.staking.v1beta1.MsgBeginRedelegate': '质押迁移',
  '/cosmos.staking.v1beta1.MsgEditValidator': '编辑验证者信息',
  '/cosmos.staking.v1beta1.MsgCreateValidator': '创建验证者',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': '领取质押收益',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission': '提取验证者佣金',
  '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress': '设置收益接收地址',
  '/cosmos.distribution.v1beta1.MsgFundCommunityPool': '向社区池捐款',
  '/cosmos.gov.v1beta1.MsgVote': '治理投票',
  '/cosmos.gov.v1beta1.MsgSubmitProposal': '提交提案',
  '/cosmos.gov.v1beta1.MsgDeposit': '提案押金',
  '/cosmos.gov.v1.MsgVote': '治理投票',
  '/cosmos.gov.v1.MsgVoteWeighted': '治理加权投票',
  '/cosmos.gov.v1.MsgSubmitProposal': '提交提案',
  '/cosmos.gov.v1.MsgDeposit': '提案押金',
  '/cosmos.gov.v1.MsgCancelProposal': '撤销提案',
  '/cosmos.slashing.v1beta1.MsgUnjail': '解除验证者监禁',
  '/ibc.applications.transfer.v1.MsgTransfer': '跨链转账',
  '/paxi.swap.v1.MsgSwap': '兑换 Swap',
  '/paxi.swap.v1.MsgProvideLiquidity': '提供流动性',
  '/paxi.swap.v1.MsgWithdrawLiquidity': '提取流动性',
  /* 官方文档 DApp指南 §3.8 / paxi-cosmjs.umd.js proto 包名（x.swap.types）确认的真实 typeUrl */
  '/x.swap.types.MsgSwap': '兑换 Swap',
  '/x.swap.types.MsgProvideLiquidity': '提供流动性',
  '/x.swap.types.MsgWithdrawLiquidity': '提取流动性',
  '/cosmos.authz.v1beta1.MsgGrant': '授予代理权限',
  '/cosmos.authz.v1beta1.MsgRevoke': '撤销代理权限',
  '/cosmos.authz.v1beta1.MsgExec': '代理执行',
  '/cosmos.feegrant.v1beta1.MsgGrantAllowance': '授权 Gas 补贴',
  '/cosmos.feegrant.v1beta1.MsgRevokeAllowance': '撤销 Gas 补贴',
  '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade': '软件升级提案',
  '/cosmos.crisis.v1beta1.MsgVerifyInvariant': '校验链上不变量',
};

function labelOf(type) {
  if (TYPE_LABEL[type]) return TYPE_LABEL[type];
  const short = String(type).split('.').pop();
  return short || '未知动作';
}

/** 投票选项 → 中文 */
const VOTE_OPT = {
  VOTE_OPTION_YES: '赞成', VOTE_OPTION_NO: '反对',
  VOTE_OPTION_ABSTAIN: '弃权', VOTE_OPTION_NO_WITH_VETO: '否决',
};
function voteText(o) { return VOTE_OPT[o] || o; }

/** base64 -> UTF-8 字符串（不依赖 atob，兼容任意运行环境） */
function b64ToUtf8(b64) {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch (_) {
    try { return Buffer.from(b64, 'base64').toString('utf8'); } catch (__) {}
    try { return decodeURIComponent(escape(b64)); } catch (__) {}
    return '';
  }
}

/** 解析合约调用里嵌的 JSON（MsgExecuteContract.msg 为 base64） */
function decodeContractMsg(m) {
  const v = (m && m.value && typeof m.value === 'object') ? m.value : {};
  const fields = { contract: v.contract || '', sender: v.sender || '', action: '', args: null, raw: null };

  // 兼容三种承载形式：base64 字符串 / 字节数组 / 已展开的普通对象
  let text = '';
  if (typeof v.msg === 'string') text = b64ToUtf8(v.msg);
  else if (Array.isArray(v.msg)) {
    try { text = new TextDecoder().decode(new Uint8Array(v.msg)); } catch (_) {}
  } else if (v.msg && typeof v.msg === 'object') {
    text = JSON.stringify(v.msg);
  }

  if (text) {
    try {
      const j = JSON.parse(text);
      if (j && typeof j === 'object') {
        fields.raw = j;
        fields.action = Object.keys(j)[0] || '';
        fields.args = j[fields.action];
      }
    } catch (_) {}
  }
  return fields;
}

const EXEC_LABEL = {
  transfer: '代币转账', transfer_from: '代币转账', send: '合约间转账',
  transfer_nft: 'NFT 转账', send_nft: 'NFT 转账', mint: '铸造', burn: '销毁',
  increase_allowance: '增加授权额度', decrease_allowance: '减少授权额度',
  increase_allowances: '批量增加授权', decrease_allowances: '批量减少授权',
  swap: '兑换', swap_native_for_native: '兑换', provide_liquidity: '提供流动性',
  withdraw_liquidity: '提取流动性',
  stake: '质押', unstake: '解除质押', claim_rewards: '领取收益',
  play: '游戏对局提交', upgrade: '升级卡牌', evolve: '升星',
  mint_to: '铸造', burn_from: '销毁',
};

/** 这些动作的资金细节已由 wasm 事件（flows.contract）讲清，故事层不再重复一行 */
const COVERED_ACTIONS = ['transfer', 'transfer_nft', 'send', 'mint', 'burn', 'send_nft'];

/* ---------------------------------------------------------- 人类可读故事 */

/** PRC-20 数量的展示：有 token_info 就换算成 "99 PXT"，没有就注明精度未知 */
function tokenAmtStr(raw, contract, tokens) {
  const info = tokens && tokens[contract];
  if (info && info.symbol) return esc(formatToken(raw, info));
  return `${esc(raw)} 枚代币（精度未知）`;
}

/**
 * 单条消息 → 故事行。authz.MsgExec 会递归展开子消息。
 * tokens: Map<contractAddr, {symbol, decimals, name}>，由界面层异步补齐后传入。
 */
function storyLineFor(m, flows, tokens) {
  const info = readMsg(m);
  const t = info.type;
  const v = info.raw;
  const lines = [];

  if (t === '/cosmos.bank.v1beta1.MsgSend') {
    const amts = Array.isArray(info.amount)
      ? info.amount.map(x => fmtCoin(x.amount, x.denom)).join('、')
      : fmtCoin(info.amount, 'upaxi');
    lines.push(`💸 <b>${esc(nameOf(info.from))}</b> 向 <b>${esc(nameOf(info.to))}</b> 转账 <b>${esc(amts)}</b>`);

  } else if (t === '/cosmos.bank.v1beta1.MsgMultiSend') {
    const fmtSide = (arr) => (arr || []).map(x =>
      `${esc(nameOf(x.address))}（${(x.coins || []).map(c => fmtCoin(c.amount, c.denom)).join('、')}）`).join(' + ');
    lines.push(`💸 批量转账：${fmtSide(v.inputs)} → ${fmtSide(v.outputs)}`);

  } else if (t.includes('ibc.applications.transfer') || t.endsWith('.MsgTransfer')) {
    const tok = v.token || {};
    lines.push(`🌐 <b>${esc(nameOf(info.from))}</b> 通过通道 <b>${esc(v.source_channel || '?')}</b> `
      + `向目标链地址 <b>${esc(shortAddr(v.receiver || ''))}</b> 跨链转出 <b>${esc(fmtCoin(tok.amount, tok.denom))}</b> `
      + `（跨链转账需等待对方链确认，约几秒到几分钟）`);

  } else if (t.endsWith('.MsgExecuteContract')) {
    const c = decodeContractMsg(m);
    const covered = COVERED_ACTIONS.includes(c.action) && flows.contract.length > 0;
    if (!covered) {
      const act = EXEC_LABEL[c.action] || c.action || '未知操作';
      lines.push(`📜 <b>${esc(nameOf(c.sender || info.from))}</b> 调用合约 `
        + `<span class="lnk" data-addr="${esc(c.contract)}">${esc(nameOf(c.contract))}</span> `
        + `执行 <b>${esc(act)}</b>`);
    }

  } else if (t.endsWith('.MsgInstantiateContract')) {
    const c = v.contract || '';
    const lbl = v.label || '';
    const adm = v.admin || '';
    lines.push(`🚀 <b>${esc(nameOf(info.from))}</b> 创建了一个新合约`
      + (lbl ? `（标签：<b>${esc(lbl)}</b>）` : '')
      + (c ? `：<span class="lnk" data-addr="${esc(c)}">${esc(shortAddr(c))}</span>` : '')
      + (adm ? `，管理员 ${esc(shortAddr(adm))}（可升级）` : '，未设管理员（不可升级）'));

  } else if (t.endsWith('.MsgStoreCode')) {
    lines.push(`📦 <b>${esc(nameOf(info.from))}</b> 上传了一份新的合约代码`);

  } else if (t.endsWith('.MsgMigrateContract')) {
    const c = v.contract || '';
    lines.push(`🔄 <b>${esc(nameOf(info.from))}</b> 把合约 `
      + `<span class="lnk" data-addr="${esc(c)}">${esc(nameOf(c))}</span> `
      + `升级到新版本（Code ID ${esc(v.code_id || '?')}）`);

  } else if (t.endsWith('.MsgDelegate')) {
    const amt = v.amount ? fmtCoin(v.amount.amount, v.amount.denom) : '';
    lines.push(`🏦 <b>${esc(nameOf(info.from))}</b> 将 ${esc(amt)} 质押给验证者 `
      + `${esc(shortAddr(v.validator_addr || ''))}`
      + `（质押即锁定，取出需先解除质押并等待解绑期）`);

  } else if (t.endsWith('.MsgUndelegate')) {
    const amt = v.amount ? fmtCoin(v.amount.amount, v.amount.denom) : '';
    lines.push(`🏦 <b>${esc(nameOf(info.from))}</b> 解除对验证者 `
      + `${esc(shortAddr(v.validator_addr || ''))} 的质押 ${esc(amt)}`
      + `——资金需等待解绑期后自动到账，期间不可交易也无收益`);

  } else if (t.endsWith('.MsgBeginRedelegate')) {
    const amt = v.amount ? fmtCoin(v.amount.amount, v.amount.denom) : '';
    lines.push(`🏦 <b>${esc(nameOf(info.from))}</b> 把质押从验证者 `
      + `${esc(shortAddr(v.validator_src_address || ''))} 迁移到 `
      + `${esc(shortAddr(v.validator_dst_address || ''))}，金额 ${esc(amt)}`
      + `（本金不变，无需等待解绑）`);

  } else if (t.includes('WithdrawDelegatorReward')) {
    lines.push(`💰 <b>${esc(nameOf(info.from))}</b> 向验证者 `
      + `${esc(shortAddr(v.validator_addr || ''))} 收取质押收益`);

  } else if (t.includes('WithdrawValidatorCommission')) {
    lines.push(`💰 验证者 ${esc(shortAddr(v.validator_addr || ''))} 提取了自己的佣金`);

  } else if (t.includes('SetWithdrawAddress')) {
    lines.push(`💰 <b>${esc(nameOf(info.from))}</b> 把未来收益的接收地址设为 `
      + `${esc(shortAddr(v.withdraw_address || ''))}`);

  } else if (t.includes('FundCommunityPool')) {
    const amt = v.amount ? asArr(v.amount).map(x => fmtCoin(x.amount, x.denom)).join('、') : '';
    lines.push(`💜 <b>${esc(nameOf(info.from))}</b> 向社区公共资金池捐出 ${esc(amt)}`);

  } else if (t.endsWith('.MsgUnjail')) {
    lines.push(`🔓 验证者 ${esc(shortAddr(v.validator_addr || ''))} 申请解除监禁，恢复出块资格`);

  } else if (t.includes('gov.') && t.endsWith('.MsgVote')) {
    const detail = v.proposal_id ? `提案 #${esc(v.proposal_id)}` : '';
    const opt = v.option ? voteText(v.option) : '';
    lines.push(`🗳️ 治理投票${detail ? `：${detail}` : ''}${opt ? `，投了 <b>${esc(opt)}</b>` : ''}`
      + (info.from ? `（投票人 ${esc(nameOf(info.from))}）` : ''));

  } else if (t.includes('gov.') && t.endsWith('.MsgVoteWeighted')) {
    const detail = v.proposal_id ? `提案 #${esc(v.proposal_id)}` : '';
    const opts = (v.options || []).map(o => `${voteText(o.option)}${o.weight ? '×' + o.weight : ''}`).join('、');
    lines.push(`🗳️ 治理加权投票${detail ? `：${detail}` : ''}${opts ? `，投票分布 <b>${esc(opts)}</b>` : ''}`
      + (info.from ? `（投票人 ${esc(nameOf(info.from))}）` : ''));

  } else if (t.includes('gov.') && t.endsWith('.MsgDeposit')) {
    const amt = v.amount ? asArr(v.amount).map(x => fmtCoin(x.amount, x.denom)).join('、') : '';
    lines.push(`🏦 提案押金：${esc(nameOf(info.from))} 为提案 #${esc(v.proposal_id || '?')} 补充押金 ${esc(amt)}`
      + `（押金达标后提案进入投票期）`);

  } else if (t.includes('gov.') && t.endsWith('.MsgSubmitProposal')) {
    lines.push(`🗳️ ${esc(nameOf(info.from))} 提交了新提案`
      + (v.messages && v.messages.length ? `（含 ${v.messages.length} 个执行动作）` : ''));

  } else if (t.includes('gov.') && t.endsWith('.MsgCancelProposal')) {
    lines.push(`🚫 ${esc(nameOf(info.from))} 撤销了提案 #${esc(v.proposal_id || '?')}`);

  } else if (t.includes('.MsgSwap') || t.includes('.MsgProvideLiquidity') || t.includes('.MsgWithdrawLiquidity')) {
    const label = labelOf(t);
    let extra = '';
    if (v.offer_coin) {
      extra = `，用 ${esc(fmtCoin(v.offer_coin.amount, v.offer_coin.denom))} 换 ${esc(String(v.ask_denom || '').toUpperCase())}`;
    } else if (v.offerAmount) {
      /* 官方 MsgSwap 扁平字段：offerDenom/offerAmount/minReceive（DApp指南 §3.8） */
      const od = String(v.offerDenom || '');
      const inShow = od === 'upaxi' ? fmtCoin(v.offerAmount, 'upaxi') : `${v.offerAmount}（PRC-20 最小单位）`;
      extra = `，用 ${esc(inShow)} 去换另一种币`
        + (v.minReceive ? `，并设定"最少到手 ${esc(String(v.minReceive))} 最小单位"的保护线` : '');
    }
    lines.push(`🔁 ${esc(label)}：<b>${esc(nameOf(info.from))}</b> 发起${extra}`);

  } else if (t.endsWith('.MsgExec')) {
    const subs = v.msgs || [];
    lines.push(`👤 <b>${esc(nameOf(info.from))}</b> 使用他人授予的权限，代为执行了 ${subs.length} 个操作：`);
    for (const sm of subs) {
      for (const l of storyLineFor(sm, flows, tokens)) lines.push('　　· ' + l);
    }

  } else if (t.endsWith('.MsgGrant')) {
    lines.push(`🔑 ${esc(nameOf(v.granter || info.from))} 授权 ${esc(nameOf(v.grantee || ''))} 可代自己执行部分操作`);

  } else if (t.endsWith('.MsgRevoke')) {
    lines.push(`🔑 ${esc(nameOf(v.granter || info.from))} 撤销了对 ${esc(nameOf(v.grantee || ''))} 的授权`);

  } else if (t.includes('feegrant') && t.endsWith('.MsgGrantAllowance')) {
    lines.push(`⛽ ${esc(nameOf(v.granter || info.from))} 同意为 ${esc(nameOf(v.grantee || ''))} 代付手续费（Gas 补贴）`);

  } else if (t.includes('feegrant') && t.endsWith('.MsgRevokeAllowance')) {
    lines.push(`⛽ ${esc(nameOf(v.granter || info.from))} 撤销了给 ${esc(nameOf(v.grantee || ''))} 的手续费补贴`);

  } else if (t) {
    lines.push(`• ${esc(labelOf(t))}${info.from ? `：${esc(nameOf(info.from))}` : ''}`);
  }

  return lines;
}

/**
 * 一句话总结这笔交易（总起句）—— 先给结论，再展开细节。
 */
function summarizeTx(msgs, flows) {
  let send = 0, multi = 0, game = 0, swap = 0, ibc = 0, stake = 0,
      gov = 0, deploy = 0, claim = 0, other = 0;
  for (const m of msgs) {
    const t = (m && m['@type']) || '';
    if (t.endsWith('.MsgSend')) send++;
    else if (t.endsWith('.MsgMultiSend')) multi++;
    else if (t.endsWith('.MsgExecuteContract')) {
      const c = decodeContractMsg(m);
      const a = (c.action || '').toLowerCase();
      if (['play', 'upgrade', 'evolve', 'battle', 'attack', 'forge', 'claim_game', 'draw', 'summon'].includes(a)) game++;
      else if (a.includes('swap')) swap++;
      else other++;
    }
    else if (t.includes('.MsgSwap')) swap++;
    else if (t.includes('.MsgProvideLiquidity') || t.includes('.MsgWithdrawLiquidity')) swap++;
    else if (t.includes('ibc.applications.transfer') || t.endsWith('.MsgTransfer')) ibc++;
    else if (t.includes('staking.')) stake++;
    else if (t.includes('gov.')) gov++;
    else if (t.includes('Instantiate') || t.includes('StoreCode') || t.includes('Migrate')) deploy++;
    else if (t.includes('Withdraw') || t.includes('Commission')) claim++;
    else other++;
  }
  const flags = [send, multi, game, swap, ibc, stake, gov, deploy, claim, other].filter(x => x > 0).length;
  const n = msgs.length;

  if (flags > 1) return { head: `这是一笔复合操作，共 ${n} 个动作：`, plain: `这笔交易一口气办了 ${n} 件事，像一次跑腿办完多项业务` };
  if (send === 1 && n === 1) return { head: '这是一笔普通转账：', plain: '就像发红包，把币从一个地址放进另一个地址的口袋' };
  if (multi) return { head: '这是一笔一对多的批量转账：', plain: '一个人同时给很多地址发币，像一次给全班同学发糖' };
  if (game) return { head: '这是一次游戏操作：', plain: '这是在链上小游戏里做的操作（升级、战斗、抽卡之类）' };
  if (swap) return { head: '这是一次代币兑换：', plain: '用一种币换了另一种币，像在货币兑换处换钱' };
  if (ibc) return { head: '这是一笔跨链转账：', plain: '通过官方"跨链桥"，把币从 Paxi 这条链送到另一条区块链' };
  if (stake) return { head: '这是一笔质押操作：', plain: '把币交给"记账的节点"（验证者）帮忙保管记账，从而赚取收益' };
  if (gov) return { head: '这是一次链上治理参与：', plain: '链上的大事由大家投票决定，这笔交易就是在投票或提交提案' };
  if (deploy) return { head: '这是一次合约部署/升级：', plain: '把一个自动运行的程序"安装"到链上（或给它升级）' };
  if (claim) return { head: '这是一次收益领取：', plain: '把之前赚到的利息/奖励，从系统里取回自己的口袋' };
  if (other) return { head: '这是一次合约/系统操作：', plain: '让链上的自动程序（智能合约）替自己办了一件事' };
  return '';
}

/**
 * 生成完整交易故事。
 * tokens（可选）：Map<contractAddr, {symbol, decimals}>，用于 PRC-20 精度换算。
 */
function buildStory(txr, msgs, flows, tokens) {
  const lines = [];
  const ok = txr.code === 0 || txr.code === '0';

  if (!ok) {
    lines.push(`💡 <b>简单说</b>：这笔交易<b>没有成功</b>——你的钱没有被转走，通常只损失了一点点手续费。下面是它"本来想做什么"（都<b>没有发生</b>）。`);
    lines.push(`❌ 这笔交易执行失败（错误码 ${esc(txr.code)}）——资金没有被转移，通常只扣了手续费。以下为它<b>意图</b>执行的动作（均未生效）：`);
  } else {
    const s = summarizeTx(msgs, flows);
    if (s) {
      /* 大白话先行：小学生也能一眼看懂的一句总结 */
      lines.push(`💡 <b>简单说</b>：${esc(s.plain)}。`);
      lines.push(esc(s.head));
    }
  }

  for (const m of msgs) lines.push(...storyLineFor(m, flows, tokens));

  // 合约内资产转移（PRC-20/721），wasm 事件已讲清细节，这里给结果视角
  for (const c of flows.contract) {
    if (c.kind === 'PRC-20') {
      lines.push(`🪙 <b>${esc(nameOf(c.from))}</b> 将 ${tokenAmtStr(c.amount, c.contract, tokens)} 转给了 `
        + `<b>${esc(nameOf(c.to))}</b>（代币转账，经由合约 `
        + `<span class="lnk" data-addr="${esc(c.contract)}">${esc(shortAddr(c.contract))}</span>）`);
    } else if (c.kind === 'PRC-721') {
      lines.push(`🖼️ <b>${esc(nameOf(c.from))}</b> 将 NFT <b>#${esc(c.tokenId)}</b> 转移给 `
        + `<b>${esc(nameOf(c.to))}</b>（经由合约 `
        + `<span class="lnk" data-addr="${esc(c.contract)}">${esc(shortAddr(c.contract))}</span>）`);
    } else if (c.kind === '铸造') {
      lines.push(`✨ 合约铸造了资产 <b>${esc(c.amount || '#' + c.tokenId)}</b> → ${esc(nameOf(c.to))}`);
    } else if (c.kind === '销毁') {
      lines.push(`🔥 合约销毁了资产 <b>${esc(c.amount || '#' + c.tokenId)}</b>（永久减少）`);
    } else if (c.kind === '合约间转账') {
      lines.push(`🔗 代币合约把 <b>${tokenAmtStr(c.amount, c.contract, tokens)}</b> 转入合约 `
        + `<b>${esc(nameOf(c.to))}</b>（触发其内部逻辑，非普通转账）`);
    } else if (c.amount) {
      lines.push(`📦 合约内资产变动：${esc(c.kind)}`
        + (c.from ? ` ${esc(nameOf(c.from))}` : '')
        + (c.to ? ` → ${esc(nameOf(c.to))}` : '')
        + `，数量 <b>${tokenAmtStr(c.amount, c.contract, tokens)}</b>`);
    }
  }

  /* 小词典：按这笔交易实际出现的概念，给出小学生级解释 */
  const tips = [];
  const cats = msgs.map(m => (m && m['@type']) || '').join(' ');
  if (cats.endsWith('.MsgSend') || cats.includes('.MsgSend') || flows.native.length) {
    tips.push('地址 = 链上账户的"门牌号"，以 paxi1 开头，全世界唯一，转错人拿不回来');
  }
  if (cats.includes('staking.')) tips.push('质押 = 把币托付给"帮忙记账的节点"（验证者）赚收益，类似存钱吃利息');
  if (cats.includes('gov.')) tips.push('提案/投票 = 链上的大事由全体持币人一起投票决定');
  if (cats.includes('ibc') || cats.includes('MsgTransfer')) tips.push('跨链 = 走官方"跨链桥"，把币送到另一条区块链');
  if (cats.includes('Instantiate') || cats.includes('StoreCode') || cats.includes('Migrate')) {
    tips.push('合约 = 安装在链上、按规则自动运行的程序，像一台无人售货机');
  }
  if (flows.contract.length) tips.push('代币/NFT = 链上的数字资产，转出去就归对方了');
  if (cats.includes('MsgSwap')) tips.push('兑换 = 在链上的"自动换币机"里，按当时的池子价格换成另一种币');
  if (tips.length) {
    lines.push(`📚 <b>小词典（看懂上面的话，有这些就够啦）</b>：${tips.map(t => esc(t)).join('；')}。`);
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------ 合约 schema 探测 */

/** 已知标准合约的候选查询（无回显时逐个实试，查询只读、无副作用） */
const KNOWN_PROBES = {
  prc20: ['token_info', 'balance', 'minter', 'marketing_info'],
  prc721: ['nft_info', 'num_tokens', 'contract_info', 'tokens'],
  generic: ['config', 'get_config', 'info', 'state'],
};

/**
 * 核心技巧：用一个必然不存在的变体名去撞合约，
 * cosmwasm 反序列化失败时会回显该合约真实的完整查询枚举。
 * 无回显时（untagged enum / 自定义解析 / 未知错误格式），
 * 退化为 KNOWN_PROBES 逐个实试。
 */
async function probeSchema(contract) {
  const sentinel = '{"__paxi_probe__":{}}';
  const fetchText = async (b64, ms = 8000) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(`${LCD}/cosmwasm/wasm/v1/contract/${contract}/smart/${b64}`, { signal: ctrl.signal });
      return await res.text();
    } catch (_) {
      return '';
    } finally {
      clearTimeout(timer);
    }
  };

  const text = await fetchText(getB64(sentinel));

  // 命中回显：unknown variant `x`, expected one of `a`, `b`, ...
  // （在整段返回里找，不只看 message 字段 —— 防节点错误包装格式差异）
  const m = text.match(/unknown variant[\s\S]{0,60}?expected one of\s*:?\s*([\s\S]{0,2400})/);
  if (m) {
    const list = [...new Set(
      [...m[1].matchAll(/`([^`]+)`/g)].map(x => x[1].slice(0, 64))
    )];
    if (list.length) return { methods: list, source: 'schema-echo' };
  }

  // 少数合约回显 type 但不带枚举（含 untagged enum 场景）
  if (/data did not match any variant of untagged enum|Error parsing into type/i.test(text)) {
    return { methods: [], source: 'type-only', typeName: (text.match(/Error parsing into type\s+([^:<\n]+)/i) || [])[1] || '' };
  }

  // 兜底：已知标准方法逐个实试（拿到 data 即为真实存在的方法）
  const cands = [...KNOWN_PROBES.generic, ...KNOWN_PROBES.prc20, ...KNOWN_PROBES.prc721];
  const known = [];
  for (const q of cands) {
    if (known.length >= 4) break;
    const t2 = await fetchText(getB64(`{"${q}":{}}`));
    if (t2 && t2.includes('"data"')) known.push(q);
  }
  if (known.length) return { methods: known, source: 'known-probe' };

  return { methods: [], source: 'no-echo', raw: String(text || '').slice(0, 200) };
}

/** 判断合约类别 */
function classify(contractInfo, schema) {
  const label = String(contractInfo.label || '').toLowerCase();
  const methods = (schema.methods || []).map(m => m.toLowerCase());
  const has = (k) => methods.includes(k);

  if (has('nft_info') || has('all_nft_info') || has('owner_of')) return 'PRC-721 NFT';
  if (has('token_info') && has('balance')) return 'PRC-20 代币';
  if (label.includes('nft')) return 'PRC-721 NFT';
  if (label.includes('prc20') || label.includes('token')) return 'PRC-20 代币';

  // 按代码推断（仅对 Paxi 创世合约有效，新合约不适用）
  const codeId = String(contractInfo.code_id || '');
  if (codeId === '1') return 'PRC-20 代币（按 Code ID）';
  if (codeId === '2') return 'PRC-721 NFT（按 Code ID）';
  return '自定义合约';
}

/** 为查询方法生成参数模板 */
function templateFor(method) {
  const m = method.toLowerCase();
  if (m === 'balance') return { balance: { address: '在此填入要查询的地址' } };
  if (m === 'allowance') return { allowance: { owner: 'paxi1...', spender: 'paxi1...' } };
  if (m === 'owner_of') return { owner_of: { token_id: '1', include_expired: false } };
  if (m === 'nft_info') return { nft_info: { token_id: '1' } };
  if (m === 'all_nft_info') return { all_nft_info: { owner: 'paxi1...' } };
  if (m === 'tokens') return { tokens: { owner: 'paxi1...', start_after: '', limit: 30 } };
  if (m === 'all_tokens') return { all_tokens: { start_after: '', limit: 30 } };
  if (m === 'minter') return { minter: {} };
  if (m === 'marketing_info') return { marketing_info: {} };
  if (m === 'contract_info') return { contract_info: {} };
  if (m === 'num_tokens') return { num_tokens: {} };
  if (m === 'token_info') return { token_info: {} };
  return { [method]: {} };
}

/* ============================================================ 对外接口 */

window.PaxiDecoder = {
  LCD, RPC,
  shortAddr, nameOf, setAddressBook, timeAgo,
  fmtCoin, formatUnits, formatToken, getJSON, getB64,
  extractFlows, buildStory, readMsg, labelOf, decodeContractMsg,
  probeSchema, classify, templateFor, esc,
  groupEvents, asArr, toBig, b64ToUtf8, EXEC_LABEL, VOTE_OPT,
};
