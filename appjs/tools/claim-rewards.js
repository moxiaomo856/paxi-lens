/* ============================================================================
 * Paxi Suite · 领取质押奖励模块（Claim Rewards）
 *  - 查询当前委托人的累计质押奖励（distribution /rewards）
 *  - 一键领取：为每个有奖励的验证节点构造 MsgWithdrawDelegatorReward
 *  - 可选「复投」：领取后立即用原 micro 金额构造 MsgDelegate 复投到同一节点
 *  - 无平台服务费，仅链上 Gas（由 buildSignAndBroadcast 处理）
 * 依赖运行期全局：state / CONFIG / fetchAPI / PaxiCosmJS / buildSignAndBroadcast
 *                / checkTxResult / mapError / pollTxStatus / currentLang
 *                / escapeHtml / showToast / showStatus / confirm
 * 说明：本模块为自包含文件，不修改核心代码；函数都声明在模块顶层，
 *       render 中通过 inline onclick="claimRewards()" 触发（与 redelegate 同模式）。
 * ==========================================================================*/

const CR_DICT = {
  zh: {
    title: '领取奖励',
    desc: '查询并一键领取你的 PAXI 质押奖励。可勾选「复投」，领取后立即把奖励重新委托到原验证节点继续生息。',
    info: '本工具仅广播领取/复投交易，不收取任何平台服务费，仅需支付链上 Gas。奖励以 upaxi（1 PAXI = 1,000,000 upaxi）计量。',
    compound: '领取后立即复投到原验证节点',
    claimBtn: '💸 一键领取',
    connectFirst: '请先连接钱包',
    noRewards: '暂无可领取的质押奖励',
    colValidator: '验证节点',
    colAmount: '可领取 (PAXI)',
    colAction: '操作',
    total: '合计可领取：',
    loading: '⏳ 正在加载质押奖励...',
    confirmMsg: (paxi, compound) =>
      `确认领取 ${paxi} PAXI 质押奖励吗？` +
      (compound ? '\n（已勾选复投：领取后将立即复投到原验证节点）' : '') +
      '\n\n点击「确定」后将在钱包中签名。',
    success: '✅ 领取成功',
    failPrefix: '❌ 领取失败：',
    sdkErr: '当前 SDK 不支持该消息类型',
    queryFail: '查询奖励失败：',
  },
  en: {
    title: 'Claim Rewards',
    desc: 'Check and claim your PAXI staking rewards in one click. Optionally enable "Compound" to re-delegate the rewards to the same validator right after claiming.',
    info: 'This tool only broadcasts claim/compound transactions and charges no platform fee — only on-chain Gas applies. Rewards are measured in upaxi (1 PAXI = 1,000,000 upaxi).',
    compound: 'Compound to same validator after claiming',
    claimBtn: 'Claim All',
    connectFirst: 'Please connect wallet',
    noRewards: 'No reclaimable staking rewards',
    colValidator: 'Validator',
    colAmount: 'Claimable (PAXI)',
    colAction: 'Action',
    total: 'Total claimable: ',
    loading: '⏳ Loading staking rewards...',
    confirmMsg: (paxi, compound) =>
      `Claim ${paxi} PAXI staking rewards?` +
      (compound ? '\n(Compound enabled: will be re-delegated to the same validator after claiming)' : '') +
      '\n\nClick OK to sign in your wallet.',
    success: '✅ Claimed successfully',
    failPrefix: 'Claim failed: ',
    sdkErr: 'SDK does not support this message type',
    queryFail: 'Failed to query rewards: ',
  }
};

const crPt = (k, ...a) => {
  const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
  let v = CR_DICT[lang][k];
  if (v === undefined) v = CR_DICT.zh[k];
  return typeof v === 'function' ? v(...a) : v;
};

const crEsc = (s) => (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);

/* 从 localStorage 'paxi_validators_cache' 构建 operator_address -> moniker 映射 */
function crLoadValidatorMap() {
  const map = {};
  try {
    const cached = localStorage.getItem('paxi_validators_cache');
    if (cached) {
      const validators = (JSON.parse(cached).data && JSON.parse(cached).data.validators) || [];
      validators.forEach(v => {
        if (v.operator_address) map[v.operator_address] = (v.description && v.description.moniker) || v.operator_address;
      });
    }
  } catch (_) { /* 缓存缺失或解析失败则退化为地址显示 */ }
  return map;
}

function renderClaimRewards() {
  return `
    <div class="card">
      <div class="card-title">${crEsc(crPt('title'))}</div>
      <div class="tool-desc">${crEsc(crPt('desc'))}</div>
      <div class="info-box">
        <strong>💡 ${crEsc(crPt('info'))}</strong>
      </div>
      <div id="crResult"></div>
      <label style="display:flex;align-items:center;gap:8px;margin:14px 0;font-size:13px;cursor:pointer;">
        <input type="checkbox" id="crCompound"> ${crEsc(crPt('compound'))}
      </label>
      <button class="btn btn-primary btn-block" onclick="claimRewards()">${crEsc(crPt('claimBtn'))}</button>
      <div class="status-msg" id="crStatus"></div>
    </div>`;
}

async function loadClaimRewards() {
  const statusEl = document.getElementById('crStatus');
  const resultEl = document.getElementById('crResult');
  if (!statusEl || !resultEl) return;

  if (!state.connected) {
    showStatus('crStatus', crPt('connectFirst'), 'warning');
    return;
  }

  const addr = state.wallet.address;
  resultEl.innerHTML = `<div style="padding:12px;color:var(--text-muted);">${crEsc(crPt('loading'))}</div>`;
  try {
    const data = await fetchAPI(`/cosmos/distribution/v1beta1/delegators/${addr}/rewards`);
    const valList = data.rewards || [];
    const totalArr = data.total || [];

    const valMap = crLoadValidatorMap();

    let totalMicro = 0;
    totalArr.forEach(t => { if (t.denom === CONFIG.denom) totalMicro += parseFloat(t.amount || 0); });
    const totalPaxi = totalMicro / 1e6;

    // 仅展示有 upaxi 奖励的节点
    const rows = [];
    valList.forEach(r => {
      let micro = 0;
      (r.reward || []).forEach(c => { if (c.denom === CONFIG.denom) micro += parseFloat(c.amount || 0); });
      if (micro <= 0) return;
      const name = valMap[r.validator_address] || (r.validator_address.slice(0, 16) + '...');
      rows.push(`<tr><td>${crEsc(name)}</td><td>${(micro / 1e6).toFixed(6)}</td><td>-</td></tr>`);
    });

    if (rows.length === 0 || totalPaxi <= 0) {
      resultEl.innerHTML = `<div style="padding:12px;color:var(--text-muted);">${crEsc(crPt('noRewards'))}</div>`;
      return;
    }

    resultEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:13px;">
        <thead>
          <tr style="color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border);">
            <th style="padding:6px 4px;">${crEsc(crPt('colValidator'))}</th>
            <th style="padding:6px 4px;">${crEsc(crPt('colAmount'))}</th>
            <th style="padding:6px 4px;">${crEsc(crPt('colAction'))}</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      <div style="text-align:right;font-weight:600;color:var(--primary);padding:4px;">
        ${crEsc(crPt('total'))} ${totalPaxi.toFixed(6)} PAXI
      </div>`;
  } catch (e) {
    console.error('[ClaimRewards] 查询失败:', e);
    showStatus('crStatus', crPt('queryFail') + e.message, 'error');
  }
}

function bindClaimRewards() {
  // 按钮使用 inline onclick="claimRewards()"，此处无需额外绑定。
}

async function claimRewards() {
  if (!state.connected) {
    showStatus('crStatus', crPt('connectFirst'), 'warning');
    return;
  }

  const btn = document.querySelector('button[onclick="claimRewards()"]');

  // 重新拉取最新奖励，确保金额精确
  let data;
  try {
    data = await fetchAPI(`/cosmos/distribution/v1beta1/delegators/${state.wallet.address}/rewards`);
  } catch (e) {
    showStatus('crStatus', crPt('queryFail') + e.message, 'error');
    return;
  }

  const valList = data.rewards || [];
  const targets = [];
  valList.forEach(r => {
    let micro = 0;
    (r.reward || []).forEach(c => { if (c.denom === CONFIG.denom) micro += parseFloat(c.amount || 0); });
    if (micro > 0) targets.push({ val: r.validator_address, micro: Math.floor(micro) });
  });

  if (targets.length === 0) {
    showStatus('crStatus', crPt('noRewards'), 'warning');
    return;
  }

  const totalMicro = targets.reduce((s, t) => s + t.micro, 0);
  const totalPaxi = (totalMicro / 1e6).toFixed(6);
  const compound = document.getElementById('crCompound') && document.getElementById('crCompound').checked;

  if (!confirm(crPt('confirmMsg', totalPaxi, compound))) return;

  if (!PaxiCosmJS || !PaxiCosmJS.MsgWithdrawDelegatorReward || !PaxiCosmJS.MsgWithdrawDelegatorReward.encode) {
    showStatus('crStatus', crPt('sdkErr'), 'error');
    return;
  }

  const msgs = [];
  for (const t of targets) {
    const wMsg = PaxiCosmJS.MsgWithdrawDelegatorReward.fromPartial({
      delegator_address: state.wallet.address,
      validator_address: t.val,
    });
    msgs.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: PaxiCosmJS.MsgWithdrawDelegatorReward.encode(wMsg).finish(),
    }));

    if (compound) {
      if (!PaxiCosmJS.MsgDelegate || !PaxiCosmJS.MsgDelegate.encode) {
        showStatus('crStatus', crPt('sdkErr'), 'error');
        return;
      }
      const dMsg = PaxiCosmJS.MsgDelegate.fromPartial({
        delegator_address: state.wallet.address,
        validator_address: t.val,
        amount: { denom: CONFIG.denom, amount: t.micro.toString() },
      });
      msgs.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: PaxiCosmJS.MsgDelegate.encode(dMsg).finish(),
      }));
    }
  }

  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ...'; }
    const memo = `Paxi Suite Claim Rewards${compound ? ' + Compound' : ''}`;
    const res = await buildSignAndBroadcast(msgs, memo, null, state.wallet);
    const r = checkTxResult(res);
    if (r.ok) {
      showStatus('crStatus', `${crPt('success')} TxHash: ${r.txhash.slice(0, 20)}...`, 'success');
      pollTxStatus(r.txhash);
      showToast(crPt('success'), 'success');
    } else {
      showStatus('crStatus', `${crPt('failPrefix')} ${mapError(r.code, r.rawLog)}`, 'error');
    }
    // 领取后刷新列表
    loadClaimRewards();
  } catch (e) {
    console.error('[ClaimRewards] 领取失败:', e);
    showStatus('crStatus', `${crPt('failPrefix')} ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = crEsc(crPt('claimBtn')); }
  }
}

window.TOOL_REGISTRY ||= {};
window.TOOL_REGISTRY['claim-rewards'] = { render: renderClaimRewards, bind: bindClaimRewards, onMount: loadClaimRewards };
