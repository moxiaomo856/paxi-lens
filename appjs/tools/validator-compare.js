window.TOOL_REGISTRY ||= {};

function renderValidatorCompare() {
  return `
    <div class="card">
      <div class="card-title">${t('validatorCompare.title')}</div>
      <div class="tool-desc">${t('validatorCompare.desc')}</div>
      <button class="btn btn-primary" onclick="loadValidatorData()">${t('validatorCompare.loadBtn')}</button>
      <div class="status-msg" id="vcStatus"></div>
      <div id="vcResults" style="margin-top:16px"></div>
      <div style="margin-top:14px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--text-muted);line-height:1.7;text-align:center;">
        ${t('disclaimer.validatorCompare')}
      </div>
    </div>
  `;
}
async function loadValidatorData() {
  showStatus('vcStatus', t('validatorCompare.loading'), 'info');
  try {
    let validators = [];
    let nextKey = null;
    do {
      const url = '/cosmos/staking/v1beta1/validators?pagination.limit=100' + (nextKey ? `&pagination.key=${encodeURIComponent(nextKey)}` : '');
      const data = await fetchAPI(url);
      validators = validators.concat(data.validators || []);
      nextKey = (data.pagination && data.pagination.next_key) ? data.pagination.next_key : null;
    } while (nextKey);
    const poolData = await fetchAPI('/cosmos/staking/v1beta1/pool');
    const bondedTokens = parseInt(poolData.pool?.bonded_tokens || '0') / 1e6;

    /* ---- APR 计算：全部从链上实时读取，不硬编码 ----
     * Paxi 通胀逐年减半（第 1 年 8% → 第 2 年 4% → …），
     * 必须读 mint 模块的当前通胀率，否则第 2 年起 APR 会高估一倍。
     * APR = 总供应量 × 通胀率 × (1 − 社区池税率) ÷ 总质押量            */
    let inflation = null, totalSupply = 0, communityTax = 0.05, aprSource = '';
    try {
      const infData = await fetchAPI('/cosmos/mint/v1beta1/inflation');
      inflation = parseFloat(infData.inflation);
      aprSource = '链上实时';
    } catch (_) {}
    if (inflation === null || !isFinite(inflation)) {
      inflation = 0.04;   // 兜底：按第 2 年 4% 估算
      aprSource = '兜底值(第2年4%)';
    }
    try {
      const supData = await fetchAPI('/cosmos/bank/v1beta1/supply/by_denom?denom=upaxi');
      totalSupply = parseInt(supData.amount?.amount || '0') / 1e6;
    } catch (_) {}
    try {
      const distData = await fetchAPI('/cosmos/distribution/v1beta1/params');
      communityTax = parseFloat(distData.params?.community_tax ?? '0.05');
    } catch (_) {}

    const annualReward = totalSupply > 0 ? totalSupply * inflation * (1 - communityTax) : 0;
    const bondedRatio = totalSupply > 0 ? (bondedTokens / totalSupply) * 100 : 0;
    const estimatedAPR = (bondedTokens > 0 && annualReward > 0)
      ? (annualReward / bondedTokens) * 100 : 0;
    const sorted = validators.map(v => ({
      moniker: v.description?.moniker || 'Unknown',
      address: v.operator_address,
      votingPower: parseInt(v.tokens || '0') / 1e6,
      commission: parseFloat(v.commission?.commission_rates?.rate || '0') * 100,
      status: v.status === 'BOND_STATUS_BONDED' ? '✅ 活跃' : '⚠️ 待定',
      jailed: v.jailed,
    }))    .sort((a,b) => b.votingPower - a.votingPower);
    /* 口径说明：钱包 App 的「委托总量」是全部节点合计（含候选+解绑中），
     * 只有 BONDED 活跃节点参与收益分配，APR 分母必须用活跃质押量 */
    const allSum = validators.reduce((acc, v) => acc + BigInt(v.tokens || '0'), 0n);
    /* BigInt→Number 前先降单位（upaxi→PAXI），防止总量增长后 Number 精度溢出 */
    const allSumPaxi = Number(allSum / 1000000n);
    const bondedCount = sorted.filter(v => v.status === '✅ 活跃').length;
    document.getElementById('vcResults').innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">${bondedCount}</div><div class="stat-label">活跃节点数</div></div>
        <div class="stat-card"><div class="stat-value">${bondedTokens.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="stat-label">活跃质押量 (PAXI)</div></div>
        <div class="stat-card"><div class="stat-value">${allSumPaxi.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="stat-label">全网委托合计 (PAXI)</div></div>
        <div class="stat-card"><div class="stat-value">${(inflation * 100).toFixed(1)}%</div><div class="stat-label">当前通胀率（${aprSource}）</div></div>
        <div class="stat-card"><div class="stat-value">${bondedRatio.toFixed(1)}%</div><div class="stat-label">活跃质押率</div></div>
        <div class="stat-card"><div class="stat-value">${estimatedAPR > 0 ? estimatedAPR.toFixed(1) + '%' : '—'}</div><div class="stat-label">预估 APR</div></div>
      </div>
      <div class="hint" style="font-size:11px;color:var(--text-muted);margin:8px 0;">
        📐 APR = 总供应 × 通胀 ${(inflation*100).toFixed(1)}% × (1−社区税 ${(communityTax*100).toFixed(0)}%) ÷ 活跃质押 —— Paxi 通胀逐年减半（第1年 8% → 第2年 4% → …），本数据自动跟随链上当前值。
        ℹ️ 钱包 App 显示的「委托总量」（约 ${(allSumPaxi/1e6).toFixed(2)} 百万）是全部 ${validators.length} 个节点的合计，其中只有 ${bondedCount} 个活跃节点（${bondedTokens.toLocaleString(undefined,{maximumFractionDigits:0})} PAXI）参与收益分配；其余为候选节点与解除质押中的资金，不产生质押奖励。
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
      <div id="tiDisclaimer" style="display:none;margin-top:12px;padding:8px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-muted);line-height:1.6;text-align:center;">
        ${t('disclaimer.prc20Info')}
      </div>
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
      const tiDisc = document.getElementById('tiDisclaimer');
      if (tiDisc) tiDisc.style.display = 'block';
    } else {
      showStatus('tiStatus', '⚠️ 无法查询该合约信息（可能不是 PRC-20 合约）', 'warning');
    }
  } catch (e) {
    showStatus('tiStatus', '查询失败：' + e.message, 'error');
  }
}

window.TOOL_REGISTRY['validator-compare'] = { render: renderValidatorCompare, onMount: loadValidatorData };
