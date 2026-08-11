/**
 * 工具模块：治理提案 (Governance Proposal)
 * 功能：
 *  - 提交文本提案（MsgSubmitProposal + TextProposal）
 *  - 支付平台手续费（默认 50 PAXI → SHARED_CONFIG.governance.submitFee）
 *  - 押金（默认 100 PAXI → SHARED_CONFIG.governance.defaultDeposit，可调整）
 *  - 提案列表查询（cosmos.gov.v1beta1/proposals）
 * 依赖：全局 t(), state, CONFIG, showToast, showStatus, buildSignAndBroadcast, pollTxStatus,
 *        PaxiCosmJS, fromBase64, toBase64, upaxiToPaxi, paxiToUpaxi, SHARED_CONFIG
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const GOV_TYPE_URL = {
  text: '/cosmos.gov.v1beta1.TextProposal',
};
const GOV_STATUS = {
  0: { text: 'PROPOSAL_STATUS_UNSPECIFIED', label: '未知', cls: 'warning' },
  1: { text: 'PROPOSAL_STATUS_DEPOSIT_PERIOD', label: '押金中', cls: 'info' },
  2: { text: 'PROPOSAL_STATUS_VOTING_PERIOD', label: '投票中', cls: 'primary' },
  3: { text: 'PROPOSAL_STATUS_PASSED', label: '已通过', cls: 'success' },
  4: { text: 'PROPOSAL_STATUS_REJECTED', label: '已拒绝', cls: 'danger' },
  5: { text: 'PROPOSAL_STATUS_FAILED', label: '押金失败退还', cls: 'warning' },
};

function govConfig() {
  return (typeof SHARED_CONFIG !== 'undefined' && SHARED_CONFIG.governance) || { submitFee: 50, defaultDeposit: 100 };
}

function statusLabel(status) {
  const s = GOV_STATUS[Number(status)] || { label: status, cls: 'warning' };
  let zhLabel = s.label;
  if (typeof t === 'function') {
    if (status === 1 || status === 2) zhLabel = t('proposal.voting');
    else if (status === 3) zhLabel = t('proposal.passed');
    else if (status === 4) zhLabel = t('proposal.rejected');
    else if (status === 5) zhLabel = t('proposal.depositFailed');
  } else {
    if (status === 1 || status === 2) zhLabel = '投票中';
    else if (status === 3) zhLabel = '已通过';
    else if (status === 4) zhLabel = '已拒绝';
    else if (status === 5) zhLabel = '押金失败退还';
  }
  return { label: zhLabel, cls: s.cls };
}

function renderProposal() {
  const cfg = govConfig();
  const ttl = typeof t === 'function' ? t('proposal.title') : '治理提案';
  const desc = typeof t === 'function' ? t('proposal.desc') : '提交 Paxi 网络治理提案，参与社区决策。提案需要支付押金，并支付平台手续费。';
  const submit = typeof t === 'function' ? t('proposal.submit') : '提交提案';
  const typeLabel = typeof t === 'function' ? t('proposal.type') : '提案类型';
  const typeText = typeof t === 'function' ? t('proposal.typeText') : '文本提案';
  const titleLabel = typeof t === 'function' ? t('proposal.titleLabel') : '提案标题';
  const titlePH = typeof t === 'function' ? t('proposal.titlePlaceholder') : '例如：建议降低交易手续费';
  const descLabel = typeof t === 'function' ? t('proposal.descLabel') : '提案描述';
  const descPH = typeof t === 'function' ? t('proposal.descPlaceholder') : '详细描述你的提案...';
  const depositLabel = typeof t === 'function' ? t('proposal.deposit') : '押金 (PAXI)';
  const feeLabel = typeof t === 'function' ? t('proposal.fee') : '手续费 (PAXI)';
  const submitBtn = typeof t === 'function' ? t('proposal.submitBtn') : '🚀 提交提案';
  const listTitle = typeof t === 'function' ? t('proposal.list') : '📋 提案列表';

  return `
    <div class="card">
      <div class="card-title">${ttl}</div>
      <div class="tool-desc" style="margin-bottom:14px;">${desc}</div>

      <div class="card" style="background:var(--bg);padding:16px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;font-weight:700;font-size:15px;">
          📝 ${submit}
        </div>

        <div class="form-group">
          <label class="form-label">${typeLabel}</label>
          <select id="proposalType" disabled style="background:var(--bg-card);color:var(--text);">
            <option value="text">${typeText}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">${titleLabel}</label>
          <input type="text" id="proposalTitle" placeholder="${titlePH}">
        </div>

        <div class="form-group">
          <label class="form-label">${descLabel}</label>
          <textarea id="proposalDesc" rows="5" placeholder="${descPH}"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">${depositLabel}</label>
          <input type="number" id="proposalDeposit" value="${cfg.defaultDeposit}" min="0" step="0.01">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
          <span style="font-size:13px;color:var(--text-muted);">${feeLabel}</span>
          <span style="color:var(--primary);font-weight:700;font-size:15px;">${cfg.submitFee} PAXI</span>
        </div>

        <button class="btn btn-primary" id="proposalSubmitBtn" style="width:100%;font-weight:700;font-size:14px;min-height:42px;" onclick="submitProposal()">
          🚀 ${submitBtn}
        </button>
        <div class="status-msg" id="proposalStatus" style="margin-top:10px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">${listTitle}</div>
      <div id="proposalList"><p style="color:var(--text-muted);text-align:center;padding:20px;">${typeof t === 'function' ? t('proposal.listLoading') : '加载中...'}</p></div>
    </div>
  `;
}

function bindProposalEvents() {
  loadProposalList();
}

async function loadProposalList() {
  const container = document.getElementById('proposalList');
  if (!container) return;
  try {
    const lcd = typeof CONFIG !== 'undefined' ? CONFIG.lcd : getLCD();
    // 尝试 v1beta1，失败再 v1
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
        const list = data.proposals || [];
        proposals = list.map(p => normalizeProposal(p));
        break;
      } catch (e) { err = e.message; }
    }
    if (!proposals.length) {
      const emptyText = typeof t === 'function' ? t('proposal.listEmpty') : '暂无提案';
      container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">${emptyText}${err ? '<br><span style="font-size:11px;">(' + err + ')</span>' : ''}</p>`;
      return;
    }
    proposals.sort((a, b) => Number(b.proposal_id || b.id || 0) - Number(a.proposal_id || a.id || 0));
    container.innerHTML = proposals.map(p => {
      const st = statusLabel(p.status);
      const time = p.submit_time || p.submitTime || '';
      const deposit = formatDeposit(p.total_deposit || p.totalDeposit || []);
      const statusBadge = `<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;${
        st.cls === 'success' ? 'background:rgba(82,196,26,.15);color:#52c41a;' :
        st.cls === 'danger' ? 'background:rgba(255,77,79,.15);color:#ff4d4f;' :
        st.cls === 'primary' ? 'background:rgba(88,101,242,.2);color:var(--primary);' :
        'background:rgba(250,173,20,.15);color:#faad14;'
      }">${st.label}</span>`;
      const title = (p.content && (p.content.title || (typeof p.content === 'string' ? '' : (JSON.parse(p.content.value ? atobPolyfill(p.content.value) : '{}').title)))) || p.proposal_id || p.id || '# Proposal';
      return `
        <div style="border-left:3px solid ${st.cls==='success'?'#52c41a':st.cls==='danger'?'#ff4d4f':st.cls==='primary'?'var(--primary)':'#faad14'};background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div style="font-weight:700;">#${p.proposal_id || p.id || '?'}</div>
            ${statusBadge}
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlSafe(title)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);">
            <span>💰 ${deposit}</span>
            <span>📅 ${time ? formatTimeSafe(time) : '-'}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:10px;">加载失败：${escapeHtmlSafe(e.message)}</p>`;
  }
}

function normalizeProposal(p) {
  // v1beta1: proposal_id, content Any (typeUrl, value), status (number), total_deposit, submit_time
  // v1: id, messages, status (enum string eg "PROPOSAL_STATUS_VOTING_PERIOD"), total_deposit, submit_time
  const out = {
    proposal_id: p.proposal_id || p.id,
    status: typeof p.status === 'number' ? p.status : statusStrToNum(p.status),
    total_deposit: p.total_deposit || [],
    submit_time: p.submit_time || '',
    content: p.content || null,
  };
  return out;
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

function atobPolyfill(s) {
  try { return typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); }
  catch (e) { return '{}'; }
}
function escapeHtmlSafe(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

async function submitProposal() {
  if (typeof state !== 'undefined' && !state.connected) {
    showStatus('proposalStatus', typeof t === 'function' ? t('proposal.connectFirst') : '请先连接钱包', 'warning');
    return;
  }
  if (typeof state !== 'undefined' && !state.connected) return;
  const titleEl = document.getElementById('proposalTitle');
  const descEl = document.getElementById('proposalDesc');
  const depositEl = document.getElementById('proposalDeposit');
  const btn = document.getElementById('proposalSubmitBtn');
  if (!titleEl || !descEl || !depositEl) return;

  const title = titleEl.value.trim();
  const desc = descEl.value.trim();
  const depositNum = parseFloat(depositEl.value) || 0;
  const cfg = govConfig();
  const feeNum = Number(cfg.submitFee) || 0;

  if (!title || !desc) {
    showStatus('proposalStatus', typeof t === 'function' ? t('proposal.emptyFields') : '请填写提案标题和描述', 'warning');
    return;
  }
  if (depositNum <= 0) {
    showStatus('proposalStatus', typeof t === 'function' ? t('proposal.invalidDeposit') : '押金必须大于 0', 'warning');
    return;
  }

  const confirmMsg = (typeof t === 'function' ? t('proposal.confirmSubmit') : '确认支付 {fee} PAXI 手续费 + {deposit} PAXI 押金提交提案？押金如通过将退还给您。')
    .replace('{fee}', feeNum).replace('{deposit}', depositNum);
  if (!confirm(confirmMsg)) return;

  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${typeof t === 'function' ? t('proposal.submitting') : '提交中...'}`;
  showStatus('proposalStatus', (typeof t === 'function' ? t('common.loading') : '加载中...'), 'info');

  try {
    const denom = CONFIG.denom;
    const proposer = state.wallet.address;

    // 1) 构造 TextProposal 内容 (Any)
    const contentAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: GOV_TYPE_URL.text,
      value: PaxiCosmJS.TextProposal.encode({ title, description: desc }).finish(),
    });

    // 2) 构造 MsgSubmitProposal（押金 upaxi）
    const depositMicro = paxiToUpaxi(depositNum.toFixed(6));
    const submitMsg = PaxiCosmJS.MsgSubmitProposal.fromPartial({
      content: contentAny,
      initialDeposit: [{ denom, amount: depositMicro }],
      proposer,
    });
    const submitMsgAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
      value: PaxiCosmJS.MsgSubmitProposal.encode(submitMsg).finish(),
    });

    const messages = [submitMsgAny];

    // 3) 平台手续费转给 feeCollector
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

    const res = await buildSignAndBroadcast(messages, `Paxi Toolbox Gov Proposal: ${title.substring(0, 40)}`, null, state.wallet);
    const txHash = res && res.txhash;
    showStatus('proposalStatus', `📡 已广播，等待确认 (tx: ${txHash ? txHash.slice(0,12)+'...' : '-'})`, 'info');

    // 轮询确认，提取 proposal_id (events: submit_proposal.proposal_id)
    let proposalId = null;
    if (typeof pollTxStatus === 'function' && txHash) {
      try {
        const info = await pollTxStatus(txHash, 25);
        if (info && info.events) {
          for (const ev of info.events) {
            if (ev.type === 'submit_proposal' && ev.attributes) {
              for (const attr of ev.attributes) {
                const k = attr.key ? (typeof atob === 'function' ? atob(attr.key) : attr.key) : attr.key;
                const v = attr.value ? (typeof atob === 'function' ? atob(attr.value) : attr.value) : attr.value;
                if (k === 'proposal_id') { proposalId = v; break; }
              }
            }
            if (proposalId) break;
          }
        }
      } catch (e) { /* ignore polling error */ }
    }

    const okText = (typeof t === 'function' ? t('proposal.success') : '✅ 提案提交成功！提案 ID：') + (proposalId || '（已上链，请在下方列表查看）');
    showStatus('proposalStatus', okText, 'success');
    showToast(okText, 'success');
    setTimeout(loadProposalList, 2500);
  } catch (e) {
    console.error(e);
    let msg = (typeof t === 'function' ? t('proposal.fail') : '❌ 提案提交失败：') + (e.message || String(e));
    if (typeof mapError === 'function') msg = (typeof t === 'function' ? t('proposal.fail') : '❌ 提案提交失败：') + mapError(e);
    showStatus('proposalStatus', msg, 'error');
    showToast(msg, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

window.TOOL_REGISTRY['proposal'] = { render: renderProposal, bind: bindProposalEvents, onMount: bindProposalEvents };
