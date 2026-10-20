// ============================================================================
// Paxi Suite · 委托 / 解委托 / 解锁期 管理工具
// 依赖：PaxiCosmJS、shared.js（escapeHtml/showStatus/showToast）、core.js（state/currentLang）
// 说明：i18n 与签名逻辑全部收进本模块，使用全局函数注册到 TOOL_REGISTRY，避免命名冲突。
// ============================================================================

window.TOOL_REGISTRY ||= {};

/* ------------------------------------------------ 专用 i18n */
const SM_DICT = {
  zh: {
    title: '委托 / 解委托',
    desc: '将 PAXI 委托给验证节点赚取质押奖励，或在需要时解委托（进入约 7 天解锁期）。本工具不收取任何平台服务费。',
    info: '💡 委托后奖励按区块累积；解委托需等待约 7 天解锁期结束后资金方可动用。',
    delegateSection: '委托（新增质押）',
    undelegateSection: '解委托（解除质押）',
    unbondingSection: '解绑中（解锁期倒计时）',
    delegateBtn: '🤝 委托',
    undelegateBtn: '🔓 解委托',
    connectFirst: '请先连接钱包',
    confirmDelegate: (val, amt) => `确认委托？\n\n目标节点：${val}\n数量：${amt} PAXI\n\n点击「确定」后将在钱包中签名。`,
    confirmUndelegate: (val, amt) => `确认解委托？\n\n当前委托：${val}\n数量：${amt} PAXI\n\n⚠️ 解委托后资金将进入约 7 天解锁期，期间不可转账或使用。点击「确定」后将在钱包中签名。`,
    success: '✅ 操作成功',
    failPrefix: '❌ 失败：',
    sdkErr: '当前 SDK 不支持该消息类型',
    noDelegations: '暂无委托记录',
    loading: '加载中...',
    unbondPeriod: 'Paxi 解绑期约 7 天',
    selectValidator: '请选择验证节点',
    selectDelegation: '请选择委托',
    invalidAmt: '请输入有效数量',
    selectSource: '请先选择要解委托的当前委托',
    amountLabel: '数量（PAXI）',
    unbondComplete: '✅ 已解锁',
    days: '天', hours: '时', mins: '分', secs: '秒'
  },
  en: {
    title: 'Delegate / Undelegate',
    desc: 'Delegate PAXI to a validator to earn staking rewards, or undelegate when needed (entering a ~7-day unbonding period). This tool charges no platform fee.',
    info: '💡 Rewards accrue per block after delegation; undelegated funds are locked for ~7 days before they become usable.',
    delegateSection: 'Delegate (stake)',
    undelegateSection: 'Undelegate (unstake)',
    unbondingSection: 'Unbonding (countdown)',
    delegateBtn: 'Delegate',
    undelegateBtn: 'Undelegate',
    connectFirst: 'Please connect wallet',
    confirmDelegate: (val, amt) => `Confirm delegation?\n\nTarget validator: ${val}\nAmount: ${amt} PAXI\n\nClick "OK" to sign in your wallet.`,
    confirmUndelegate: (val, amt) => `Confirm undelegation?\n\nCurrent delegation: ${val}\nAmount: ${amt} PAXI\n\n⚠️ Undelegated funds enter a ~7-day unbonding period and cannot be transferred or used. Click "OK" to sign in your wallet.`,
    success: '✅ Success',
    failPrefix: 'Failed: ',
    sdkErr: 'SDK does not support this message type',
    noDelegations: 'No delegations',
    loading: 'Loading...',
    unbondPeriod: 'Paxi unbonding period ~7 days',
    selectValidator: 'Select validator',
    selectDelegation: 'Select delegation',
    invalidAmt: 'Enter a valid amount',
    selectSource: 'Please select the current delegation to undelegate',
    amountLabel: 'Amount (PAXI)',
    unbondComplete: '✅ Unbonded',
    days: 'd', hours: 'h', mins: 'm', secs: 's'
  }
};
const smPt = (k, ...a) => {
  const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
  let v = SM_DICT[lang][k];
  if (v === undefined) v = SM_DICT.zh[k];
  return typeof v === 'function' ? v(...a) : v;
};

/* ------------------------------------------------ 模块状态 */
let smUnbondTimer = null; // 倒计时定时器，beforeUnmount 时清理
let smDelegationMap = {}; // validator_address -> amount(PAXI)

/* ------------------------------------------------ 渲染 */
function renderStakeManage() {
  return `
    <div class="card">
      <div class="card-title">${smPt('title')}</div>
      <div class="tool-desc">${smPt('desc')}</div>
      <div class="info-box">
        <strong>${smPt('info')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">⏳ ${smPt('unbondPeriod')}</span>
      </div>

      <div class="form-group">
        <label class="form-label">${smPt('delegateSection')}</label>
        <select id="smDelVal"></select>
        <input type="number" id="smDelAmt" step="0.000001" min="0" placeholder="${smPt('amountLabel')}" style="margin-top:8px;">
        <button class="btn btn-primary btn-block" style="margin-top:8px;" onclick="doDelegate()">${smPt('delegateBtn')}</button>
      </div>

      <div class="form-group">
        <label class="form-label">${smPt('undelegateSection')}</label>
        <select id="smUndelSrc"></select>
        <input type="number" id="smUndelAmt" step="0.000001" min="0" placeholder="${smPt('amountLabel')}" style="margin-top:8px;">
        <button class="btn btn-outline btn-block" style="margin-top:8px;" onclick="doUndelegate()">${smPt('undelegateBtn')}</button>
      </div>

      <div class="form-group">
        <label class="form-label">${smPt('unbondingSection')}</label>
        <div id="smUnbonding"></div>
      </div>

      <div class="status-msg" id="smStatus"></div>
    </div>
  `;
}

/* ------------------------------------------------ 挂载 */
async function loadStakeManage() {
  const statusEl = document.getElementById('smStatus');
  if (!statusEl) return;
  if (!state.connected) {
    statusEl.textContent = smPt('connectFirst');
    statusEl.className = 'status-msg warning';
    return;
  }
  statusEl.textContent = '';
  statusEl.className = 'status-msg';

  const addr = state.wallet.address;

  // 1) 当前委托 → 解委托源
  await smLoadDelegations(addr);

  // 2) 解绑中委托 → 倒计时
  await smLoadUnbonding(addr);

  // 3) 验证节点列表（分页）
  await smLoadValidators();
}

async function smLoadDelegations(addr) {
  const sel = document.getElementById('smUndelSrc');
  if (!sel) return;
  sel.innerHTML = `<option value="">⏳ ${smPt('loading')}</option>`;
  try {
    const data = await fetchAPI(`/cosmos/staking/v1beta1/delegations/${addr}`);
    const delegations = data.delegation_responses || [];
    smDelegationMap = {};
    if (delegations.length === 0) {
      sel.innerHTML = `<option value="">${smPt('noDelegations')}</option>`;
      return;
    }
    sel.innerHTML = `<option value="">${smPt('selectDelegation')}</option>`;
    for (const d of delegations) {
      const vaddr = d.delegation.validator_address;
      const amountPaxi = (parseInt(d.balance.amount) / 1e6).toFixed(2);
      smDelegationMap[vaddr] = (parseInt(d.balance.amount) / 1e6);
      let moniker = vaddr.slice(0, 14);
      try {
        const cached = localStorage.getItem('paxi_validators_cache');
        if (cached) {
          const vals = (JSON.parse(cached).data?.validators || []);
          const v = vals.find(x => x.operator_address === vaddr);
          if (v && v.description?.moniker) moniker = v.description.moniker;
        }
      } catch (_) {}
      const label = `${moniker} (${amountPaxi} PAXI)`;
      sel.innerHTML += `<option value="${vaddr}">${label}</option>`;
    }
  } catch (e) {
    console.error('[StakeManage] 委托加载失败:', e);
    sel.innerHTML = `<option value="">❌ ${escapeHtml(e.message)}</option>`;
  }
}

async function smLoadUnbonding(addr) {
  const box = document.getElementById('smUnbonding');
  if (!box) return;
  box.innerHTML = `<div style="font-size:11px;color:var(--text-muted);">⏳ ${smPt('loading')}</div>`;
  try {
    const data = await fetchAPI(`/cosmos/staking/v1beta1/delegators/${addr}/unbonding_delegations`);
    const responses = data.unbonding_responses || [];
    if (responses.length === 0) {
      box.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">${smPt('noDelegations')}</div>`;
      return;
    }
    box.innerHTML = '';
    for (const r of responses) {
      const vaddr = r.validator_address;
      for (const e of (r.entries || [])) {
        const amountPaxi = (parseInt(e.balance) / 1e6).toFixed(2);
        const comp = e.completion_time;
        const row = document.createElement('div');
        row.style.cssText = 'padding:8px 10px;margin-bottom:8px;background:var(--bg);border-radius:8px;font-size:13px;';
        row.innerHTML =
          `<div><span style="color:var(--text-muted);">节点：</span>${escapeHtml(vaddr.slice(0, 14))}…</div>` +
          `<div><span style="color:var(--text-muted);">金额：</span>${amountPaxi} PAXI</div>` +
          `<div class="sm-countdown" data-comp="${escapeHtml(comp)}" style="color:var(--primary);font-weight:600;margin-top:4px;"></div>`;
        box.appendChild(row);
      }
    }
    smStartCountdown();
  } catch (e) {
    console.error('[StakeManage] 解绑加载失败:', e);
    box.innerHTML = `<div style="font-size:12px;color:var(--danger);">❌ ${escapeHtml(e.message)}</div>`;
  }
}

function smStartCountdown() {
  if (smUnbondTimer) clearInterval(smUnbondTimer);
  const tick = () => {
    const nodes = document.querySelectorAll('.sm-countdown');
    if (nodes.length === 0) { clearInterval(smUnbondTimer); smUnbondTimer = null; return; }
    const now = Date.now();
    nodes.forEach(n => {
      const comp = new Date(n.dataset.comp).getTime();
      let diff = comp - now;
      if (diff <= 0) {
        n.textContent = smPt('unbondComplete');
        n.style.color = 'var(--success)';
        return;
      }
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000); diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      n.textContent = `剩余 ${d} ${smPt('days')} ${h} ${smPt('hours')} ${m} ${smPt('mins')} ${s} ${smPt('secs')}`;
    });
  };
  tick();
  smUnbondTimer = setInterval(tick, 1000);
}

async function smLoadValidators() {
  const sel = document.getElementById('smDelVal');
  if (!sel) return;
  sel.innerHTML = `<option value="">⏳ ${smPt('loading')}</option>`;
  try {
    let all = [];
    let nextKey = null;
    for (let page = 0; page < 6; page++) {
      const q = nextKey
        ? `/cosmos/staking/v1beta1/validators?pagination.limit=100&pagination.key=${encodeURIComponent(nextKey)}`
        : '/cosmos/staking/v1beta1/validators?pagination.limit=100';
      const data = await fetchAPI(q);
      const list = data.validators || [];
      all = all.concat(list);
      nextKey = data.pagination?.next_key || null;
      if (!nextKey || list.length === 0) break;
    }
    if (all.length === 0) throw new Error('未获取到验证节点数据');
    try { localStorage.setItem('paxi_validators_cache', JSON.stringify({ data: { validators: all }, ts: Date.now() })); } catch (_) {}

    const rank = v => (v.status === 'BOND_STATUS_BONDED' && !v.jailed) ? 0 : 1;
    const sorted = [...all].sort((a, b) => {
      const ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return parseInt(b.tokens || 0) - parseInt(a.tokens || 0);
    });
    sel.innerHTML = `<option value="">${smPt('selectValidator')}</option>`;
    for (const v of sorted) {
      const commission = (parseFloat(v.commission?.commission_rates?.rate || 0) * 100).toFixed(1);
      const moniker = v.description?.moniker || v.operator_address.slice(0, 12);
      const active = (v.status === 'BOND_STATUS_BONDED' && !v.jailed);
      const suffix = active ? '' : ' ⚠️非活跃';
      sel.innerHTML += `<option value="${v.operator_address}">${moniker} · ${commission}%${suffix}</option>`;
    }
  } catch (e) {
    console.error('[StakeManage] 验证节点加载失败:', e);
    sel.innerHTML = `<option value="">❌ ${escapeHtml(e.message)}</option>`;
  }
}

/* ------------------------------------------------ 委托 */
async function doDelegate() {
  if (!state.connected) { showToast(smPt('connectFirst'), 'error'); return; }
  const sel = document.getElementById('smDelVal').value;
  const amt = parseFloat(document.getElementById('smDelAmt').value);
  const statusEl = document.getElementById('smStatus');
  if (!sel) { showStatus('smStatus', smPt('selectValidator'), 'warning'); return; }
  if (!amt || amt <= 0) { showStatus('smStatus', smPt('invalidAmt'), 'warning'); return; }

  if (!confirm(smPt('confirmDelegate', sel, amt.toFixed(6)))) return;

  statusEl.textContent = '⏳ 签名广播中...';
  statusEl.className = 'status-msg';
  try {
    if (typeof PaxiCosmJS.MsgDelegate === 'undefined') throw new Error(smPt('sdkErr'));
    const amountMicro = (amt * 1e6).toFixed(0);
    const m = PaxiCosmJS.MsgDelegate.fromPartial({
      delegator_address: state.wallet.address,
      validator_address: sel,
      amount: { denom: CONFIG.denom, amount: amountMicro }
    });
    const anyMsg = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: PaxiCosmJS.MsgDelegate.encode(m).finish()
    });
    const res = await buildSignAndBroadcast([anyMsg], 'Paxi Suite Delegate', null, state.wallet);
    const r = checkTxResult(res);
    if (r.ok) {
      showStatus('smStatus', `${smPt('success')} TxHash: ${r.txhash.slice(0, 20)}...`, 'success');
      pollTxStatus(r.txhash);
      showToast(smPt('success'), 'success');
      await smLoadDelegations(state.wallet.address);
    } else {
      showStatus('smStatus', smPt('failPrefix') + mapError(r.code, r.rawLog), 'error');
    }
  } catch (e) {
    showStatus('smStatus', smPt('failPrefix') + e.message, 'error');
  }
}

/* ------------------------------------------------ 解委托 */
async function doUndelegate() {
  if (!state.connected) { showToast(smPt('connectFirst'), 'error'); return; }
  const sel = document.getElementById('smUndelSrc').value;
  const amt = parseFloat(document.getElementById('smUndelAmt').value);
  const statusEl = document.getElementById('smStatus');
  if (!sel) { showStatus('smStatus', smPt('selectSource'), 'warning'); return; }
  if (!amt || amt <= 0) { showStatus('smStatus', smPt('invalidAmt'), 'warning'); return; }

  if (!confirm(smPt('confirmUndelegate', sel, amt.toFixed(6)))) return;

  statusEl.textContent = '⏳ 签名广播中...';
  statusEl.className = 'status-msg';
  try {
    if (typeof PaxiCosmJS.MsgUndelegate === 'undefined') throw new Error(smPt('sdkErr'));
    const amountMicro = (amt * 1e6).toFixed(0);
    const m = PaxiCosmJS.MsgUndelegate.fromPartial({
      delegator_address: state.wallet.address,
      validator_address: sel,
      amount: { denom: CONFIG.denom, amount: amountMicro }
    });
    const anyMsg = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
      value: PaxiCosmJS.MsgUndelegate.encode(m).finish()
    });
    const res = await buildSignAndBroadcast([anyMsg], 'Paxi Suite Undelegate', null, state.wallet);
    const r = checkTxResult(res);
    if (r.ok) {
      showStatus('smStatus', `${smPt('success')} TxHash: ${r.txhash.slice(0, 20)}...`, 'success');
      pollTxStatus(r.txhash);
      showToast(smPt('success'), 'success');
      await smLoadDelegations(state.wallet.address);
      await smLoadUnbonding(state.wallet.address);
    } else {
      showStatus('smStatus', smPt('failPrefix') + mapError(r.code, r.rawLog), 'error');
    }
  } catch (e) {
    showStatus('smStatus', smPt('failPrefix') + e.message, 'error');
  }
}

/* ------------------------------------------------ 绑定 / 清理 */
function bindStakeManage() {
  // 当前交互均通过 onclick 内联触发；如外壳提供卸载钩子可在此清理定时器
}

// 若外壳支持 beforeUnmount，则清理倒计时定时器避免内存泄漏
if (typeof window.TOOL_REGISTRY !== 'undefined') {
  // beforeUnmount 由 core.js 在切换工具时调用（可选）
  const _origRegister = window.TOOL_REGISTRY['stake-manage'];
}

window.TOOL_REGISTRY['stake-manage'] = {
  render: renderStakeManage,
  bind: bindStakeManage,
  onMount: loadStakeManage,
  beforeUnmount: () => { if (smUnbondTimer) { clearInterval(smUnbondTimer); smUnbondTimer = null; } }
};
