window.TOOL_REGISTRY ||= {};

function renderTxTracker() {
  return `
    <div class="card">
      <div class="card-title">${t('txTracker.title')}</div>
      <div class="tool-desc">${t('txTracker.desc')}</div>
      <div class="form-group">
        <label class="form-label">交易哈希</label>
        <input type="text" id="txHash" placeholder="${t('txTracker.placeholder')}">
      </div>
      <button class="btn btn-primary" onclick="trackTransaction()">${t('txTracker.queryBtn')}</button>
      <div class="status-msg" id="txStatus"></div>
      <div id="txResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindTxTrackerEvents() {
  document.getElementById('txHash').addEventListener('keydown', (e) => { if (e.key === 'Enter') trackTransaction(); });
}
async function trackTransaction() {
  const hash = document.getElementById('txHash').value.trim();
  if (!hash) { showStatus('txStatus', '请输入交易哈希', 'warning'); return; }
  showStatus('txStatus', '查询中...', 'info');
  try {
    const data = await fetchAPI(`/cosmos/tx/v1beta1/txs/${hash}`);
    const tx = data.tx_response || data;
    const resultDiv = document.getElementById('txResult');
    if (!tx || !tx.txhash) { showStatus('txStatus', '未找到该交易', 'error'); return; }
    const success = tx.code === 0;
    resultDiv.innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value" style="color:${success ? 'var(--success)' : 'var(--danger)'}">${success ? '✅ 成功' : '❌ 失败'}</div><div class="stat-label">状态</div></div>
        <div class="stat-card"><div class="stat-value">${tx.height || '-'}</div><div class="stat-label">区块高度</div></div>
        <div class="stat-card"><div class="stat-value">${tx.gas_used || '-'} / ${tx.gas_wanted || '-'}</div><div class="stat-label">Gas 使用</div></div>
        <div class="stat-card"><div class="stat-value">${tx.tx?.body?.messages?.length || 0}</div><div class="stat-label">消息数</div></div>
      </div>
      <div class="card" style="background:var(--bg)">
        <div class="card-title" style="font-size:14px">📝 详细信息</div>
        <pre style="font-size:11px;color:var(--text-muted);overflow-x:auto;white-space:pre-wrap;word-break:break-all">${JSON.stringify(tx, null, 2)}</pre>
      </div>
    `;
    showStatus('txStatus', '', '');
    document.getElementById('txStatus').style.display = 'none';
  } catch (e) {
    showStatus('txStatus', '查询失败：' + e.message, 'error');
  }
}

function renderGasCalc() {
  return `
    <div class="card">
      <div class="card-title">${t('gasCalc.title')}</div>
      <div class="tool-desc">${t('gasCalc.desc')}</div>
      <div class="form-group">
        <label class="form-label">${t('gasCalc.type')}</label>
        <select id="gcTxType">
          <option value="send">${t('gasCalc.send')}</option>
          <option value="prc20">${t('gasCalc.prc20')}</option>
          <option value="nft">${t('gasCalc.nft')}</option>
          <option value="swap">${t('gasCalc.swap')}</option>
          <option value="stake">${t('gasCalc.stake')}</option>
          <option value="vote">${t('gasCalc.vote')}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('gasCalc.price')}</label>
        <input type="number" id="gcGasPrice" value="0.05" step="0.01" min="0">
      </div>
      <button class="btn btn-primary" onclick="calculateGas()">${t('gasCalc.calcBtn')}</button>
      <div class="status-msg" id="gcStatus"></div>
      <div id="gcResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindGasCalcEvents() {}
function calculateGas() {
  const txType = document.getElementById('gcTxType').value;
  const gasPrice = parseFloat(document.getElementById('gcGasPrice').value);
  const gasEstimates = { send:80000, prc20:200000, nft:250000, swap:350000, stake:200000, vote:150000 };
  const gasUsed = gasEstimates[txType] || 100000;
  const feeUpaxi = gasUsed * gasPrice;
  const feePaxi = feeUpaxi / 1e6;
  document.getElementById('gcResult').innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-value">${gasUsed.toLocaleString()}</div><div class="stat-label">预估 Gas 用量</div></div>
      <div class="stat-card"><div class="stat-value">${feeUpaxi.toLocaleString()}</div><div class="stat-label">费用 (upaxi)</div></div>
      <div class="stat-card"><div class="stat-value">${feePaxi.toFixed(6)}</div><div class="stat-label">费用 (PAXI)</div></div>
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">⚠️ 实际 Gas 消耗可能因合约逻辑复杂度而异。批量操作请在 Gas Limit 中累加。</p>
  `;
}

window.TOOL_REGISTRY['tx-tracker'] = { render: renderTxTracker, bind: bindTxTrackerEvents };
window.TOOL_REGISTRY['gas-calc'] = { render: renderGasCalc, bind: bindGasCalcEvents };
