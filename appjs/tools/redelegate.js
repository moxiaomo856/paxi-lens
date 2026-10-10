// 防重复提交：记录上一次提交的「源→目标,数量」签名与结果，拦截完全相同的失败重发（避免重复扣手续费）
let rdLastSig = '';
let rdLastFailed = false;

TOOL_REGISTRY['redelegate'] = { render: renderRedelegate, onMount: loadRedelegateData };

function renderRedelegate() {
  return `
    <div class="card">
      <div class="card-title">${t('redelegate.title')}</div>
      <div class="tool-desc">${t('redelegate.desc')}</div>
      <div class="info-box">
        <strong>💡 ${t('redelegate.hint')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">📊 手续费：统一 0.15%（千分之 1.5）</span>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.from')} <span id="rdFromLoading" style="font-size:11px;color:var(--primary);"></span></label>
        <select id="rdFrom" onchange="updateRdPreview()" ${!state.connected ? 'disabled' : ''}>
          <option value="">${state.connected ? '⏳ 加载中...' : t('redelegate.selectFrom')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.to')} <span id="rdToLoading" style="font-size:11px;color:var(--primary);"></span></label>
        <select id="rdTo" onchange="updateRdPreview()">
          <option value="">${t('redelegate.selectTo')}</option>
        </select>
        <div style="display:flex;gap:8px;margin-top:6px;align-items:center;">
          <button class="btn btn-outline btn-sm" id="rdLoadValidatorsBtn" onclick="loadValidatorsManually()" style="min-height:38px;">🔍 加载验证节点</button>
          <span id="rdToStatus" style="font-size:11px;color:var(--text-muted);"></span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.amount')}</label>
        <div style="display:flex;gap:8px;">
          <input type="number" id="rdAmount" placeholder="0" step="0.000001" min="0" oninput="updateRdPreview()">
          <button class="btn btn-outline btn-sm" onclick="setMaxRedelegate()" style="min-height:44px;">${t('redelegate.max')}</button>
        </div>
      </div>
      <div id="rdPreview" style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:16px;display:none;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span>${t('redelegate.feeRate')}</span>
          <span id="rdFeeRateDisplay" style="color:var(--primary);font-weight:600;">-</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px;">
          <span>${t('redelegate.fee')}</span>
          <span id="rdFeeDisplay" style="color:var(--primary);font-weight:600;">-</span>
        </div>
      </div>
      <div style="margin:0 0 12px;padding:8px 12px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;font-size:12px;color:#ffd700;line-height:1.6;">
        ${t('disclaimer.redelegate')}
      </div>
      <button class="btn btn-success btn-block" id="btnRedelegate" onclick="executeRedelegate()">
        ${t('redelegate.execute')}
      </button>
      <div class="status-msg" id="rdStatus"></div>
    </div>
  `;
}

async function withTimeout(promise, ms, name) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(`${name || '请求'}超时（${(ms/1000).toFixed(0)}秒），可点击重试按钮`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function loadRedelegateData() {
  // 验证人列表由用户点击"加载验证节点"按钮触发（不依赖钱包，避免未连接时卡在"加载中"）
  // 当前质押节点（from）需要钱包授权，仅已连接时自动加载
  if (!state.connected) return;
  const address = state.wallet.address;
  loadDelegationsOnly(address);
}

async function loadDelegationsOnly(address) {
  if (!address && state.wallet) address = state.wallet.address;
  if (!address) return;
  const fromSel = document.getElementById('rdFrom');
  const fromLoading = document.getElementById('rdFromLoading');
  try {
    const cacheKey = 'paxi_my_delegations_cache';
    const delData = await withTimeout(
      fetchAPI(`/cosmos/staking/v1beta1/delegations/${address}`),
      8000,
      '查询您的委托'
    );
    const delegations = delData.delegation_responses || [];
    // 写入缓存（30秒 TTL）
    try { localStorage.setItem(cacheKey, JSON.stringify({ data: delData, ts: Date.now() })); } catch (_) {}

    // 并行读取验证人缓存（需要显示 moniker）
    let valMap = {};
    try {
      const cachedVal = localStorage.getItem('paxi_validators_cache');
      if (cachedVal) {
        const validators = (JSON.parse(cachedVal).data?.validators || []);
        validators.forEach(v => { valMap[v.operator_address] = v; });
      }
    } catch (_) {}

    populateFromSelect(delegations, valMap, '');
    if (fromLoading) fromLoading.textContent = '';
  } catch (e) {
    console.error('[Redelegate] 委托加载失败:', e);
    if (fromSel && fromSel.options.length <= 1 && fromSel.options[0]?.textContent?.includes('加载中')) {
      fromSel.innerHTML = `<option value="">❌ 加载失败：${e.message}，请重试</option>`;
    }
    if (fromLoading) fromLoading.innerHTML = `<span style="color:var(--danger);">❌ ${e.message}</span>`;
  }
}

async function loadValidatorsManually() {
  const btn = document.getElementById('rdLoadValidatorsBtn');
  const status = document.getElementById('rdToStatus');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> 加载中...'; }
  if (status) { status.textContent = '⏳ 正在加载验证节点...'; status.style.color = 'var(--text-muted)'; }
  try {
    // 主接口：直接按「已绑定」过滤，一次返回全部活跃验证节点（避免 limit=100 截断漏掉）
    // 实测主网：bonded 共 20 个、0 个被关押，未绑定节点远超 100 会被分页截断，故必须用 bonded 过滤
    let all = [];
    try {
      const data = await withTimeout(
        fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100&status=BOND_STATUS_BONDED'),
        12000,
        '加载验证节点'
      );
      all = data.validators || [];
    } catch (_) {
      all = [];
    }
    // 兜底：若 bonded 过滤失败，退回全量列表再客户端过滤（仍可能因分页截断不全）
    if (all.length === 0) {
      const fallback = await withTimeout(
        fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100'),
        12000,
        '加载验证节点'
      );
      all = fallback.validators || [];
    }
    const validators = all.filter(v => v.status === 'BOND_STATUS_BONDED' && !v.jailed);
    populateToSelect(validators);
    // 回填 from 的 moniker（若有本地委托缓存）
    try {
      const cachedDel = localStorage.getItem('paxi_my_delegations_cache');
      if (cachedDel) {
        const delegations = (JSON.parse(cachedDel).data?.delegation_responses || []);
        if (delegations.length > 0) {
          const valMap = {};
          validators.forEach(v => { valMap[v.operator_address] = v; });
          const currentFrom = document.getElementById('rdFrom')?.value;
          populateFromSelect(delegations, valMap, '');
          if (currentFrom) document.getElementById('rdFrom').value = currentFrom;
        }
      }
    } catch (_) {}
    if (status) { status.textContent = `✅ 已加载 ${validators.length} 个验证节点`; status.style.color = 'var(--success)'; }
    showToast(`✅ 已加载 ${validators.length} 个验证节点`, 'success');
  } catch (e) {
    console.error('[Redelegate] 验证节点加载失败:', e);
    if (status) { status.textContent = '❌ 加载失败，请重试'; status.style.color = 'var(--danger)'; }
    showToast('❌ 加载验证节点失败：' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🔍 加载验证节点'; }
  }
}

function populateFromSelect(delegations, valMap, suffix) {
  const fromSel = document.getElementById('rdFrom');
  if (!fromSel) return;
  if (delegations.length === 0) {
    fromSel.innerHTML = `<option value="">${t('redelegate.noDelegations')}</option>`;
    return;
  }
  fromSel.innerHTML = `<option value="">${t('redelegate.selectFrom')}${suffix}</option>`;
  for (const d of delegations) {
    const val = valMap ? valMap[d.delegation.validator_address] : null;
    const amountPaxi = (parseInt(d.balance.amount) / 1e6).toFixed(2);
    const label = val
      ? `${val.description?.moniker || val.operator_address?.slice(0, 12)} (${amountPaxi} PAXI)`
      : `${d.delegation.validator_address.slice(0, 14)}... (${amountPaxi} PAXI)`;
    fromSel.innerHTML += `<option value="${d.delegation.validator_address}" data-amount="${(parseInt(d.balance.amount)/1e6).toFixed(6)}">${label}</option>`;
  }
}

function populateToSelect(validators) {
  const toSel = document.getElementById('rdTo');
  if (!toSel) return;
  toSel.innerHTML = `<option value="">${t('redelegate.selectTo')}</option>`;
  // 按质押量降序（活跃节点排前面）+ 佣金过滤掉过高的
  const sorted = [...validators].sort((a, b) => {
    const aTok = parseInt(a.tokens || 0);
    const bTok = parseInt(b.tokens || 0);
    return bTok - aTok;
  });
  for (const v of sorted) {
    const commission = parseFloat(v.commission?.commission_rates?.rate || 0) * 100;
    const moniker = v.description?.moniker || v.operator_address.slice(0, 12);
    const tokens = (parseInt(v.tokens || 0) / 1e6).toFixed(0);
    toSel.innerHTML += `<option value="${v.operator_address}">${moniker} · ${commission.toFixed(1)}% · ${tokens.toLocaleString()} PAXI 质押</option>`;
  }
}

function updateRdPreview() {
  const from = document.getElementById('rdFrom').value;
  const to = document.getElementById('rdTo').value;
  const amount = parseFloat(document.getElementById('rdAmount').value) || 0;
  const preview = document.getElementById('rdPreview');
  if (from && to && amount > 0) {
    preview.style.display = 'block';
    let feeRate, fee;
    feeRate = 0.0015;
    fee = amount * feeRate;
    document.getElementById('rdFeeRateDisplay').textContent = (feeRate * 100).toFixed(2) + '%';
    document.getElementById('rdFeeDisplay').textContent = fee.toFixed(4) + ' PAXI';
  } else {
    preview.style.display = 'none';
  }
}

function setMaxRedelegate() {
  const from = document.getElementById('rdFrom').value;
  if (!from) return;
  const option = document.querySelector(`#rdFrom option[value="${from}"]`);
  if (option) {
    const max = parseFloat(option.dataset.amount) || 0;
    document.getElementById('rdAmount').value = max;
    updateRdPreview();
  }
}

async function executeRedelegate() {
  if (!state.connected) {
    showToast(t('common.connectFirst'), 'error');
    return;
  }
  const from = document.getElementById('rdFrom').value;
  const to = document.getElementById('rdTo').value;
  const amount = parseFloat(document.getElementById('rdAmount').value);
  if (!from || !to || !amount || amount <= 0) {
    showStatus('rdStatus', t('redelegate.invalidInput'), 'warning');
    return;
  }

  // 防重复提交：同一笔（源→目标, 数量）已经失败过，则直接拦截，避免重复扣手续费
  const rdSig = `${from}->${to}:${amount}`;
  if (rdLastSig === rdSig && rdLastFailed) {
    showStatus('rdStatus', '⚠️ 已提交过完全相同的交易且失败过，已自动拦截重复提交。此类错误（如"重新委托进行中"）重试无效，只会重复扣除手续费。请更换节点或数量后再试。', 'warning');
    showToast('⚠️ 相同交易已失败过，已拦截重复提交', 'error');
    return;
  }

  let feeRate, fee;
  feeRate = 0.0015;
  fee = amount * feeRate;
  if (fee < 0.000001) fee = 0.000001;

  const btn = document.getElementById('btnRedelegate');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${t('common.sending')}`;
  try {
    const denom = CONFIG.denom;
    const amountMicro = (amount * 1e6).toFixed(0);
    const feeMicro = (fee * 1e6).toFixed(0);

    const redelegateMsg = {
      delegator_address: state.wallet.address,
      validator_src_address: from,
      validator_dst_address: to,
      amount: { denom, amount: amountMicro }
    };
    const msgAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value: PaxiCosmJS.MsgBeginRedelegate.encode(redelegateMsg).finish(),
    });

    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [{ denom, amount: feeMicro }]
    });
    const feeAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    });

    const messages = [msgAny, feeAny];
    const memo = `Paxi Toolbox Redelegate (${amount} PAXI) Fee: ${fee.toFixed(4)} PAXI`;
    const broadcastRes = await buildSignAndBroadcast(messages, memo, null, state.wallet);
    const result = checkTxResult(broadcastRes);
    if (result.ok) {
      rdLastSig = rdSig; rdLastFailed = false;
      showStatus('rdStatus', `${t('redelegate.success')} TxHash: ${result.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(result.txhash);
      showToast(`✅ 迁移成功！手续费 ${fee.toFixed(4)} PAXI`, 'success');
    } else {
      rdLastSig = rdSig; rdLastFailed = true;
      // 确定性业务错误（如 code 32 重新委托进行中）重试无效，给出醒目提示
      const detail = mapError(result.code, result.rawLog);
      const hint = (result.code === 32)
        ? '（链上规则：同一路径的重新委托正在处理，需等待其完成后再操作；重复提交只会重复扣手续费，不会成功）'
        : '';
      showStatus('rdStatus', `${t('redelegate.fail')} ${detail}${hint}`, 'error');
    }
  } catch (e) {
    rdLastSig = rdSig; rdLastFailed = true;
    showStatus('rdStatus', `${t('redelegate.fail')} ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = t('redelegate.execute');
  }
}
