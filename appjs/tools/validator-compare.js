window.TOOL_REGISTRY ||= {};

function renderValidatorCompare() {
  return `
    <div class="card">
      <div class="card-title">${t('validatorCompare.title')}</div>
      <div class="tool-desc">${t('validatorCompare.desc')}</div>
      <button class="btn btn-primary" onclick="loadValidatorData()">${t('validatorCompare.loadBtn')}</button>
      <div class="status-msg" id="vcStatus"></div>
      <div id="vcResults" style="margin-top:16px"></div>
    </div>
  `;
}
async function loadValidatorData() {
  showStatus('vcStatus', t('validatorCompare.loading'), 'info');
  try {
    const data = await fetchAPI('/cosmos/staking/v1beta1/validators?pagination.limit=100');
    const poolData = await fetchAPI('/cosmos/staking/v1beta1/pool');
    const bondedTokens = parseInt(poolData.pool?.bonded_tokens || '0') / 1e6;
    const validators = data.validators || [];
    const sorted = validators.map(v => ({
      moniker: v.description?.moniker || 'Unknown',
      address: v.operator_address,
      votingPower: parseInt(v.tokens || '0') / 1e6,
      commission: parseFloat(v.commission?.commission_rates?.rate || '0') * 100,
      status: v.status === 'BOND_STATUS_BONDED' ? '✅ 活跃' : '⚠️ 待定',
      jailed: v.jailed,
    })).sort((a,b) => b.votingPower - a.votingPower);
    const annualInflation = 0.08;
    const totalSupply = 72_000_000;
    const annualReward = totalSupply * annualInflation * 0.95;
    const estimatedAPR = bondedTokens > 0 ? (annualReward / bondedTokens) * 100 : 0;
    document.getElementById('vcResults').innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${sorted.length}</div><div class="stat-label">验证节点数</div></div>
        <div class="stat-card"><div class="stat-value">${bondedTokens.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="stat-label">总质押量 (PAXI)</div></div>
        <div class="stat-card"><div class="stat-value">${estimatedAPR.toFixed(1)}%</div><div class="stat-label">预估 APR</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>节点名称</th><th>状态</th><th>投票权重</th><th>佣金率</th><th>预估收益</th></tr></thead>
          <tbody>
            ${sorted.map((v,i) => {
              const netAPR = estimatedAPR * (1 - v.commission/100);
              return `<tr style="${v.jailed ? 'opacity:0.5' : ''}"><td>${i+1}</td><td style="font-weight:600">${escapeHtml(v.moniker)}${v.jailed ? ' 🔒' : ''}</td><td>${v.status}</td><td>${v.votingPower.toLocaleString()} PAXI</td><td>${v.commission.toFixed(1)}%</td><td style="color:var(--success);font-weight:600">~${netAPR.toFixed(1)}%</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    showStatus('vcStatus', t('validatorCompare.done').replace('{count}', sorted.length), 'success');
  } catch (e) {
    showStatus('vcStatus', '加载失败：' + e.message, 'error');
  }
}

function renderTokenInfo() {
  return `
    <div class="card">
      <div class="card-title">${t('tokenInfo.title')}</div>
      <div class="tool-desc">${t('tokenInfo.desc')}</div>
      <div class="form-group">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="tiContract" placeholder="${t('tokenInfo.placeholder')}">
      </div>
      <button class="btn btn-primary" onclick="queryTokenInfo()">${t('tokenInfo.queryBtn')}</button>
      <div class="status-msg" id="tiStatus"></div>
      <div id="tiResult" style="margin-top:16px"></div>
    </div>
  `;
}
function bindTokenInfoEvents() {
  document.getElementById('tiContract').addEventListener('keydown', (e) => { if (e.key === 'Enter') queryTokenInfo(); });
}
async function queryTokenInfo() {
  const contract = document.getElementById('tiContract').value.trim();
  if (!contract) { showStatus('tiStatus', '请输入合约地址', 'warning'); return; }
  showStatus('tiStatus', '查询中...', 'info');
  try {
    const contractRes = await fetchAPI(`/cosmwasm/wasm/v1/contract/${contract}`);
    const codeId = contractRes.contract_info?.code_id;
    const queryMsg = { token_info: {} };
    const encodedMsg = btoa(JSON.stringify(queryMsg));
    const queryRes = await fetchAPI(`/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`).catch(() => null);
    if (queryRes?.data) {
      const info = queryRes.data;
      const decimals = info.decimals || 6;
      let totalSupplyDisplay = '-';
      if (info.total_supply) {
        try {
          const supplyBigInt = BigInt(info.total_supply);
          const divisor = BigInt(10 ** decimals);
          const intPart = supplyBigInt / divisor;
          const decPart = (supplyBigInt % divisor).toString().padStart(decimals, '0');
          totalSupplyDisplay = intPart.toLocaleString() + '.' + decPart.slice(0,4);
        } catch (e) { totalSupplyDisplay = info.total_supply; }
      }
      document.getElementById('tiResult').innerHTML = `
        <div class="stats-row">
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${escapeHtml(info.name || '-')}</div><div class="stat-label">代币名称</div></div>
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${escapeHtml(info.symbol || '-')}</div><div class="stat-label">代币符号</div></div>
          <div class="stat-card"><div class="stat-value">${decimals}</div><div class="stat-label">小数位</div></div>
          <div class="stat-card"><div class="stat-value" style="font-size:16px">${totalSupplyDisplay}</div><div class="stat-label">总供应量</div></div>
        </div>
        <div class="card" style="background:var(--bg);margin-top:12px">
          <div class="card-title" style="font-size:14px">📋 合约信息</div>
          <p style="font-size:13px"><strong>合约地址：</strong><code>${contract}</code></p>
          <p style="font-size:13px"><strong>Code ID：</strong>${codeId || '-'}</p>
          <p style="font-size:13px"><strong>创建者：</strong><code>${contractRes.contract_info?.creator || '-'}</code></p>
        </div>
      `;
      showStatus('tiStatus', '', '');
      document.getElementById('tiStatus').style.display = 'none';
    } else {
      showStatus('tiStatus', '⚠️ 无法查询该合约信息（可能不是 PRC-20 合约）', 'warning');
    }
  } catch (e) {
    showStatus('tiStatus', '查询失败：' + e.message, 'error');
  }
}

window.TOOL_REGISTRY['validator-compare'] = { render: renderValidatorCompare, onMount: loadValidatorData };
