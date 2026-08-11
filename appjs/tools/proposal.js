/**
 * 工具模块：治理提案 (Governance Proposal)
 * 支持两类提案：
 *  - 文本提案 (TextProposal)
 *  - 参数修改提案 (ParameterChangeProposal) — 可添加多条 subspace/key/value
 * 手续费：SHARED_CONFIG.governance.submitFee（默认 50 PAXI）
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const GOV_TYPE_URL = {
  text: '/cosmos.gov.v1beta1.TextProposal',
  param: '/cosmos.params.v1beta1.ParameterChangeProposal',
};
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

function govConfig() {
  return (typeof SHARED_CONFIG !== 'undefined' && SHARED_CONFIG.governance) || { submitFee: 50, defaultDeposit: 100 };
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
      <div class="tool-desc" style="margin-bottom:14px;">${_t('proposal.desc','提交 Paxi 网络治理提案，参与社区决策。提案需要支付押金，并支付平台手续费。')}</div>

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
          <input type="text" id="proposalTitle" placeholder="${_t('proposal.titlePlaceholder','例如：建议降低交易手续费')}">
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
          <span style="font-size:13px;color:var(--text-muted);">${_t('proposal.fee','手续费 (PAXI)')}</span>
          <span style="color:var(--primary);font-weight:700;font-size:15px;">${cfg.submitFee} PAXI</span>
        </div>

        <button class="btn btn-primary" id="proposalSubmitBtn" style="width:100%;font-weight:700;font-size:14px;min-height:42px;" onclick="submitProposal()">
          🚀 ${_t('proposal.submitBtn','提交提案')}
        </button>
        <div class="status-msg" id="proposalStatus" style="margin-top:10px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${_t('proposal.list','提案列表')}</div>
      <div id="proposalList"><p style="color:var(--text-muted);text-align:center;padding:20px;">${_t('proposal.listLoading','加载中...')}</p></div>
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
  if (!box) return;
  box.style.display = (val === 'param') ? 'block' : 'none';
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

function bindProposalEvents() {
  // 默认类型是 text，所以 param 区域隐藏
  const sel = document.getElementById('proposalType');
  if (sel) toggleProposalType(sel.value);
  loadProposalList();
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

  const confirmMsg = _t('proposal.confirmSubmit','确认支付 {fee} PAXI 手续费 + {deposit} PAXI 押金提交提案？押金如通过将退还给您。')
    .replace('{fee}', feeNum).replace('{deposit}', depositNum);
  if (!confirm(confirmMsg)) return;

  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${_t('proposal.submitting','提交中...')}`;
  showStatus('proposalStatus', _t('common.loading','加载中...'), 'info');

  try {
    const denom = CONFIG.denom;
    const proposer = state.wallet.address;

    // 构造 content Any
    let contentAny;
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
    const submitMsg = PaxiCosmJS.MsgSubmitProposal.fromPartial({
      content: contentAny,
      initialDeposit: [{ denom, amount: depositMicro }],
      proposer,
    });
    const messages = [
      PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
        value: PaxiCosmJS.MsgSubmitProposal.encode(submitMsg).finish(),
      }),
    ];

    // 平台手续费
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

    const summary = `[${type === 'text' ? 'Text' : 'ParamChange'} Proposal] ${title.substring(0, 40)}`;
    const res = await buildSignAndBroadcast(messages, summary, null, state.wallet);
    const txHash = res && res.txhash;
    showStatus('proposalStatus', `📡 已广播，等待确认 (tx: ${txHash ? txHash.slice(0,12)+'...' : '-'})`, 'info');

    // 轮询获取 proposal_id
    let proposalId = null;
    if (typeof pollTxStatus === 'function' && txHash) {
      try {
        const info = await pollTxStatus(txHash, 25);
        if (info && info.events) {
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
      } catch (e) { /* ignore */ }
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
  return {
    proposal_id: p.proposal_id || p.id,
    status: typeof p.status === 'number' ? p.status : statusStrToNum(p.status),
    total_deposit: p.total_deposit || [],
    submit_time: p.submit_time || '',
    content: p.content || null,
    title: extractProposalTitle(p),
  };
}
function extractProposalTitle(p) {
  try {
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
    for (const endpoint of [
      `${lcd}/cosmos/gov/v1beta1/proposals?pagination.limit=100&pagination.reverse=true`,
      `${lcd}/cosmos/gov/v1/proposals?pagination.limit=100&pagination.reverse=true`,
    ]) {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) { err = `HTTP ${res.status}`; continue; }
        const data = await res.json();
        proposals = (data.proposals || []).map(p => normalizeProposal(p));
        break;
      } catch (e) { err = e.message; }
    }
    if (!proposals.length) {
      container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">${_t('proposal.listEmpty','暂无提案')}${err ? '<br><span style="font-size:11px;">(' + escapeHtmlSafe(err) + ')</span>' : ''}</p>`;
      return;
    }
    proposals.sort((a, b) => Number(b.proposal_id || b.id || 0) - Number(a.proposal_id || a.id || 0));
    container.innerHTML = proposals.map(p => {
      const st = statusLabel(p.status);
      const time = p.submit_time || '';
      const deposit = formatDeposit(p.total_deposit || []);
      const statusBadge = `<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;${
        st.cls === 'success' ? 'background:rgba(82,196,26,.15);color:#52c41a;' :
        st.cls === 'danger' ? 'background:rgba(255,77,79,.15);color:#ff4d4f;' :
        st.cls === 'primary' ? 'background:rgba(88,101,242,.2);color:var(--primary);' :
        'background:rgba(250,173,20,.15);color:#faad14;'
      }">${st.label}</span>`;
      const leftColor = st.cls==='success'?'#52c41a':st.cls==='danger'?'#ff4d4f':st.cls==='primary'?'var(--primary)':'#faad14';
      return `
        <div style="border-left:3px solid ${leftColor};background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-weight:700;">#${p.proposal_id || p.id || '?'}</div>
            ${statusBadge}
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlSafe(p.title)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);">
            <span>💰 ${deposit}</span>
            <span>📅 ${formatTimeSafe(time)}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:10px;">加载失败：${escapeHtmlSafe(e.message)}</p>`;
  }
}

window.TOOL_REGISTRY['proposal'] = { render: renderProposal, bind: bindProposalEvents, onMount: bindProposalEvents };
