TOOL_REGISTRY['redelegate'] = { render: renderRedelegate, onMount: loadRedelegateData };

function renderRedelegate() {
  return `
    <div class="card">
      <div class="card-title">${t('redelegate.title')}</div>
      <div class="tool-desc">${t('redelegate.desc')}</div>
      <div class="info-box">
        <strong>💡 ${t('redelegate.hint')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">📊 手续费：&lt;50,000 PAXI 按 0.2%，≥50,000 PAXI 按 0.18%</span>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.from')}</label>
        <select id="rdFrom" onchange="updateRdPreview()">
          <option value="">${t('redelegate.selectFrom')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('redelegate.to')}</label>
        <select id="rdTo" onchange="updateRdPreview()">
          <option value="">${t('redelegate.selectTo')}</option>
        </select>
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

async function loadRedelegateData() {
  if (!state.connected) {
    showToast(t('common.connectFirst'), 'error');
    return;
  }
  try {
    const address = state.wallet.address;
    // 并行请求：委托数据（实时）+ 验证人列表（缓存 60 秒）
    const [delData, valData] = await Promise.all([
      fetchAPI(`/cosmos/staking/v1beta1/delegations/${address}`),
      fetchAPIWithCache(
        '/cosmos/staking/v1beta1/validators?pagination.limit=200',
        'paxi_validators_cache',
        60000
      ),
    ]);
    const delegations = delData.delegation_responses || [];
    if (delegations.length === 0) {
      document.getElementById('rdFrom').innerHTML = `<option value="">${t('redelegate.noDelegations')}</option>`;
      return;
    }
    const validators = valData.validators || [];
    const valMap = {};
    validators.forEach(v => { valMap[v.operator_address] = v; });

    const fromSelect = document.getElementById('rdFrom');
    const toSelect = document.getElementById('rdTo');
    fromSelect.innerHTML = `<option value="">${t('redelegate.selectFrom')}</option>`;
    toSelect.innerHTML = `<option value="">${t('redelegate.selectTo')}</option>`;

    for (const d of delegations) {
      const val = valMap[d.delegation.validator_address];
      const label = val ? `${val.description?.moniker || 'Unknown'} (${(parseInt(d.balance.amount)/1e6).toFixed(2)} PAXI)` : d.delegation.validator_address.slice(0,12);
      fromSelect.innerHTML += `<option value="${d.delegation.validator_address}" data-amount="${parseInt(d.balance.amount)/1e6}">${label}</option>`;
    }
    for (const v of validators) {
      const commission = parseFloat(v.commission?.commission_rates?.rate || 0) * 100;
      toSelect.innerHTML += `<option value="${v.operator_address}">${v.description?.moniker || 'Unknown'} (${commission.toFixed(1)}%)</option>`;
    }
  } catch (e) {
    console.error('加载质押数据失败:', e);
    showToast(e.message, 'error');
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
    if (amount < 50000) {
      feeRate = 0.002;
    } else {
      feeRate = 0.0018;
    }
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
  if (amount < 50000) {
    feeRate = 0.002;
  } else {
    feeRate = 0.0018;
  }
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
