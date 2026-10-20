/* ============================================================================
 * Paxi Suite · Swap 辅助器（官方原生 AMM 模块前端）
 * 官方依据：PAXI CLI 指令 §1.16（tx swap swap）、DApp指南 §3.8（MsgSwap 示例）
 *   - 池列表：GET /paxi/swap/all_pools   池详情：GET /paxi/swap/pool/{prc20}
 *   - 消息：MsgSwap {creator, prc20, offerDenom, offerAmount, minReceive}
 *           typeUrl = /x.swap.types.MsgSwap（官方文档原文）
 *   - 卖 PRC-20：需先 increase_allowance 给 Swap 模块（同 Tx 原子打包）
 *   - 卖 PAXI：offerDenom = 'upaxi'，直接兑换
 * 滑点：官方示例固定 50%（形同虚设）；本工具默认 1%，可选 0.1%~50%。
 * 定价口径：minReceive 按官方文档「池子比例 × (1-滑点)」计算；同时展示恒定乘积
 *   (x·y=k) 预估到手与价格影响，供参考。免费工具，仅链上 Gas。
 * ==========================================================================*/

window.TOOL_REGISTRY ||= {};

(function () {
  'use strict';

  /* ---------------------------------------------- i18n（工具内字典，zh/en 对称） */
  const SW_DICT = {
    zh: {
      title: '🔁 Swap 辅助器（官方兑换模块）',
      desc: '用 Paxi 链原生兑换模块换币。本工具先算清「最少到手」再让你签名——替代官方示例里固定 50% 的粗滑点。免费，仅链上 Gas。',
      poolListTitle: '📈 全部兑换池（点击选用）',
      poolLoading: '加载池子列表...',
      poolFail: '兑换池列表加载失败',
      poolEmpty: '暂无兑换池，可直接粘贴 PRC-20 合约地址',
      price: '价格',
      reserve: '池深',
      contractLabel: 'PRC-20 合约地址（兑换池）',
      loadPoolBtn: '🔄 读取该池',
      direction: '兑换方向',
      dirSellToken: '卖出 PRC-20 → 换 PAXI',
      dirSellPaxi: '卖出 PAXI → 换 PRC-20',
      amountLabel: '卖出数量（按显示单位）',
      balanceLabel: '我的余额',
      slippageLabel: '滑点保护（%)',
      quoteTitle: '报价预览',
      qRatio: '参考到手（池子比例价）',
      qCp: '恒定乘积预估（含价格影响）',
      qImpact: '价格影响',
      qMin: '🛡️ 最少到手（低于此数量交易会自动失败，保护你）',
      quoteHint: '先点「刷新报价」再签名；数量或方向改变后报价会过期。',
      refreshQuote: '🔄 刷新报价',
      execBtn: '🔁 签名并兑换',
      confirm: '确认兑换？\n\n· 方向：{0}\n· 卖出：{1}\n· 🛡️ 最少到手：{2}\n· 滑点保护：{3}%\n· 费用：无平台服务费（仅链上 Gas）\n\n卖出 PRC-20 时，授权额度增加会与兑换在同一笔交易内原子执行。',
      queryingTx: '⏳ 签名广播中...',
      success: '✅ 兑换交易已上链！',
      failPrefix: '❌ 失败: ',
      connectFirst: '请先在右上角连接钱包',
      badContract: '请填写合法的 PRC-20 合约地址（paxi1 开头）',
      badAmount: '请填写大于 0 的数量',
      noPool: '该地址没有兑换池（可先用发币工具创建代币，再由流动性提供者建池）',
      needQuote: '请先刷新报价',
      minSlip: '滑点不能超过 50',
      typeUrlHint: '节点未识别该消息类型，请稍后重试或反馈。',
      viewTx: '🧭 用解码器查看这笔交易',
      allowanceAdded: '（已自动附带授权额度增加：{0}，仅本次兑换所需）'
    },
    en: {
      title: '🔁 Swap Helper (native module)',
      desc: 'Swap tokens via the Paxi native swap module. This tool calculates your guaranteed minimum received BEFORE you sign — replacing the official example\'s fixed 50% slippage. Free, on-chain gas only.',
      poolListTitle: '📈 All pools (click to select)',
      poolLoading: 'Loading pools...',
      poolFail: 'Failed to load pools',
      poolEmpty: 'No pools yet — you can paste a PRC-20 contract address directly',
      price: 'Price',
      reserve: 'Reserves',
      contractLabel: 'PRC-20 contract address (pool)',
      loadPoolBtn: '🔄 Load pool',
      direction: 'Direction',
      dirSellToken: 'Sell PRC-20 → PAXI',
      dirSellPaxi: 'Sell PAXI → PRC-20',
      amountLabel: 'Sell amount (display units)',
      balanceLabel: 'My balance',
      slippageLabel: 'Slippage protection (%)',
      quoteTitle: 'Quote preview',
      qRatio: 'Est. received (pool ratio)',
      qCp: 'Constant-product estimate (incl. impact)',
      qImpact: 'Price impact',
      qMin: '🛡️ Minimum received (tx auto-fails below this — your protection)',
      quoteHint: 'Refresh the quote before signing; quotes expire when amount/direction changes.',
      refreshQuote: '🔄 Refresh quote',
      execBtn: '🔁 Sign & Swap',
      confirm: 'Confirm swap?\n\n· Direction: {0}\n· Sell: {1}\n· 🛡️ Minimum received: {2}\n· Slippage: {3}%\n· Fee: none (on-chain gas only)\n\nWhen selling PRC-20, the allowance increase is bundled atomically in the same tx.',
      queryingTx: '⏳ Signing & broadcasting...',
      success: '✅ Swap tx confirmed on-chain!',
      failPrefix: '❌ Failed: ',
      connectFirst: 'Please connect your wallet first (top-right)',
      badContract: 'Please enter a valid PRC-20 contract address (paxi1...)',
      badAmount: 'Please enter an amount greater than 0',
      noPool: 'No pool for this address (create a token first, then a liquidity provider must open the pool)',
      needQuote: 'Refresh the quote first',
      minSlip: 'Slippage cannot exceed 50',
      typeUrlHint: 'Node did not recognize the message type. Please retry later or report it.',
      viewTx: '🧭 Inspect this tx in the Decoder',
      allowanceAdded: '(allowance increase auto-bundled: {0} — only what this swap needs)'
    }
  };
  const swPt = (k, ...a) => {
    const lang = (typeof currentLang !== 'undefined' && currentLang) || 'zh';
    let s = (SW_DICT[lang] && SW_DICT[lang][k]) || SW_DICT.zh[k] || k;
    a.forEach((v, i) => { s = s.split('{' + i + '}').join(String(v)); });
    return s;
  };

  const esc = (s) => (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);
  const LCD = () => (typeof getLCD === 'function' ? getLCD() : 'https://mainnet-lcd.paxinet.io');
  const DENOM = 'upaxi';
  const ADDR_RE = /^paxi1[0-9a-z]{38}$/;

  /* 官方 Swap 模块地址（PAXI CLI 指令 §1.13） */
  const SWAP_MODULE = 'paxi1mfru9azs5nua2wxcd4sq64g5nt7nn4n80r745t';
  /* 官方 typeUrl（DApp指南 §3.8 原文）；备用：早期推测的 paxi.swap.v1 命名 */
  const SWAP_TYPE_URLS = ['/x.swap.types.MsgSwap', '/paxi.swap.v1.MsgSwap'];

  let pool = null;        // {prc20, reservePaxi(BigInt), reservePrc20(BigInt), decimals, symbol}
  let quote = null;       // {rawIn, out(BigInt), cpOut(BigInt), impact, minReceive(BigInt), dir, slip}
  let typeUrl = SWAP_TYPE_URLS[0];

  const b64q = (o) => btoa(JSON.stringify(o));
  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  /* ---------- BigInt 工具 ---------- */
  function fmtPaxi(rawUpaxi) {
    const neg = String(rawUpaxi).startsWith('-');
    const s = String(rawUpaxi).replace('-', '');
    const p = s.length > 6 ? [s.slice(0, s.length - 6), s.slice(s.length - 6)] : ['0', s.padStart(6, '0')];
    return (neg ? '-' : '') + p[0] + '.' + p[1].replace(/0+$/, '').replace(/\.$/, '');
  }
  function fmtToken(raw, decimals) {
    try {
      if (window.PaxiDecoder && window.PaxiDecoder.formatUnits) return window.PaxiDecoder.formatUnits(String(raw), '', decimals);
    } catch (_) {}
    const s = String(raw);
    const p = s.length > decimals ? [s.slice(0, s.length - decimals), s.slice(s.length - decimals)] : ['0', s.padStart(decimals, '0')];
    return p[0] + '.' + p[1].replace(/0+$/, '').replace(/\.$/, '');
  }
  function toRawUnits(input, decimals) {
    if (typeof parseFloatToRawUnits === 'function') return parseFloatToRawUnits(String(input).trim(), decimals) || '';
    return '';
  }

  /* ---------- MsgSwap 编码：官方类优先，手写 proto 兜底 ----------
   * 字段号已从官方 paxi-cosmjs.umd.js 生成代码确认（全 string）：
   * 1=creator, 2=prc20, 3=offerDenom, 4=offerAmount, 5=minReceive */
  function encodeSwapMsgRaw(m) {
    const enc = new TextEncoder();
    const parts = [];
    const varint = (n) => { const out = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; out.push(b); } while (n); return new Uint8Array(out); };
    const field = (num, str) => {
      if (!str) return;
      const v = enc.encode(String(str));
      parts.push(varint((num << 3) | 2), varint(v.length), v);
    };
    field(1, m.creator); field(2, m.prc20); field(3, m.offerDenom); field(4, m.offerAmount); field(5, m.minReceive);
    const total = parts.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }
  function swapAny(m) {
    let value;
    if (typeof PaxiCosmJS.MsgSwap !== 'undefined' && PaxiCosmJS.MsgSwap && PaxiCosmJS.MsgSwap.encode) {
      value = PaxiCosmJS.MsgSwap.encode(PaxiCosmJS.MsgSwap.fromPartial(m)).finish();
    } else {
      value = encodeSwapMsgRaw(m);
    }
    return PaxiCosmJS.Any.fromPartial({ typeUrl, value });
  }

  /* ---------- 池子 ---------- */
  function parsePool(obj, fallbackContract) {
    if (!obj) return null;
    const prc20 = obj.prc20 || obj.prc20_address || obj.contract || fallbackContract || '';
    const rp = obj.reserve_paxi, rc = obj.reserve_prc20;
    if (!prc20 || rp === undefined || rc === undefined) return null;
    const reservePaxi = BigInt(String(rp)), reservePrc20 = BigInt(String(rc));
    if (reservePaxi <= 0n || reservePrc20 <= 0n) return null;
    return { prc20, reservePaxi, reservePrc20 };
  }

  async function loadAllPools() {
    const box = document.getElementById('swPools');
    box.innerHTML = `<div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:10px">${esc(swPt('poolLoading'))}</div>`;
    try {
      const data = await fetchJSON(`${LCD()}/paxi/swap/all_pools`);
      const arr = Array.isArray(data) ? data : (data.pools || data.data || []);
      const pools = arr.map(p => parsePool(p)).filter(Boolean).slice(0, 24);
      if (!pools.length) { box.innerHTML = `<div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:10px">${esc(swPt('poolEmpty'))}</div>`; return; }
      box.innerHTML = `<div style="font-size:.72rem;letter-spacing:.05em;color:var(--text-muted);margin-bottom:8px">${esc(swPt('poolListTitle'))}</div>` + pools.map((p, i) => `
        <div data-pool="${i}" style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
          <div><span class="mono" style="font-size:.75rem">${esc(p.prc20.slice(0, 16))}…${esc(p.prc20.slice(-6))}</span></div>
          <div style="font-weight:700;white-space:nowrap">${esc(fmtPaxi(p.reservePaxi))} PAXI</div>
        </div>`).join('');
      window.__swPoolCache = pools;
      box.querySelectorAll('[data-pool]').forEach(el => {
        el.addEventListener('click', () => {
          const p = window.__swPoolCache[Number(el.dataset.pool)];
          document.getElementById('swContract').value = p.prc20;
          loadPool();
        });
      });
    } catch (e) {
      box.innerHTML = `<div style="font-size:.82rem;color:var(--danger);line-height:1.6;margin-bottom:10px">${esc(swPt('poolFail'))}: ${esc(e.message || e)}</div>`;
    }
  }

  async function loadPool() {
    const contract = (document.getElementById('swContract').value || '').trim().toLowerCase();
    const out = document.getElementById('swQuote');
    if (!ADDR_RE.test(contract)) { showStatus('swStatus', swPt('badContract'), 'warning'); return; }
    out.innerHTML = '';
    pool = null; quote = null;
    try {
      const data = await fetchJSON(`${LCD()}/paxi/swap/pool/${contract}`);
      const p = parsePool(data, contract);
      if (!p) { showStatus('swStatus', swPt('noPool'), 'warning'); return; }
      pool = p;
      /* 读代币精度/符号（失败则按 6 位兜底） */
      let decimals = 6, symbol = '';
      try {
        const ti = await fetchJSON(`${LCD()}/cosmwasm/wasm/v1/contract/${contract}/smart/${b64q({ token_info: {} })}`);
        decimals = Number(ti.data && ti.data.decimals) || 6;
        symbol = (ti.data && ti.data.symbol) || '';
      } catch (_) {}
      pool.decimals = decimals; pool.symbol = symbol;
      renderPoolInfo();
      showStatus('swStatus', '', 'info');
    } catch (e) {
      showStatus('swStatus', swPt('failPrefix') + (e.message || e), 'error');
    }
  }

  function renderPoolInfo() {
    const pricePaxiPerToken = Number(pool.reservePaxi * 1000000n / pool.reservePrc20) / 1e6;
    document.getElementById('swPoolInfo').innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem"><span>${esc(swPt('price'))}</span><b>1 ${esc(pool.symbol || 'TOKEN')} ≈ ${esc(pricePaxiPerToken.toPrecision(6))} PAXI</b></div>
      <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem"><span>${esc(swPt('reserve'))}</span><b>${esc(fmtPaxi(pool.reservePaxi))} PAXI ｜ ${esc(fmtToken(pool.reservePrc20, pool.decimals))} ${esc(pool.symbol || '')}</b></div>`;
  }

  /* ---------- 报价（官方比例价 + 恒定乘积参考） ---------- */
  function calcQuote() {
    if (!pool) return null;
    const dir = document.getElementById('swDir').value; // 'token' | 'paxi'
    const decimals = dir === 'token' ? pool.decimals : 6;
    const input = (document.getElementById('swAmount').value || '').trim();
    const rawIn = toRawUnits(input, decimals);
    if (!rawIn || rawIn === '0') return null;
    let slip = parseFloat(document.getElementById('swSlip').value);
    if (!isFinite(slip) || slip < 0) slip = 1;
    if (slip > 50) slip = 50;

    const inBig = BigInt(rawIn);
    let out, cpOut;
    if (dir === 'token') {         // 卖 PRC-20 → 得 PAXI
      out = inBig * pool.reservePaxi / pool.reservePrc20;      // 比例价（官方口径）
      cpOut = pool.reservePaxi * inBig / (pool.reservePrc20 + inBig); // 恒定乘积
    } else {                        // 卖 PAXI → 得 PRC-20
      out = inBig * pool.reservePrc20 / pool.reservePaxi;
      cpOut = pool.reservePrc20 * inBig / (pool.reservePaxi + inBig);
    }
    const minReceive = out * BigInt(Math.round((100 - slip) * 10)) / 1000n; // out×(1-slip%)，逐级 BigInt
    const impact = out > 0n ? Number((1n * 10000n - (cpOut * 10000n / out))) / 100 : 0;
    return { rawIn, inBig, out, cpOut, minReceive: minReceive < 0n ? 0n : minReceive, dir, slip, impact };
  }

  function refreshQuote() {
    const out = document.getElementById('swQuote');
    if (!pool) { showStatus('swStatus', swPt('noPool'), 'warning'); return; }
    quote = calcQuote();
    if (!quote) { showStatus('swStatus', swPt('badAmount'), 'warning'); out.innerHTML = ''; return; }
    const dirTok = quote.dir === 'token';
    const inShow = dirTok ? fmtToken(quote.rawIn, pool.decimals) + ' ' + (pool.symbol || '') : fmtPaxi(quote.rawIn) + ' PAXI';
    const outShow = dirTok ? fmtPaxi(quote.out) + ' PAXI' : fmtToken(quote.out, pool.decimals) + ' ' + (pool.symbol || '');
    const cpShow = dirTok ? fmtPaxi(quote.cpOut) + ' PAXI' : fmtToken(quote.cpOut, pool.decimals) + ' ' + (pool.symbol || '');
    const minShow = dirTok ? fmtPaxi(quote.minReceive) + ' PAXI' : fmtToken(quote.minReceive, pool.decimals) + ' ' + (pool.symbol || '');
    out.innerHTML = `
      <div class="card" style="margin-top:10px">
        <div style="font-size:.72rem;letter-spacing:.05em;color:var(--text-muted);margin-bottom:8px">${esc(swPt('quoteTitle'))}</div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem"><span>${esc(swPt('qRatio'))}</span><b>${esc(outShow)}</b></div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem"><span>${esc(swPt('qCp'))}</span><b>${esc(cpShow)}</b></div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem"><span>${esc(swPt('qImpact'))}</span><b style="color:${quote.impact > 5 ? 'var(--danger)' : 'inherit'}">${esc(quote.impact.toFixed(2))}%</b></div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.88rem;border-top:1px solid var(--border);margin-top:6px;padding-top:10px"><span>${esc(swPt('qMin'))}</span><b style="color:var(--success)">${esc(minShow)}</b></div>
      </div>
      <div style="font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-top:6px">${esc(swPt('quoteHint'))}</div>`;
    showStatus('swStatus', '', 'info');
  }

  /* ---------- 执行 ---------- */
  async function doSwap() {
    if (typeof state === 'undefined' || !state.connected) { showToast(swPt('connectFirst'), 'error'); return; }
    if (!pool) { showStatus('swStatus', swPt('noPool'), 'warning'); return; }
    quote = calcQuote();
    if (!quote) { showStatus('swStatus', swPt('badAmount'), 'warning'); return; }
    const dirTok = quote.dir === 'token';
    const inShow = dirTok ? fmtToken(quote.rawIn, pool.decimals) + ' ' + (pool.symbol || '') : fmtPaxi(quote.rawIn) + ' PAXI';
    const minShow = dirTok ? fmtPaxi(quote.minReceive) + ' PAXI' : fmtToken(quote.minReceive, pool.decimals) + ' ' + (pool.symbol || '');
    const dirLabel = dirTok ? swPt('dirSellToken') : swPt('dirSellPaxi');
    if (quote.minReceive <= 0n) { showStatus('swStatus', swPt('needQuote'), 'warning'); return; }

    if (!confirm(swPt('confirm', dirLabel, inShow, minShow, String(quote.slip)))) return;

    const btn = document.getElementById('swExec');
    btn.disabled = true;
    showStatus('swStatus', swPt('queryingTx'), 'info');
    try {
      const sender = state.wallet.address;
      const swapMsg = {
        creator: sender,
        prc20: pool.prc20,
        offerDenom: dirTok ? pool.prc20 : DENOM,
        offerAmount: String(quote.rawIn),
        minReceive: String(quote.minReceive),
      };
      const msgs = [];
      if (dirTok) {
        /* 官方要求：卖 PRC-20 前需 increase_allowance 给 Swap 模块（同 Tx 原子执行） */
        const allow = PaxiCosmJS.MsgExecuteContract.fromPartial({
          sender,
          contract: pool.prc20,
          msg: new TextEncoder().encode(JSON.stringify({ increase_allowance: { spender: SWAP_MODULE, amount: String(quote.rawIn) } })),
          funds: [],
        });
        msgs.push(PaxiCosmJS.Any.fromPartial({
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: PaxiCosmJS.MsgExecuteContract.encode(allow).finish(),
        }));
      }
      msgs.push(swapAny(swapMsg));

      const res = await buildSignAndBroadcast(msgs, 'Paxi Suite Swap ' + inShow, null, state.wallet);
      const r = checkTxResult(res);
      if (!r.ok) throw new Error(mapError(r.code, r.rawLog));
      const final = (typeof pollTxStatus === 'function') ? await pollTxStatus(r.txhash) : null;
      if (final && final.confirmed && !final.success) throw new Error(mapError(final.code, final.rawLog));

      showStatus('swStatus', `${swPt('success')} TxHash: ${r.txhash.slice(0, 20)}…`, 'success');
      showToast(swPt('success'), 'success');
      const out = document.getElementById('swQuote');
      if (out) out.insertAdjacentHTML('beforeend',
        `<div style="margin-top:8px"><a href="${location.pathname}?tool=decoder&hash=${esc(r.txhash)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:12px">${esc(swPt('viewTx'))}</a></div>`);
      if (typeof refreshBalance === 'function') refreshBalance();
    } catch (e) {
      const msg = String(e.message || e);
      const hint = /resolve|type ?url|unknown message|unrecognized/i.test(msg) ? ' ' + swPt('typeUrlHint') : '';
      showStatus('swStatus', swPt('failPrefix') + msg + hint, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- 渲染 ---------- */
  function render() {
    return `
    <div id="pg-swap">
      <div class="card">
        <div class="card-title">${esc(swPt('title'))}</div>
        <div class="tool-desc">${esc(swPt('desc'))}</div>
        <div id="swPools"></div>

        <div class="form-group" style="margin-top:12px">
          <label class="form-label">${esc(swPt('contractLabel'))}</label>
          <input type="text" id="swContract" placeholder="paxi1..." class="mono">
          <button class="btn btn-outline btn-block" id="swLoadPool" style="margin-top:8px">${esc(swPt('loadPoolBtn'))}</button>
        </div>

        <div id="swPoolInfo"></div>

        <div class="form-group">
          <label class="form-label">${esc(swPt('direction'))}</label>
          <select id="swDir">
            <option value="token">${esc(swPt('dirSellToken'))}</option>
            <option value="paxi">${esc(swPt('dirSellPaxi'))}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${esc(swPt('amountLabel'))}</label>
          <input type="text" id="swAmount" placeholder="100">
        </div>
        <div class="form-group">
          <label class="form-label">${esc(swPt('slippageLabel'))}</label>
          <select id="swSlip">
            <option value="0.1">0.1%</option>
            <option value="0.5">0.5%</option>
            <option value="1" selected>1%</option>
            <option value="3">3%</option>
            <option value="5">5%</option>
            <option value="10">10%</option>
          </select>
        </div>

        <button class="btn btn-outline btn-block" id="swQuoteBtn">${esc(swPt('refreshQuote'))}</button>
        <div class="status-msg" id="swStatus"></div>
        <div id="swQuote"></div>

        <button class="btn btn-primary btn-block" id="swExec" style="margin-top:12px">${esc(swPt('execBtn'))}</button>
      </div>
    </div>`;
  }

  window.TOOL_REGISTRY['swap'] = {
    render,
    async onMount() { await loadAllPools(); },
    bind() {
      document.getElementById('swLoadPool').addEventListener('click', loadPool);
      document.getElementById('swQuoteBtn').addEventListener('click', refreshQuote);
      document.getElementById('swExec').addEventListener('click', doSwap);
      document.getElementById('swContract').addEventListener('keydown', e => { if (e.key === 'Enter') loadPool(); });
      document.getElementById('swAmount').addEventListener('keydown', e => { if (e.key === 'Enter') refreshQuote(); });
    },
  };
})();
