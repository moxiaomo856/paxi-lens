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
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" id="rdVerifyBtn" onclick="verifyNodes()" style="min-height:44px;">🔍 ${t('redelegate.verifyNodes')}</button>
          <span id="rdVerifyStatus" style="font-size:12px;color:var(--text-muted);"></span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.from')} <span id="rdFromLoading" style="font-size:11px;color:var(--primary);"></span></label>
        <select id="rdFrom" onchange="updateRdPreview()" ${!state.connected ? 'disabled' : ''}>
          <option value="">${state.connected ? '⏳ 加载中...' : t('redelegate.selectFrom')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.to')} <span id="rdToLoading" style="font-size:11px;color:var(--primary);">⏳ 加载中...</span></label>
        <select id="rdTo" onchange="updateRdPreview()">
          <option value="">⏳ 加载中...</option>
        </select>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <button class="btn btn-outline btn-xs" id="rdRetryValidators" onclick="loadValidatorsOnly()" style="display:none;font-size:11px;padding:4px 8px;min-height:28px;">🔄 重试验证人列表</button>
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
  const fromSel = document.getElementById('rdFrom');
  const fromLoading = document.getElementById('rdFromLoading');
  const toLoading = document.getElementById('rdToLoading');
  if (!fromSel) return;

  // ====== 1) 验证人列表（目标节点）：公开链上数据，不依赖钱包，进入即加载 ======
  // 与「验证节点对比」同源接口，点开即可用，无需先连钱包
  try {
    const cachedVal = localStorage.getItem('paxi_validators_cache');
    if (cachedVal) {
      const validators = (JSON.parse(cachedVal).data?.validators || []);
      if (validators.length > 0) {
        populateToSelect(validators);
        if (toLoading) toLoading.textContent = '✅ 缓存已载入，刷新中...';
      }
    }
  } catch (_) {}
  loadValidatorsOnly();

  // ====== 2) 当前委托（当前质押节点）：需要钱包地址 ======
  if (!state.connected) {
    if (fromLoading) { fromLoading.textContent = t('redelegate.needWallet'); fromLoading.style.color = 'var(--text-muted)'; }
    if (fromSel) fromSel.innerHTML = `<option value="">${t('redelegate.selectFrom')}</option>`;
    return;
  }
  // 立刻填充本地乐观缓存（如果有），0ms 响应
  try {
    const cachedDel = localStorage.getItem('paxi_my_delegations_cache');
    if (cachedDel) {
      const delegations = (JSON.parse(cachedDel).data?.delegation_responses || []);
      if (delegations.length > 0) {
        populateFromSelect(delegations, null, ' (本地缓存)');
        if (fromLoading) fromLoading.textContent = '✅ 缓存已载入，刷新中...';
      }
    }
  } catch (_) {}
  loadDelegationsOnly(state.wallet.address);
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

async function verifyNodes() {
  // 验证人列表属于公开链上数据，不依赖钱包连接，未连钱包也可加载
  const btn = document.getElementById('rdVerifyBtn');
  const status = document.getElementById('rdVerifyStatus');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ' + t('redelegate.verifying'); }
  if (status) { status.textContent = t('redelegate.verifying'); status.style.color = 'var(--text-muted)'; }
  try {
    await loadValidatorsOnly();
    const toSel = document.getElementById('rdTo');
    const count = toSel ? Math.max(0, toSel.options.length - 1) : 0;
    if (count > 0) {
      if (status) { status.textContent = '✅ ' + t('redelegate.verifyDone').replace('{count}', count); status.style.color = 'var(--success)'; }
      showToast('✅ 验证人列表已加载，可直接选择目标节点', 'success');
    } else {
      if (status) { status.textContent = '⚠️ 未加载到节点，请重试'; status.style.color = 'var(--warning)'; }
      showToast('⚠️ 暂未加载到节点，请重试', 'error');
    }
  } catch (e) {
    if (status) { status.textContent = '❌ 验证失败：' + (e?.message || e); status.style.color = 'var(--danger)'; }
    showToast('❌ 验证节点失败：' + (e?.message || e), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🔍 ' + t('redelegate.verifyNodes'); }
  }
}

async function loadValidatorsOnly() {
  const toSel = document.getElementById('rdTo');
  const toLoading = document.getElementById('rdToLoading');
  const retryBtn = document.getElementById('rdRetryValidators');
  try {
    if (retryBtn) retryBtn.style.display = 'none';
    // 与「验证节点对比」同源接口：/cosmos/staking/v1beta1/validators
    // 先取「已绑定」节点（可直接作为迁移目标），失败/为空则回退到全量列表
    let raw = [];
    try {
      const valData = await withTimeout(
        fetchAPIWithCache(
          '/cosmos/staking/v1beta1/validators?pagination.limit=100&status=BOND_STATUS_BONDED',
          'paxi_validators_cache',
          60000
        ),
        10000,
        '加载验证人列表'
      );
      raw = valData.validators || [];
    } catch (_) {
      raw = [];
    }
    if (raw.length === 0) {
      const fallback = await withTimeout(
        fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100'),
        10000,
        '加载验证人列表'
      );
      raw = fallback.validators || [];
    }
    // 仅保留可作为迁移目标的节点：已绑定且未被关押
    const usable = raw.filter(v => v.status === 'BOND_STATUS_BONDED' && !v.jailed);
    const list = usable.length > 0 ? usable : raw;
    populateToSelect(list);
    // 验证人回来后，重新 populate from（补全 moniker，之前可能只有缓存的）
    const valMap = {};
    list.forEach(v => { valMap[v.operator_address] = v; });
    try {
      const cachedDel = localStorage.getItem('paxi_my_delegations_cache');
      if (cachedDel) {
        const delegations = (JSON.parse(cachedDel).data?.delegation_responses || []);
        if (delegations.length > 0) {
          const currentFrom = document.getElementById('rdFrom')?.value;
          populateFromSelect(delegations, valMap, '');
          if (currentFrom) document.getElementById('rdFrom').value = currentFrom;
        }
      }
    } catch (_) {}
    if (toLoading) toLoading.textContent = list.length > 0 ? '' : '⚠️ 未加载到节点';
  } catch (e) {
    console.error('[Redelegate] 验证人列表失败:', e);
    if (toSel && toSel.options.length <= 1 && toSel.options[0]?.textContent?.includes('加载中')) {
      toSel.innerHTML = `<option value="">❌ 加载失败：${e.message}</option>`;
    }
    if (toLoading) toLoading.innerHTML = `<span style="color:var(--danger);">❌ ${e.message}</span>`;
    if (retryBtn) retryBtn.style.display = 'inline-flex';
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
      showStatus('rdStatus', `${t('redelegate.success')} TxHash: ${result.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(result.txhash);
      showToast(`✅ 迁移成功！手续费 ${fee.toFixed(4)} PAXI`, 'success');
    } else {
      showStatus('rdStatus', `${t('redelegate.fail')} ${mapError(result.code, result.rawLog)}`, 'error');
    }
  } catch (e) {
    showStatus('rdStatus', `${t('redelegate.fail')} ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = t('redelegate.execute');
  }
}
