/**
 * 工具模块：治理提案 (Governance Proposal)
 * 支持三类提案：
 *  - 文本提案 (TextProposal)
 *  - 参数修改提案 (ParameterChangeProposal) — 可添加多条 subspace/key/value
 *  - 社区池拨款提案 (CommunityPoolSpendProposal) — DAO 资助申请，从社区池拨款给收款地址
 * 服务费：SHARED_CONFIG.governance.submitFee（默认 50 PAXI）
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const GOV_TYPE_URL = {
  text: '/cosmos.gov.v1beta1.TextProposal',
  param: '/cosmos.params.v1beta1.ParameterChangeProposal',
  pool: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
};
// v1 方式提交社区池拨款（与链上已通过的 #13 资助提案同构）
const GOV_V1_TYPE_URL = {
  poolMsg: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
  submitV1: '/cosmos.gov.v1.MsgSubmitProposal',
};
// gov module account（MsgCommunityPoolSpend 的 authority 必须是它）
const GOV_MODULE_ACCOUNT = 'paxi10d07y265gmmuvt4z0w9aw880jnsr700je7h2vr';
const GOV_STATUS = {
  0: { label: '未知', cls: 'warning' },
  1: { label: '押金中', cls: 'info' },
  2: { label: '投票中', cls: 'primary' },
  3: { label: '已通过', cls: 'success' },
  4: { label: '已拒绝', cls: 'danger' },
  5: { label: '押金失败退还', cls: 'warning' },
};
// 常用参考参数（仅展示给用户参考，不强制）
const GOV_PARAM_PRESETS = [
  { s: 'staking',     k: 'UnbondingTime',     v: '"1814400000000000"' },
  { s: 'staking',     k: 'MaxValidators',     v: '100' },
  { s: 'staking',     k: 'MinDelegation',     v: '"1000000"' },
  { s: 'mint',        k: 'InflationRateChange', v: '"0.130000000000000000"' },
  { s: 'slashing',    k: 'MaxEvidenceAge',    v: '"1209600000000000"' },
  { s: 'gov',         k: 'DepositPeriod',     v: '"1209600000000000"' },
  { s: 'gov',         k: 'VotingPeriod',      v: '"1209600000000000"' },
];

function _t(k, fallback) { if (typeof t === 'function') { const v = t(k); return v && v !== k ? v : fallback; } return fallback; }

// ===== bech32 地址校验（paxi1 前缀，账户 43 字符 / 合约 63 字符，含 checksum 验证）=====
const _PROP_BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const _PROP_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function _isValidPaxiAddress(a) {
  if (typeof a !== 'string') return false;
  const s = a.trim();
  const m = /^paxi1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}|[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})$/.exec(s);
  if (!m) return false;
  const hrp = [];
  for (const c of 'paxi') hrp.push(c.charCodeAt(0) >> 5);
  hrp.push(0);
  for (const c of 'paxi') hrp.push(c.charCodeAt(0) & 31);
  const data = [];
  for (const c of m[1]) data.push(_PROP_BECH32.indexOf(c));
  let chk = 1;
  for (const v of hrp.concat(data)) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= _PROP_GEN[i];
  }
  return chk === 1;
}

// 构造 gov v1 MsgSubmitProposal{messages:[MsgCommunityPoolSpend]}（与链上已通过的 #13 资助提案同构）
// 返回 Any（可放入 tx messages）
function _buildPoolSpendProposalAny({ title, summary, recipient, amountMicro, depositMicro, proposer, denom }) {
  const spendMsg = PaxiCosmJS.Any.fromPartial({
    typeUrl: GOV_V1_TYPE_URL.poolMsg,
    value: PaxiCosmJS.MsgCommunityPoolSpend.encode({
      authority: GOV_MODULE_ACCOUNT,
      recipient,
      amount: [{ denom, amount: amountMicro }],
    }).finish(),
  });
  const submitValueBytes = PaxiCosmJS.MsgSubmitProposalV1.encode({
    messages: [spendMsg],
    initial_deposit: [{ denom, amount: depositMicro }],
    proposer,
    metadata: '',
    title,
    summary: (summary || '').length > 2000 ? summary.slice(0, 2000) : (summary || ''),
    expedited: false,
  }).finish();
  return PaxiCosmJS.Any.fromPartial({
    typeUrl: GOV_V1_TYPE_URL.submitV1,
    value: submitValueBytes,
  });
}

function govConfig() {
  return (typeof SHARED_CONFIG !== 'undefined' && SHARED_CONFIG.governance) || { submitFee: 50, defaultDeposit: 100 };
}

// ===== DAO 提案白名单 =====
// 仅白名单钱包地址连接后可看到 / 使用「DAO 资助申请（社区池拨款）」功能
function daoWhitelist() {
  const cfg = govConfig();
  return Array.isArray(cfg.daoProposerWhitelist) ? cfg.daoProposerWhitelist : [];
}

// 当前连接的钱包是否在 DAO 白名单内
function isDaoProposerAllowed() {
  if (typeof state === 'undefined' || !state.connected || !state.wallet || !state.wallet.address) return false;
  return daoWhitelist().includes(state.wallet.address);
}

function renderProposal() {
  const cfg = govConfig();
  const typeSelect = `
    <select id="proposalType" onchange="toggleProposalType(this.value)">
      <option value="text">${_t('proposal.typeText','文本提案')}</option>
      <option value="param">${_t('proposal.typeParam','参数修改提案')}</option>
    </select>`;
  const paramSubL = _t('proposal.paramSubspace','参数模块 (subspace)');
  const paramKL  = _t('proposal.paramKey','参数名 (key)');
  const paramVL  = _t('proposal.paramValue','参数值 (value, JSON字符串)');
  const paramPH  = _t('proposal.paramValuePH','例如：\\"0.050000000000000000\\"');
  const addBtn   = _t('proposal.addParam','➕ 添加参数');
  const delBtn   = _t('proposal.delParam','删除');
  const hint     = _t('proposal.paramHint','提示：subspace 如 gov / bank / staking / mint / slashing / distribution；value 为 JSON 字符串。');
  const refTitle = _t('proposal.paramRefTitle','📖 常用参数 & 参考示例');
  const blockTitle = _t('proposal.paramBlockTitle','🔧 参数修改配置 (ParameterChangeProposal)');

  // 构造预置参考列表
  const refs = GOV_PARAM_PRESETS.map(p => `<div style="padding:4px 10px;border-left:2px solid var(--primary);background:var(--bg);border-radius:4px;font-size:11px;color:var(--text-muted);margin-bottom:4px;font-family:var(--font-mono, monospace);">${p.s} / ${p.k} = ${p.v}</div>`).join('');

  // 默认 1 条空参数
  const defaultRows = 1;
  let rowsHtml = '';
  for (let i = 0; i < defaultRows; i++) rowsHtml += paramRowHtml(i, '', '', '', paramSubL, paramKL, paramVL, paramPH, delBtn);

  return `
    <div class="card">
      <div class="card-title">${_t('proposal.title','治理提案')}</div>
      <div class="tool-desc" style="margin-bottom:14px;">${_t('proposal.desc','提交 Paxi 网络治理提案，参与社区决策。提案需要支付押金，并支付平台服务费。')}</div>

      <div class="card" style="background:var(--bg);padding:16px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;font-weight:700;font-size:15px;">
          📝 ${_t('proposal.submit','提交提案')}
        </div>

        <div class="form-group">
          <label class="form-label">${_t('proposal.type','提案类型')}</label>
          ${typeSelect}
        </div>

        <div class="form-group">
          <label class="form-label">${_t('proposal.titleLabel','提案标题')}</label>
          <input type="text" id="proposalTitle" placeholder="${_t('proposal.titlePlaceholder','例如：建议降低交易服务费')}">
        </div>

        <div class="form-group">
          <label class="form-label">${_t('proposal.descLabel','提案描述')}</label>
          <textarea id="proposalDesc" rows="4" placeholder="${_t('proposal.descPlaceholder','详细描述你的提案...')}"></textarea>
        </div>

        <!-- 参数修改专属区域（默认隐藏） -->
        <div id="proposalParamBlock" style="display:none;margin-bottom:14px;">
          <div style="padding:12px 14px;background:rgba(88,101,242,.08);border:1px dashed var(--primary);border-radius:var(--radius);">
            <div style="font-weight:700;font-size:13px;margin-bottom:10px;">${blockTitle}</div>

            <div id="proposalParamRows">${rowsHtml}</div>

            <button type="button" class="btn btn-ghost" style="width:100%;margin:8px 0 10px;" onclick="addProposalParamRow()">${addBtn}</button>

            <div style="font-size:11px;color:var(--text-muted);padding:8px 10px;background:var(--bg-card);border-radius:6px;">${hint}</div>

            <div style="margin-top:12px;">
              <div style="font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted);">${refTitle}</div>
              ${refs}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${_t('proposal.deposit','押金 (PAXI)')}</label>
          <input type="number" id="proposalDeposit" value="${cfg.defaultDeposit}" min="0" step="0.01">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
          <span style="font-size:13px;color:var(--text-muted);">${_t('proposal.fee','服务费 (PAXI)')}</span>
          <span style="color:var(--primary);font-weight:700;font-size:15px;">${cfg.submitFee} PAXI</span>
        </div>

        <div style="margin:0 0 12px;padding:8px 12px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;font-size:12px;color:#ffd700;line-height:1.6;">
          ${t('disclaimer.proposalSubmit')}
        </div>

        <button class="btn btn-primary" id="proposalSubmitBtn" style="width:100%;font-weight:700;font-size:14px;min-height:42px;" onclick="submitProposal()">
          🚀 ${_t('proposal.submitBtn','提交提案')}
        </button>
        <div class="status-msg" id="proposalStatus" style="margin-top:10px;"></div>
      </div>
    </div>

    <div id="daoProposalSlot">${renderDaoProposalCard()}</div>

    <div class="card">
      <div class="card-title">${_t('proposal.list','提案列表')}</div>
      <div style="margin:0 0 12px;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:6px;font-size:11px;color:var(--text-muted);line-height:1.6;">
        ${t('disclaimer.proposalList')}
      </div>
      <div id="proposalList"><p style="color:var(--text-muted);text-align:center;padding:20px;">${_t('proposal.listLoading','加载中...')}</p></div>
    </div>
  `;
}

// ===== DAO 资助申请卡片（仅白名单钱包地址可见）=====
function renderDaoProposalCard() {
  // 未连接钱包：不显示该功能
  if (typeof state === 'undefined' || !state.connected || !state.wallet || !state.wallet.address) return '';
  // 已连接但不在白名单：不显示该功能
  if (!isDaoProposerAllowed()) return '';

  const cfg = govConfig();
  return `
    <div class="card" id="daoProposalCard">
      <div class="card-title">${_t('proposal.daoTitle','🏦 DAO 资助申请')}</div>
      <div class="tool-desc" style="margin-bottom:12px;">${_t('proposal.daoDesc','向社区池申请资助（CommunityPoolSpend）。提案通过后，社区池将向指定收款地址划拨拨款。')}</div>
      <div class="info-box" style="margin-bottom:12px;">${_t('proposal.daoInfo','💡 标题与摘要会公示给全体持币人投票。请写明用途、金额构成、里程碑与交付时间；收款地址建议使用项目运营金库地址。')}</div>

      <div class="form-group">
        <label class="form-label">${_t('proposal.daoLabelTitle','提案标题')}</label>
        <input type="text" id="daoPropTitle" placeholder="${_t('proposal.daoTitlePlaceholder','例如：Paxi 棋阁上线与三个月运维资助 (150,000 PAXI)')}">
      </div>

      <div class="form-group">
        <label class="form-label">${_t('proposal.daoLabelSummary','提案摘要 (summary)')}</label>
        <textarea id="daoPropSummary" rows="3" placeholder="${_t('proposal.daoSummaryPlaceholder','一句话概括申请内容与金额…')}"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">${_t('proposal.daoLabelDesc','提案详情 (description)')}</label>
        <textarea id="daoPropDesc" rows="5" placeholder="${_t('proposal.daoDescPlaceholder','详细说明用途、预算构成、里程碑与交付时间…')}"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">${_t('proposal.poolRecipient','收款地址 (recipient)')}</label>
        <input type="text" id="daoPropRecipient" placeholder="paxi1...">
      </div>

      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">${_t('proposal.poolAmount','拨款金额 (PAXI)')}</label>
        <input type="number" id="daoPropAmount" min="0" step="0.01" placeholder="150000">
      </div>

      <div style="font-size:11px;color:var(--text-muted);padding:8px 10px;background:var(--bg-card);border-radius:6px;margin-bottom:12px;" id="daoPropBalance">
        ${_t('proposal.poolBalanceLoading','正在查询链上社区池余额...')}
      </div>

      <div class="form-group">
        <label class="form-label">${_t('proposal.deposit','押金 (PAXI)')}</label>
        <input type="number" id="daoPropDeposit" value="${cfg.defaultDeposit}" min="0" step="0.01">
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
        <span style="font-size:13px;color:var(--text-muted);">${_t('proposal.fee','服务费 (PAXI)')}</span>
        <span style="color:var(--primary);font-weight:700;font-size:15px;">${cfg.submitFee} PAXI</span>
      </div>

      <div style="margin:0 0 12px;padding:8px 12px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;font-size:12px;color:#ffd700;line-height:1.6;">
        ${t('disclaimer.proposalSubmit')}
      </div>

      <button class="btn btn-chain" id="daoPropSubmitBtn" style="width:100%;font-weight:700;font-size:14px;min-height:42px;">
        🏦 ${_t('proposal.daoSubmitBtn','提交 DAO 资助申请')}
      </button>
      <div class="status-msg" id="daoPropStatus" style="margin-top:10px;"></div>
    </div>
  `;
}

function paramRowHtml(idx, sub, key, val, subL, keyL, valL, ph, delBtn) {
  return `
    <div class="param-row" data-idx="${idx}" style="margin-bottom:10px;padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <div>
          <label style="font-size:11px;color:var(--text-muted);font-weight:600;">${subL}</label>
          <input type="text" class="param-sub" value="${escapeAttr(sub)}" placeholder="staking">
        </div>
        <div>
          <label style="font-size:11px;color:var(--text-muted);font-weight:600;">${keyL}</label>
          <input type="text" class="param-key" value="${escapeAttr(key)}" placeholder="MinDelegation">
        </div>
      </div>
      <div>
        <label style="font-size:11px;color:var(--text-muted);font-weight:600;">${valL}</label>
        <input type="text" class="param-val" value="${escapeAttr(val)}" placeholder="${ph}">
      </div>
      <div style="text-align:right;margin-top:6px;">
        <button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:var(--danger);" onclick="removeProposalParamRow(this)">✕ ${delBtn}</button>
      </div>
    </div>
  `;
}
function escapeAttr(s) { if (s == null) return ''; return String(s).replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toggleProposalType(val) {
  const box = document.getElementById('proposalParamBlock');
  if (box) box.style.display = (val === 'param') ? 'block' : 'none';
}

// 查询链上社区池余额（只读，无费用）
// ===== DecCoin 换算 =====
// 社区池 community_pool 返回 DecCoin：amount 是 18 位小数的十进制字符串（单位=upaxi）
// 例如 "5138152097007.919489561159935055" → 5138152097007 upaxi = 5138152.097007 PAXI
// 注意：不能直接用 upaxiToPaxi（它只接受纯整数字符串，会因小数点而错位）
function _decCoinToPaxi(amountStr) {
  if (amountStr == null) return '0';
  const s = String(amountStr).trim();
  const dot = s.indexOf('.');
  const intPart = dot >= 0 ? s.slice(0, dot) : s;
  if (!/^\d+$/.test(intPart)) return '0';
  return typeof upaxiToPaxi === 'function' ? upaxiToPaxi(intPart) : (parseInt(intPart, 10) / 1e6).toFixed(6);
}

async function loadCommunityPoolBalance(elId) {
  const el = document.getElementById(elId || 'proposalPoolBalance');
  if (!el) return;
  try {
    const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
    const res = await fetch(`${lcd}/cosmos/distribution/v1beta1/community_pool`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pool = (data.pool || []).find(c => c.denom === (CONFIG.denom || 'upaxi')) || (data.pool || [])[0];
    if (!pool) {
      el.innerHTML = _t('proposal.poolBalanceEmpty','社区池当前无余额');
      return;
    }
    const paxi = _decCoinToPaxi(pool.amount);
    el.innerHTML = _t('proposal.poolBalance','💰 链上社区池余额：') +
      `<strong style="color:#0ea5e9;">${paxi} PAXI</strong>`;
  } catch (e) {
    el.innerHTML = _t('proposal.poolBalanceFail','社区池余额查询失败') + '：' + escapeHtmlSafe(e.message || String(e));
  }
}

function addProposalParamRow() {
  const rowsBox = document.getElementById('proposalParamRows');
  if (!rowsBox) return;
  const subL = _t('proposal.paramSubspace','参数模块 (subspace)');
  const keyL = _t('proposal.paramKey','参数名 (key)');
  const valL = _t('proposal.paramValue','参数值 (value, JSON字符串)');
  const ph   = _t('proposal.paramValuePH','例如：\\"0.050000000000000000\\"');
  const del  = _t('proposal.delParam','删除');
  const idx = rowsBox.querySelectorAll('.param-row').length;
  const el = document.createElement('div');
  el.innerHTML = paramRowHtml(idx, '', '', '', subL, keyL, valL, ph, del);
  rowsBox.appendChild(el.firstElementChild);
}

function removeProposalParamRow(btn) {
  const rowsBox = document.getElementById('proposalParamRows');
  if (!rowsBox) return;
  const row = btn && btn.closest ? btn.closest('.param-row') : null;
  if (!row) return;
  if (rowsBox.querySelectorAll('.param-row').length <= 1) {
    // 至少保留一行，清空值
    row.querySelectorAll('input').forEach(i => i.value = '');
    return;
  }
  row.remove();
}

// ===== DAO 资助申请（社区池拨款）=====
// 独立于普通治理提案：仅白名单钱包地址可见/可用

// 绑定 DAO 卡片内部事件
function bindDaoProposalEvents() {
  const btn = document.getElementById('daoPropSubmitBtn');
  if (btn && !btn._daoBound) {
    btn._daoBound = true;
    btn.addEventListener('click', submitDaoProposal);
  }
  const balEl = document.getElementById('daoPropBalance');
  if (balEl && !balEl._balanceLoaded) {
    balEl._balanceLoaded = true;
    loadCommunityPoolBalance('daoPropBalance');
  }
}

// 钱包连接/断开后刷新 DAO 卡片显隐（返回 true 表示发生了 DOM 变化）
function refreshDaoProposalSlot() {
  const slot = document.getElementById('daoProposalSlot');
  if (!slot) return false;
  const allowed = isDaoProposerAllowed();
  const has = !!slot.querySelector('#daoProposalCard');
  if (allowed === has) return false;
  slot.innerHTML = renderDaoProposalCard();
  if (allowed) bindDaoProposalEvents();
  return true;
}

// 提交 DAO 资助申请（社区池拨款）
async function submitDaoProposal() {
  // 白名单二次校验（前端显隐只是第一道门，这里是提交前的强校验）
  if (!isDaoProposerAllowed()) {
    showStatus('daoPropStatus', _t('proposal.daoNotAllowed','当前钱包地址无 DAO 资助申请权限'), 'error');
    return;
  }
  if (typeof state === 'undefined' || !state.connected || !state.wallet || !state.wallet.address) {
    showStatus('daoPropStatus', _t('proposal.connectFirst','请先连接钱包'), 'warning');
    return;
  }

  const titleEl = document.getElementById('daoPropTitle');
  const sumEl   = document.getElementById('daoPropSummary');
  const descEl  = document.getElementById('daoPropDesc');
  const rcvEl   = document.getElementById('daoPropRecipient');
  const amtEl   = document.getElementById('daoPropAmount');
  const depEl   = document.getElementById('daoPropDeposit');
  const btn     = document.getElementById('daoPropSubmitBtn');
  if (!titleEl || !sumEl || !descEl || !rcvEl || !amtEl || !depEl) return;

  const title = titleEl.value.trim();
  const summary = sumEl.value.trim();
  const desc = descEl.value.trim();
  const recipient = rcvEl.value.trim();
  const amount = parseFloat(amtEl.value) || 0;
  const depositNum = parseFloat(depEl.value) || 0;
  const cfg = govConfig();
  const feeNum = Number(cfg.submitFee) || 0;

  if (!title) {
    showStatus('daoPropStatus', _t('proposal.daoNoTitle','请填写提案标题'), 'warning');
    return;
  }
  if (!summary) {
    showStatus('daoPropStatus', _t('proposal.daoNoSummary','请填写提案摘要 (summary)'), 'warning');
    return;
  }
  if (!desc) {
    showStatus('daoPropStatus', _t('proposal.daoNoDesc','请填写提案详情 (description)'), 'warning');
    return;
  }
  if (!recipient) {
    showStatus('daoPropStatus', _t('proposal.poolNoRecipient','请填写收款地址'), 'warning');
    return;
  }
  if (!_isValidPaxiAddress(recipient)) {
    showStatus('daoPropStatus', _t('proposal.poolBadRecipient','收款地址格式不正确（paxi1...）'), 'error');
    return;
  }
  if (!(amount > 0)) {
    showStatus('daoPropStatus', _t('proposal.poolBadAmount','拨款金额必须大于 0'), 'warning');
    return;
  }
  if (depositNum <= 0) {
    showStatus('daoPropStatus', _t('proposal.invalidDeposit','押金必须大于 0'), 'warning');
    return;
  }
  // 金额不得超过链上社区池余额
  try {
    const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
    const res = await fetch(`${lcd}/cosmos/distribution/v1beta1/community_pool`);
    if (res.ok) {
      const data = await res.json();
      const denom = CONFIG.denom || 'upaxi';
      const pool = (data.pool || []).find(c => c.denom === denom) || (data.pool || [])[0];
      if (pool) {
        const poolPaxi = _decCoinToPaxi(pool.amount);
        if (amount > parseFloat(poolPaxi)) {
          showStatus('daoPropStatus',
            _t('proposal.poolExceed','拨款金额超过链上社区池余额') + ` (${poolPaxi} PAXI)`, 'error');
          return;
        }
      }
    }
  } catch (e) { /* 余额校验失败不阻塞提交，交由链上判定 */ }

  // 显式确认金额与收款地址
  const confirmMsg = _t('proposal.confirmSubmitPool','确认提交社区池拨款提案（DAO 资助申请）？\n\n拨款金额：{amount} PAXI\n收款地址：{rcv}\n\n提案通过后社区池将向该地址划拨 {amount} PAXI。\n服务费 {fee} PAXI + 押金 {deposit} PAXI。')
    .replace('{amount}', amount).replace('{rcv}', recipient)
    .replace('{fee}', feeNum).replace('{deposit}', depositNum);
  if (!confirm(confirmMsg)) return;

  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${_t('proposal.submitting','提交中...')}`;
  showStatus('daoPropStatus', _t('common.loading','加载中...'), 'info');

  try {
    const denom = CONFIG.denom;
    const proposer = state.wallet.address;
    const amountMicro = paxiToUpaxi(amount.toFixed(6));
    const depositMicro = paxiToUpaxi(depositNum.toFixed(6));

    const messages = [
      _buildPoolSpendProposalAny({
        title, summary, recipient, amountMicro, depositMicro, proposer, denom,
      }),
    ];

    // 平台服务费（单收款地址）
    if (feeNum > 0) {
      const feeMicro = paxiToUpaxi(feeNum.toFixed(6));
      const feeCollector = (typeof SHARED_CONFIG !== 'undefined' && SHARED_CONFIG.feeCollector) || CONFIG.feeCollector;
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: proposer,
        toAddress: feeCollector,
        amount: [PaxiCosmJS.coins(feeMicro, denom)[0]],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      }));
    }

    const res = await buildSignAndBroadcast(messages, `[DAO Funding] ${title.substring(0, 40)}`, null, state.wallet);

    const txResp = res?.tx_response || res;
    const txHash = txResp?.txhash;
    const txCode = txResp?.code;
    const txRawLog = txResp?.raw_log || res?.message || '';
    if (txCode !== undefined && txCode !== 0) {
      throw new Error(`交易失败 (code=${txCode}): ${txRawLog}`);
    }

    showStatus('daoPropStatus', `📡 已广播，等待确认 (tx: ${txHash ? txHash.slice(0,12)+'...' : '-'})`, 'info');

    let proposalId = null;
    let txConfirmed = false;
    let txErrorMessage = '';
    if (typeof pollTxStatus === 'function' && txHash) {
      try {
        const info = await pollTxStatus(txHash, 25);
        if (info) {
          if (info.confirmed && info.success) {
            txConfirmed = true;
            if (info.events) {
              for (const ev of info.events) {
                if (ev.type === 'submit_proposal' && ev.attributes) {
                  for (const attr of ev.attributes) {
                    const k = attr.key ? (typeof atob === 'function' ? atob(attr.key) : attr.key) : '';
                    const v = attr.value ? (typeof atob === 'function' ? atob(attr.value) : attr.value) : '';
                    if (k === 'proposal_id') { proposalId = v; break; }
                  }
                }
                if (proposalId) break;
              }
            }
          } else if (info.confirmed && !info.success) {
            txErrorMessage = info.rawLog || `code=${info.code}`;
          } else {
            txErrorMessage = '超时未确认（可能 gas 不足或网络拥堵）';
          }
        } else {
          txErrorMessage = '超时未确认';
        }
      } catch (e) {
        txErrorMessage = e.message || String(e);
      }
    }

    if (!txConfirmed) {
      const failMsg = _t('proposal.fail','❌ 提案提交失败：') + (txErrorMessage || '交易未上链确认');
      showStatus('daoPropStatus', failMsg, 'error');
      showToast(failMsg, 'error');
      return;
    }

    const okText = _t('proposal.daoSuccess','✅ DAO 资助申请提交成功！提案 ID：') + (proposalId || '（已上链，请在下方列表查看）');
    showStatus('daoPropStatus', okText, 'success');
    showToast(okText, 'success');
    setTimeout(loadProposalList, 2500);
  } catch (e) {
    console.error(e);
    let msg = _t('proposal.fail','❌ 提案提交失败：') + (e.message || String(e));
    if (typeof mapError === 'function') msg = _t('proposal.fail','❌ 提案提交失败：') + mapError(e);
    showStatus('daoPropStatus', msg, 'error');
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

function bindProposalEvents() {
  // 默认类型是 text，所以 param 区域隐藏
  const sel = document.getElementById('proposalType');
  if (sel) toggleProposalType(sel.value);
  // DAO 卡片：显隐与钱包状态联动 + 绑定内部事件
  refreshDaoProposalSlot();
  bindDaoProposalEvents();
  loadProposalList();
}

// 钱包连接/断开时由 notifyCurrentToolWalletChange() 触发
// 只刷新 DAO 卡片显隐，不重载提案列表（避免无谓的链上请求）
function onProposalWalletChange() {
  refreshDaoProposalSlot();
  bindDaoProposalEvents();
}

function collectParamChanges() {
  const rows = document.querySelectorAll('#proposalParamRows .param-row');
  const out = [];
  rows.forEach(row => {
    const sub = (row.querySelector('.param-sub') || {}).value || '';
    const key = (row.querySelector('.param-key') || {}).value || '';
    const val = (row.querySelector('.param-val') || {}).value || '';
    out.push({ sub: sub.trim(), key: key.trim(), val: val.trim() });
  });
  return out;
}

async function submitProposal() {
  if (typeof state !== 'undefined' && !state.connected) {
    showStatus('proposalStatus', _t('proposal.connectFirst','请先连接钱包'), 'warning');
    return;
  }
  const titleEl = document.getElementById('proposalTitle');
  const descEl = document.getElementById('proposalDesc');
  const depositEl = document.getElementById('proposalDeposit');
  const typeEl = document.getElementById('proposalType');
  const btn = document.getElementById('proposalSubmitBtn');
  if (!titleEl || !descEl || !depositEl || !typeEl) return;

  const type = typeEl.value === 'param' ? 'param' : 'text';
  const title = titleEl.value.trim();
  const desc = descEl.value.trim();
  const depositNum = parseFloat(depositEl.value) || 0;
  const cfg = govConfig();
  const feeNum = Number(cfg.submitFee) || 0;

  if (!title || !desc) {
    showStatus('proposalStatus', _t('proposal.emptyFields','请填写提案标题和描述'), 'warning');
    return;
  }
  if (depositNum <= 0) {
    showStatus('proposalStatus', _t('proposal.invalidDeposit','押金必须大于 0'), 'warning');
    return;
  }
  // 参数校验
  let changes = [];
  if (type === 'param') {
    const rows = collectParamChanges();
    if (!rows.length) {
      showStatus('proposalStatus', _t('proposal.invalidParamRef','参数修改提案至少添加一条参数'), 'warning');
      return;
    }
    for (const r of rows) {
      if (!r.sub || !r.key || r.val === '') {
        showStatus('proposalStatus', _t('proposal.invalidParam','请完整填写每条参数的 Subspace / Key / Value'), 'warning');
        return;
      }
    }
    changes = rows.map(r => ({ subspace: r.sub, key: r.key, value: r.val }));
  }

  const confirmMsg = _t('proposal.confirmSubmit','确认支付 {fee} PAXI 服务费 + {deposit} PAXI 押金提交提案？押金如通过将退还给您。')
    .replace('{fee}', feeNum).replace('{deposit}', depositNum);
  if (!confirm(confirmMsg)) return;

  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${_t('proposal.submitting','提交中...')}`;
  showStatus('proposalStatus', _t('common.loading','加载中...'), 'info');

  try {
    const denom = CONFIG.denom;
    const proposer = state.wallet.address;

    // 构造 content Any（text / param 走 legacy content）
    let contentAny = null;
    const submitTypeUrl = '/cosmos.gov.v1beta1.MsgSubmitProposal';

    if (type === 'text') {
      contentAny = PaxiCosmJS.Any.fromPartial({
        typeUrl: GOV_TYPE_URL.text,
        value: PaxiCosmJS.TextProposal.encode({ title, description: desc }).finish(),
      });
    } else {
      contentAny = PaxiCosmJS.Any.fromPartial({
        typeUrl: GOV_TYPE_URL.param,
        value: PaxiCosmJS.ParameterChangeProposal.encode({ title, description: desc, changes }).finish(),
      });
    }

    // MsgSubmitProposal
    const depositMicro = paxiToUpaxi(depositNum.toFixed(6));
    const depositCoins = [{ denom, amount: depositMicro }];
    const submitMsg = PaxiCosmJS.MsgSubmitProposal.fromPartial({
      content: contentAny,
      initialDeposit: depositCoins,
      proposer,
    });
    const submitValueBytes = PaxiCosmJS.MsgSubmitProposal.encode(submitMsg).finish();

    const messages = [
      PaxiCosmJS.Any.fromPartial({
        typeUrl: submitTypeUrl,
        value: submitValueBytes,
      }),
    ];

    // 平台服务费
    if (feeNum > 0) {
      const feeMicro = paxiToUpaxi(feeNum.toFixed(6));
      const feeCollector = (typeof SHARED_CONFIG !== 'undefined' && SHARED_CONFIG.feeCollector) || CONFIG.feeCollector;
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: proposer,
        toAddress: feeCollector,
        amount: [PaxiCosmJS.coins(feeMicro, denom)[0]],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      }));
    }

    const typeTag = type === 'text' ? 'Text' : 'ParamChange';
    const summary = `[${typeTag} Proposal] ${title.substring(0, 40)}`;
    const res = await buildSignAndBroadcast(messages, summary, null, state.wallet);

    // 检查广播结果 — 结构是 { tx_response: { txhash, code, raw_log } } 或 { txhash, code, raw_log }
    const txResp = res?.tx_response || res;
    const txHash = txResp?.txhash;
    const txCode = txResp?.code;
    const txRawLog = txResp?.raw_log || res?.message || '';

    // 广播同步返回 code≠0 说明交易直接被拒绝（序列化/签名/gas 问题）
    if (txCode !== undefined && txCode !== 0) {
      throw new Error(`交易失败 (code=${txCode}): ${txRawLog}`);
    }

    showStatus('proposalStatus', `📡 已广播，等待确认 (tx: ${txHash ? txHash.slice(0,12)+'...' : '-'})`, 'info');

    // 轮询确认交易是否真正上链
    let proposalId = null;
    let txConfirmed = false;
    let txErrorMessage = '';
    if (typeof pollTxStatus === 'function' && txHash) {
      try {
        const info = await pollTxStatus(txHash, 25);
        if (info) {
          if (info.confirmed && info.success) {
            txConfirmed = true;
            if (info.events) {
              for (const ev of info.events) {
                if (ev.type === 'submit_proposal' && ev.attributes) {
                  for (const attr of ev.attributes) {
                    const k = attr.key ? (typeof atob === 'function' ? atob(attr.key) : attr.key) : '';
                    const v = attr.value ? (typeof atob === 'function' ? atob(attr.value) : attr.value) : '';
                    if (k === 'proposal_id') { proposalId = v; break; }
                  }
                }
                if (proposalId) break;
              }
            }
          } else if (info.confirmed && !info.success) {
            // 交易上链了但执行失败（比如参数错误、权限不足等）
            txErrorMessage = info.rawLog || `code=${info.code}`;
          } else {
            txErrorMessage = '超时未确认（可能 gas 不足或网络拥堵）';
          }
        } else {
          txErrorMessage = '超时未确认';
        }
      } catch (e) {
        txErrorMessage = e.message || String(e);
      }
    }

    if (!txConfirmed) {
      const failMsg = _t('proposal.fail','❌ 提案提交失败：') + (txErrorMessage || '交易未上链确认');
      showStatus('proposalStatus', failMsg, 'error');
      showToast(failMsg, 'error');
      return;
    }

    const okText = _t('proposal.success','✅ 提案提交成功！提案 ID：') + (proposalId || '（已上链，请在下方列表查看）');
    showStatus('proposalStatus', okText, 'success');
    showToast(okText, 'success');
    setTimeout(loadProposalList, 2500);
  } catch (e) {
    console.error(e);
    let msg = _t('proposal.fail','❌ 提案提交失败：') + (e.message || String(e));
    if (typeof mapError === 'function') msg = _t('proposal.fail','❌ 提案提交失败：') + mapError(e);
    showStatus('proposalStatus', msg, 'error');
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

// ============ 提案列表 ============

// 手动编码 MsgCancelProposal（PaxiCosmJS 未内置此类型）
// protobuf: message MsgCancelProposal { uint64 proposal_id = 1; string proposer = 2; }
function _encodeMsgCancelProposal(proposalId, proposer) {
  const bytes = [];
  // ---- Field 1: proposal_id (uint64, varint), tag = (1<<3)|0 = 0x08 ----
  bytes.push(0x08);
  let pidNum = Number(proposalId);
  if (!(pidNum >= 0)) pidNum = 0;
  if (pidNum === 0) {
    bytes.push(0);
  } else {
    // 用 Number 做 varint，避免 BigInt 在部分老浏览器的位运算兼容问题
    // proposal_id 不会超过 2^53，Number 安全
    let v = pidNum >>> 0;
    let hi = Math.floor(pidNum / 0x100000000); // 高 21 位
    while (v >= 0x80 || hi > 0) {
      bytes.push((v & 0x7f) | 0x80);
      v = ((v >>> 7) | (hi & 0x7f) << 25) >>> 0;
      hi >>>= 7;
    }
    bytes.push(v & 0x7f);
  }
  // ---- Field 2: proposer (string, length-delimited), tag = (2<<3)|2 = 0x12 ----
  const proposerBytes = new TextEncoder().encode(proposer);
  bytes.push(0x12);
  let len = proposerBytes.length >>> 0;
  while (len >= 0x80) {
    bytes.push((len & 0x7f) | 0x80);
    len >>>= 7;
  }
  bytes.push(len & 0x7f);
  for (let i = 0; i < proposerBytes.length; i++) bytes.push(proposerBytes[i]);
  return new Uint8Array(bytes);
}

// 全局存储提案状态和 proposer，供 fetchProposer 使用
const _proposalStatusMap = {};
const _proposalProposerMap = {};

// 探测 MsgCancelProposal 在链上可用的 typeUrl
// 策略：优先 v1beta1（与 MsgSubmitProposal 一致），失败则尝试 v1
let _cachedCancelTypeUrl = null;
async function _probeCancelTypeUrl(proposer, msgBytes) {
  if (_cachedCancelTypeUrl) return _cachedCancelTypeUrl;
  const candidates = [
    '/cosmos.gov.v1beta1.MsgCancelProposal',
    '/cosmos.gov.v1.MsgCancelProposal',
  ];
  const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
  for (const typeUrl of candidates) {
    try {
      const msgAny = PaxiCosmJS.Any.fromPartial({ typeUrl, value: msgBytes });
      const txBody = PaxiCosmJS.TxBody.fromPartial({
        messages: [msgAny],
        memo: `Cancel Proposal probe`,
      });
      const bodyBytes = PaxiCosmJS.TxBody.encode(txBody).finish();
      // 构造一个空的签名者 (模拟不需要真实签名，gas 会被返回就行)
      const authInfo = PaxiCosmJS.AuthInfo.fromPartial({
        signerInfos: [],
        fee: PaxiCosmJS.Fee.fromPartial({
          amount: [PaxiCosmJS.Coin.fromPartial({ denom: CONFIG.denom, amount: '0' })],
          gasLimit: 0,
        }),
      });
      const authBytes = PaxiCosmJS.AuthInfo.encode(authInfo).finish();
      const txRaw = PaxiCosmJS.TxRaw.fromPartial({
        bodyBytes, authInfoBytes: authBytes, signatures: [new Uint8Array()],
      });
      const txBytesB64 = btoa(String.fromCharCode.apply(null, PaxiCosmJS.TxRaw.encode(txRaw).finish()));
      const res = await fetch(`${lcd}/cosmos/tx/v1beta1/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_bytes: txBytesB64 }),
      });
      if (res.ok) {
        const data = await res.json();
        const gas = data?.gas_info?.gas_used || data?.gasUsed;
        // 如果返回有效 gas，说明 typeUrl 被识别（即便可能因为签名缺失报其他错，消息类型是好的）
        if (gas && Number(gas) > 0) {
          _cachedCancelTypeUrl = typeUrl;
          return typeUrl;
        }
        // 如果没有 gas，但错误不是 "unknown" 也不是 "not found"，也可能是能识别的
        const err = data?.error || '';
        if (err && !/unknown|unrecognized|not found|route/i.test(err)) {
          _cachedCancelTypeUrl = typeUrl;
          return typeUrl;
        }
      } else {
        const text = await res.text();
        // 500/400 里如果是 decode 错误而不是 unknown，也说明消息类型被识别
        if (!/unknown|unrecognized|not found|route/i.test(text)) {
          _cachedCancelTypeUrl = typeUrl;
          return typeUrl;
        }
      }
    } catch (e) {
      // 探测失败，跳过此候选
      console.debug(`[probe] ${typeUrl} failed:`, e.message);
    }
  }
  // 都探测不出来，就按与提交提案相同的 v1beta1 版本默认
  _cachedCancelTypeUrl = '/cosmos.gov.v1beta1.MsgCancelProposal';
  return _cachedCancelTypeUrl;
}

// 读取当前钱包余额（upaxi）
async function _getBalance(addr) {
  try {
    const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
    const denom = CONFIG.denom;
    const res = await fetch(`${lcd}/cosmos/bank/v1beta1/balances/${addr}/by_denom?denom=${denom}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.balance?.amount || null;
  } catch (e) { return null; }
}

async function cancelProposal(proposalId) {
  if (typeof state !== 'undefined' && !state.connected) {
    showToast(_t('proposal.connectFirst','请先连接钱包'), 'error');
    return;
  }
  const confirmMsg = _t('proposal.cancelConfirm','确认撤销提案 #{id}？撤销后押金将退还给您。').replace('{id}', proposalId);
  if (!confirm(confirmMsg)) return;

  // 创建状态提示元素
  let statusEl = document.getElementById('proposalStatus');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'proposalStatus';
    statusEl.className = 'status-msg';
    const listEl = document.getElementById('proposalList');
    if (listEl) listEl.parentNode.insertBefore(statusEl, listEl);
  }
  statusEl.style.display = 'block';
  statusEl.className = 'status-msg info';
  statusEl.textContent = _t('proposal.canceling','撤销中...') + ' (探测链上消息类型...)';

  try {
    const proposer = state.wallet.address;
    const msgBytes = _encodeMsgCancelProposal(proposalId, proposer);
    // 先探测链上支持的 typeUrl 版本
    const cancelTypeUrl = await _probeCancelTypeUrl(proposer, msgBytes);

    // 记录撤销前余额，用于之后验证押金退还
    const balanceBefore = await _getBalance(proposer);

    statusEl.textContent = _t('proposal.canceling','撤销中...') + ` (使用 ${cancelTypeUrl.includes('v1beta1') ? 'v1beta1' : 'v1'} API)`;

    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: cancelTypeUrl,
      value: msgBytes,
    })];

    const summary = `Cancel Proposal #${proposalId}`;
    const res = await buildSignAndBroadcast(messages, summary, null, state.wallet);

    const txResp = res?.tx_response || res;
    const txHash = txResp?.txhash;
    const txCode = txResp?.code;
    const txRawLog = txResp?.raw_log || res?.message || '';

    if (txCode !== undefined && txCode !== 0) {
      throw new Error(`交易失败 (code=${txCode}): ${txRawLog}`);
    }

    // 轮询确认
    let txConfirmed = false;
    let txErrorMessage = '';
    let pollInfo = null;
    if (typeof pollTxStatus === 'function' && txHash) {
      try {
        pollInfo = await pollTxStatus(txHash, 25);
        if (pollInfo) {
          if (pollInfo.confirmed && pollInfo.success) {
            txConfirmed = true;
          } else if (pollInfo.confirmed && !pollInfo.success) {
            txErrorMessage = pollInfo.rawLog || `code=${pollInfo.code}`;
          } else {
            txErrorMessage = '超时未确认';
          }
        } else {
          txErrorMessage = '超时未确认';
        }
      } catch (e) {
        txErrorMessage = e.message || String(e);
      }
    }

    if (!txConfirmed) {
      const failMsg = _t('proposal.cancelFail','❌ 撤销提案失败：') + (txErrorMessage || '交易未上链确认');
      statusEl.className = 'status-msg error';
      statusEl.textContent = failMsg;
      showToast(failMsg, 'error');
      return;
    }

    // ===== 押金退还余额验证 =====
    statusEl.className = 'status-msg info';
    statusEl.textContent = _t('proposal.cancelSuccess','✅ 提案 #{id} 已撤销，押金将退还。').replace('{id}', proposalId) + ' 等待余额更新...';
    let balanceAfter = null;
    let refundPaxi = null;
    let gasPaxi = null;
    for (let retry = 0; retry < 6; retry++) {
      await new Promise(r => setTimeout(r, 1500));
      balanceAfter = await _getBalance(proposer);
      if (balanceAfter && balanceBefore) {
        const diff = BigInt(balanceAfter) - BigInt(balanceBefore);
        // 理论上：押金退还 - 交易 gas 费 = 正或负
        if (typeof upaxiToPaxi === 'function') {
          refundPaxi = upaxiToPaxi(diff.toString());
        } else {
          refundPaxi = (Number(diff) / 1e6).toFixed(6);
        }
        // 估算 gas 费：交易记录里查或简单提示
        gasPaxi = pollInfo && pollInfo.gasWanted ? (Number(pollInfo.gasWanted) * 0.25 / 1e6).toFixed(6) : null;
        break;
      }
    }

    let okHtml = `<strong>${_t('proposal.cancelSuccess','✅ 提案 #{id} 已撤销，押金将退还。').replace('{id}', proposalId)}</strong>`;
    okHtml += `<br><span style="font-size:11px;">Tx: <code>${txHash ? txHash.slice(0,12)+'...' : '-'}</code></span>`;
    if (refundPaxi != null && balanceBefore && balanceAfter) {
      const sign = parseFloat(refundPaxi) >= 0 ? '+' : '';
      const netBadge = parseFloat(refundPaxi) >= 0
        ? `<span style="color:#52c41a;font-weight:700;">${sign}${refundPaxi} PAXI</span>`
        : `<span style="color:var(--danger);font-weight:700;">${sign}${refundPaxi} PAXI</span>`;
      okHtml += `<br><span style="font-size:12px;">钱包余额变化：${netBadge}`;
      okHtml += `<br>&nbsp;&nbsp;✓ 押金已退还（退还金额 = 提案押金 - 撤销所需 gas 费）`;
      if (gasPaxi) okHtml += `<br>&nbsp;&nbsp;💰 撤销 gas 费约：${gasPaxi} PAXI`;
      okHtml += `</span>`;
    } else {
      okHtml += `<br><span style="font-size:12px;color:var(--text-muted);">押金已在链上退还，刷新首页余额可见。</span>`;
    }
    statusEl.className = 'status-msg success';
    statusEl.innerHTML = okHtml;
    showToast(_t('proposal.cancelSuccess','✅ 提案 #{id} 已撤销，押金将退还。').replace('{id}', proposalId), 'success');
    setTimeout(loadProposalList, 3000);
  } catch (e) {
    console.error(e);
    let msg = _t('proposal.cancelFail','❌ 撤销提案失败：') + (e.message || String(e));
    if (typeof mapError === 'function') msg = _t('proposal.cancelFail','❌ 撤销提案失败：') + mapError(e);
    statusEl.className = 'status-msg error';
    statusEl.textContent = msg;
    showToast(msg, 'error');
  }
}

function statusLabel(status) {
  const s = GOV_STATUS[Number(status)] || { label: status, cls: 'warning' };
  let zhLabel = s.label;
  if (Number(status) === 2 || Number(status) === 1) zhLabel = _t('proposal.voting','投票中');
  else if (Number(status) === 3) zhLabel = _t('proposal.passed','已通过');
  else if (Number(status) === 4) zhLabel = _t('proposal.rejected','已拒绝');
  else if (Number(status) === 5) zhLabel = _t('proposal.depositFailed','押金失败退还');
  return { label: zhLabel, cls: s.cls };
}

function statusStrToNum(s) {
  if (typeof s !== 'string') return 0;
  if (s.includes('DEPOSIT_PERIOD')) return 1;
  if (s.includes('VOTING_PERIOD')) return 2;
  if (s.includes('PASSED')) return 3;
  if (s.includes('REJECTED')) return 4;
  if (s.includes('FAILED')) return 5;
  return 0;
}
function normalizeProposal(p) {
  // 提取 proposer：不同版本 API 字段位置不同
  let proposer = p.proposer || null;
  if (!proposer && p.proposal) proposer = p.proposal.proposer || null;
  // v1 API 用 id，v1beta1 用 proposal_id
  const pid = p.proposal_id || p.id || null;
  return {
    proposal_id: pid,
    id: pid,
    status: typeof p.status === 'number' ? p.status : statusStrToNum(p.status),
    total_deposit: p.total_deposit || [],
    submit_time: p.submit_time || '',
    content: p.content || null,
    // v1 API：messages 数组
    messages: p.messages || null,
    title: extractProposalTitle(p),
    proposer: proposer,
    // 保存原始数据，后续可继续挖掘
    _raw: p,
  };
}
// 从 content 提取提案类型（用于列表徽章）
function proposalTypeTag(p) {
  // v1 API：messages 数组（每项带 @type）
  const msgs = p?.messages || p?._raw?.messages || null;
  if (Array.isArray(msgs) && msgs.length) {
    const t = msgs[0]?.['@type'] || msgs[0]?.type_url || msgs[0]?.typeUrl || '';
    if (t) return _govTypeTagByUrl(t);
  }
  // v1beta1 API：content（{ "@type": ... } 或 { type_url, value }）
  const c = p?.content || p?._raw?.content || null;
  let typeUrl = '';
  if (c) {
    if (typeof c === 'string') typeUrl = c;
    else if (c['@type']) typeUrl = c['@type'];
    else if (c.type_url || c.typeUrl) typeUrl = c.type_url || c.typeUrl;
  }
  if (!typeUrl) return null;
  return _govTypeTagByUrl(typeUrl);
}

function _govTypeTagByUrl(typeUrl) {
  if (!typeUrl) return null;
  if (typeUrl.includes('CommunityPoolSpend')) {
    return { label: _t('proposal.badgePool','🏦 社区池拨款'), color: '#0ea5e9', bg: 'rgba(14,165,233,.15)' };
  }
  if (typeUrl.includes('ParameterChange')) {
    return { label: _t('proposal.badgeParam','🔧 参数修改'), color: '#f59e0b', bg: 'rgba(245,158,11,.15)' };
  }
  if (typeUrl.includes('Text')) {
    return { label: _t('proposal.badgeText','📝 文本'), color: 'var(--primary)', bg: 'rgba(88,101,242,.15)' };
  }
  if (typeUrl.includes('SoftwareUpgrade')) {
    return { label: _t('proposal.badgeUpgrade','⬆️ 软件升级'), color: '#22c55e', bg: 'rgba(34,197,94,.15)' };
  }
  if (typeUrl.includes('MsgUpdateParams')) {
    return { label: _t('proposal.badgeParam','🔧 参数修改'), color: '#f59e0b', bg: 'rgba(245,158,11,.15)' };
  }
  if (typeUrl.includes('MsgRecoverClient')) {
    return { label: _t('proposal.badgeClient','🔗 IBC 客户端恢复'), color: '#a855f7', bg: 'rgba(168,85,247,.15)' };
  }
  return { label: typeUrl.split('.').pop(), color: 'var(--text-muted)', bg: 'rgba(255,255,255,.08)' };
}

function extractProposalTitle(p) {
  try {
    // v1 API：直接带 title 字段
    if (typeof p.title === 'string' && p.title) return p.title;
    if (typeof p.summary === 'string' && p.summary) return p.summary;
    if (p.content) {
      // v1beta1 Any: { typeUrl, value(base64 of TextProposal) }
      if (p.content.type_url || p.content.typeUrl) {
        const v = p.content.value || '';
        if (v && typeof atob === 'function') {
          const decoded = atob(v);
          // TextProposal: title is field 1 (len-delim string), ParameterChangeProposal: title field 1 too
          // Simple heuristic: first length-delimited string before 0x12 (field 2)
          const bs = []; for (let i = 0; i < decoded.length; i++) bs.push(decoded.charCodeAt(i));
          const raw = new Uint8Array(bs);
          const title = readFirstLenDelim(raw);
          if (title) return title;
        }
      }
      if (typeof p.content.title === 'string') return p.content.title;
    }
  } catch (e) {}
  return `Proposal #${p.proposal_id || p.id || '?'}`;
}
// protobuf: read field 1 length-delimited string from raw bytes
function readFirstLenDelim(raw) {
  let i = 0;
  // tag
  if (i >= raw.length) return null;
  const tag = raw[i++];
  if ((tag & 0x07) !== 2) return null; // must be len-delim
  // length (varint)
  let len = 0, shift = 0;
  while (true) {
    if (i >= raw.length) return null;
    const b = raw[i++];
    len |= (b & 0x7F) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift > 63) return null;
  }
  if (len < 0 || i + len > raw.length) return null;
  let s = '';
  for (let j = 0; j < len; j++) s += String.fromCharCode(raw[i + j]);
  // utf8 decode in case title contains non-ASCII
  try { return decodeURIComponent(escape(s)); }
  catch (e) { return s; }
}
function formatDeposit(arr) {
  if (!arr || !arr.length) return '0 PAXI';
  const paxi = arr.find(c => c.denom === 'upaxi' || c.denom === 'PAXI');
  if (!paxi) return `${arr[0].amount} ${arr[0].denom}`;
  const n = typeof upaxiToPaxi === 'function' ? upaxiToPaxi(paxi.amount) : (parseFloat(paxi.amount) / 1e6).toString();
  return `${n} PAXI`;
}
function formatTimeSafe(t) {
  if (!t) return '-';
  try {
    const d = new Date(t);
    if (isNaN(d.getTime())) return t;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) { return t; }
}
function escapeHtmlSafe(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

async function loadProposalList() {
  const container = document.getElementById('proposalList');
  if (!container) return;
  try {
    const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
    let proposals = [];
    let err = null;
    // Cosmos SDK gov API 默认只返回 voting_period 的提案
    // 需要分别查询 deposit_period / voting_period / passed / rejected 才能看到全部
    const statuses = [
      'PROPOSAL_STATUS_DEPOSIT_PERIOD',
      'PROPOSAL_STATUS_VOTING_PERIOD',
      'PROPOSAL_STATUS_PASSED',
      'PROPOSAL_STATUS_REJECTED',
      'PROPOSAL_STATUS_FAILED',
    ];
    // 优先 v1 API（带 title/summary/messages，proposer 字段齐全）；
    // v1beta1 的 status 过滤参数不兼容（HTTP 400），且不返回标题 → 仅作兜底
    for (const apiVer of ['/cosmos/gov/v1/proposals', '/cosmos/gov/v1beta1/proposals']) {
      const all = [];
      let okCount = 0;
      for (const st of statuses) {
        try {
          const res = await fetch(`${lcd}${apiVer}?proposal_status=${st}&pagination.limit=100&pagination.reverse=true`);
          if (!res.ok) { continue; }
          const data = await res.json();
          all.push(...(data.proposals || []));
          okCount++;
        } catch (e) { /* skip */ }
      }
      if (okCount > 0) {
        proposals = all.map(p => normalizeProposal(p));
        break;
      }
      // 如果分状态查询全部失败，尝试不带 status 查全部
      if (apiVer === '/cosmos/gov/v1/proposals') {
        try {
          const res = await fetch(`${lcd}${apiVer}?pagination.limit=100&pagination.reverse=true`);
          if (res.ok) {
            const data = await res.json();
            proposals = (data.proposals || []).map(p => normalizeProposal(p));
            break;
          }
        } catch (e) {}
      }
    }
    if (!proposals.length) {
      container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">${_t('proposal.listEmpty','暂无提案')}${err ? '<br><span style="font-size:11px;">(' + escapeHtmlSafe(err) + ')</span>' : ''}</p>`;
      return;
    }
    proposals.sort((a, b) => Number(b.proposal_id || b.id || 0) - Number(a.proposal_id || a.id || 0));

    // 先渲染列表：如果提案自带 proposer 就直接显示，否则显示查询中
    container.innerHTML = proposals.map(p => {
      const st = statusLabel(p.status);
      const time = p.submit_time || '';
      const deposit = formatDeposit(p.total_deposit || []);
      const pid = p.proposal_id || p.id || '?';
      // 存储状态和 proposer 供后续使用
      _proposalStatusMap[pid] = p.status;
      if (p.proposer) _proposalProposerMap[pid] = p.proposer;
      const statusBadge = `<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;${
        st.cls === 'success' ? 'background:rgba(82,196,26,.15);color:#52c41a;' :
        st.cls === 'danger' ? 'background:rgba(255,77,79,.15);color:#ff4d4f;' :
        st.cls === 'primary' ? 'background:rgba(88,101,242,.2);color:var(--primary);' :
        'background:rgba(250,173,20,.15);color:#faad14;'
      }">${st.label}</span>`;
      const leftColor = st.cls==='success'?'#52c41a':st.cls==='danger'?'#ff4d4f':st.cls==='primary'?'var(--primary)':'#faad14';
      // 如果列表数据里已经有 proposer，就直接显示不占位
      const proposerHtml = p.proposer ? renderProposerHtml(pid, p.proposer) : `<span id="proposer-${pid}" style="font-family:var(--font-mono,monospace);">查询中...</span>`;
      // 如果已有 proposer 且条件满足，直接渲染撤销按钮
      const cancelBtnHtml = (p.proposer && shouldShowCancelBtn(pid, p.status, p.proposer))
        ? renderCancelBtnHtml(pid)
        : `<span id="cancel-btn-${pid}"></span>`;
      return `
        <div style="border-left:3px solid ${leftColor};background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-weight:700;">#${pid}</div>
            ${statusBadge}
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlSafe(p.title)}</div>
          ${(() => { const tag = proposalTypeTag(p); return tag ? `<div style="margin-bottom:6px;"><span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:${tag.bg};color:${tag.color};">${escapeHtmlSafe(tag.label)}</span></div>` : ''; })()}
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
            <span>💰 ${deposit}</span>
            <span>📅 ${formatTimeSafe(time)}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="display:flex;align-items:center;gap:2px;min-width:0;">👤 ${proposerHtml}</span>
            ${cancelBtnHtml}
          </div>
        </div>
      `;
    }).join('');

    // 异步补充查询提案发起人（列表数据里没有的才查）
    for (const p of proposals) {
      const pid = p.proposal_id || p.id;
      if (!pid) continue;
      if (!p.proposer) {
        fetchProposer(pid, lcd);
      }
    }
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:10px;">加载失败：${escapeHtmlSafe(e.message)}</p>`;
  }
}

// 判断是否应该显示撤销按钮
function shouldShowCancelBtn(proposalId, status, proposer) {
  if (!proposer) return false;
  if (status !== 1) return false; // 必须是押金中 (DepositPeriod)
  if (typeof state === 'undefined' || !state.wallet || !state.wallet.address) return false;
  return state.wallet.address === proposer;
}

// 渲染 proposer 显示 HTML
function renderProposerHtml(proposalId, addr) {
  if (!addr) return '未知';
  const mine = (typeof state !== 'undefined' && state.wallet && state.wallet.address === addr);
  const short = addr.length > 20 ? addr.slice(0, 12) + '...' + addr.slice(-6) : addr;
  return mine
    ? `<span id="proposer-${proposalId}" style="color:var(--primary);font-weight:600;">${short}</span> <span style="background:var(--primary);color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;">我</span>`
    : `<span id="proposer-${proposalId}" title="${addr}">${short}</span>`;
}

// 渲染撤销按钮 HTML
function renderCancelBtnHtml(proposalId) {
  return `<button class="btn btn-ghost" style="padding:2px 10px;font-size:11px;color:var(--danger);border:1px solid var(--danger);border-radius:4px;" onclick="cancelProposal('${proposalId}')">${_t('proposal.cancelBtn','🗑 撤销提案')}</button>`;
}

// 查询提案发起人地址并回填到列表
async function fetchProposer(proposalId, lcd) {
  const el = document.getElementById(`proposer-${proposalId}`);
  try {
    let addr = _proposalProposerMap[proposalId] || null;
    // 尝试从单独的 proposer API 查询
    if (!addr) {
      for (const apiVer of ['/cosmos/gov/v1/proposals', '/cosmos/gov/v1beta1/proposals']) {
        try {
          const res = await fetch(`${lcd}${apiVer}/${proposalId}/proposer`);
          if (!res.ok) continue;
          const data = await res.json();
          console.debug('[fetchProposer] API resp:', proposalId, data);
          addr = data.proposer || (data.proposal && data.proposal.proposer) || null;
          if (addr) break;
        } catch (e) { /* try next */ }
      }
    }
    // 再试一次：直接查单条 proposal 详情，数据里可能有 proposer
    if (!addr) {
      for (const apiVer of ['/cosmos/gov/v1/proposals', '/cosmos/gov/v1beta1/proposals']) {
        try {
          const res = await fetch(`${lcd}${apiVer}/${proposalId}`);
          if (!res.ok) continue;
          const data = await res.json();
          const p = data.proposal || data;
          addr = p.proposer || (p.proposal && p.proposal.proposer) || null;
          if (addr) break;
        } catch (e) { /* try next */ }
      }
    }
    if (addr) {
      _proposalProposerMap[proposalId] = addr;
      // 替换显示
      if (el) {
        const mine = (typeof state !== 'undefined' && state.wallet && state.wallet.address === addr);
        const short = addr.length > 20 ? addr.slice(0, 12) + '...' + addr.slice(-6) : addr;
        el.outerHTML = renderProposerHtml(proposalId, addr);
      }
      // 如果是本人的提案且处于押金中状态，显示撤销按钮
      const status = _proposalStatusMap[proposalId];
      if (shouldShowCancelBtn(proposalId, status, addr)) {
        const cancelBtnEl = document.getElementById(`cancel-btn-${proposalId}`);
        if (cancelBtnEl) cancelBtnEl.innerHTML = renderCancelBtnHtml(proposalId);
      }
    } else {
      if (el) el.textContent = '未知';
    }
  } catch (e) {
    console.error('[fetchProposer] error:', proposalId, e);
    if (el) el.textContent = '查询失败';
  }
}

window.TOOL_REGISTRY['proposal'] = { render: renderProposal, bind: bindProposalEvents, onMount: onProposalWalletChange };
window.cancelProposal = cancelProposal;
