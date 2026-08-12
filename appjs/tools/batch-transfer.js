if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

function renderBatchTransfer() {
  return `
    <div class="card">
      <div class="card-title">${t('batchTransfer.title')}</div>
      <div class="info-box">
        <strong>⚡ ${t('batchTransfer.modePack')}</strong><br>
        <span style="font-size:11px;color:var(--text-muted);">${t('batchTransfer.note')}</span>
      </div>
      <div class="tool-desc">${t('batchTransfer.desc')}</div>
      <div class="tabs">
        <div class="tab active" data-bt-type="native">${t('batchTransfer.native')}</div>
        <div class="tab" data-bt-type="prc20">${t('batchTransfer.prc20')}</div>
        <div class="tab" data-bt-type="nft">${t('batchTransfer.nft')}</div>
      </div>
      <div class="tabs" style="margin-top:8px">
        <div class="tab active" data-bt-mode="csv">${t('batchTransfer.csvMode')}</div>
        <div class="tab" data-bt-mode="uniform">${t('batchTransfer.uniformMode')}</div>
      </div>
      <div class="form-group" id="bt-prc20-group" style="display:none">
        <label class="form-label">PRC-20 合约地址</label>
        <input type="text" id="btPrc20Contract" placeholder="paxi1...">
      </div>
      <div class="form-group" id="bt-nft-group" style="display:none">
        <label class="form-label">NFT 合约地址</label>
        <input type="text" id="btNftContract" placeholder="paxi1...">
      </div>
      <div id="bt-csv-area">
        <div class="form-group">
          <label class="form-label">上传 CSV 文件 或 粘贴数据</label>
          <div class="upload-area" id="btCsvUpload">
            <div style="font-size:28px;margin-bottom:8px">📁</div>
            <div>${t('batchTransfer.upload')}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${t('batchTransfer.format')}</div>
          </div>
          <input type="file" id="btCsvFile" accept=".csv,.txt" style="display:none">
        </div>
        <div class="form-group">
          <label class="form-label">或手动粘贴（每行：地址,金额）</label>
          <textarea id="btCsvText" placeholder="${t('batchTransfer.pastePlaceholder')}"></textarea>
        </div>
      </div>
      <div id="btLiveCounter" style="margin:8px 0 4px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
        <div style="font-size:12px;color:var(--text-muted);">📝 输入地址后此处会实时显示识别进度</div>
      </div>
      <div id="bt-uniform-area" style="display:none">
        <div class="form-group">
          <label class="form-label">接收地址列表（每行一个地址）</label>
          <textarea id="btUniformAddrs" placeholder="${t('batchTransfer.uniformPlaceholder')}"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">每地址金额</label>
          <input type="number" id="btUniformAmount" placeholder="例如：100" step="0.000001" min="0">
        </div>
      </div>
      <div id="btPreview" style="display:none">
        <div class="card-title" style="font-size:14px">${t('batchTransfer.preview')}</div>
        <div class="stats-row" id="btStats"></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>接收地址</th><th>金额</th><th>代币</th></tr></thead>
            <tbody id="btPreviewBody"></tbody>
          </table>
        </div>
      </div>
      <div style="margin:14px 0 4px;padding:10px 12px;background:rgba(255,255,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:6px;font-size:12px;color:#ffd700;line-height:1.6;">
        ${t('disclaimer.batchTransfer')}
      </div>
      <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btParseBtn" onclick="parseBatchTransfer()">${t('batchTransfer.parseBtn')}</button>
        <button class="btn btn-success" id="btSendBtn" style="display:none" onclick="executeBatchTransfer()">${t('batchTransfer.sendBtn')}</button>
        <button class="btn btn-outline btn-sm" id="btClearBtn" style="display:none" onclick="clearBatchTransfer()">${t('batchTransfer.clearBtn')}</button>
      </div>
      <div class="status-msg" id="btStatus"></div>
    </div>
    <div class="card">
      <div class="card-title">${t('batchTransfer.history')}</div>
      <div id="btHistory"><p style="color:var(--text-muted);font-size:13px">连接钱包后查看历史记录</p></div>
    </div>
  `;
}

function bindBatchTransferEvents() {
  document.querySelectorAll('[data-bt-type]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-bt-type]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.batchTokenType = tab.dataset.btType;
      document.getElementById('bt-prc20-group').style.display = tab.dataset.btType === 'prc20' ? 'block' : 'none';
      document.getElementById('bt-nft-group').style.display = tab.dataset.btType === 'nft' ? 'block' : 'none';
      clearBatchTransfer();
    });
  });
  document.querySelectorAll('[data-bt-mode]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-bt-mode]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.batchMode = tab.dataset.btMode;
      document.getElementById('bt-csv-area').style.display = tab.dataset.btMode === 'csv' ? 'block' : 'none';
      document.getElementById('bt-uniform-area').style.display = tab.dataset.btMode === 'uniform' ? 'block' : 'none';
      clearBatchTransfer();
    });
  });
  const uploadArea = document.getElementById('btCsvUpload');
  const fileInput = document.getElementById('btCsvFile');
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) parseCSVFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) parseCSVFile(e.target.files[0]);
  });
  // 实时计数器：监听输入框
  const btCsvText = document.getElementById('btCsvText');
  const btUniformAddrs = document.getElementById('btUniformAddrs');
  const btUniformAmount = document.getElementById('btUniformAmount');
  const updateLiveCounter = () => {
    const mode = state.batchMode;
    const maxTotal = CONFIG.batchTransfer.maxTotalAddresses;
    let count = 0;
    let totalRaw = 0;
    if (mode === 'csv') {
      const text = btCsvText?.value.trim() || '';
      if (text) {
        const lines = text.split('\n').filter(l => l.trim());
        const seen = new Set();
        totalRaw = lines.length;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const parts = line.split(',').map(p => p.trim());
          if (parts.length < 2) continue;
          const addr = parts[0], amount = parts[1];
          if (i === 0 && /^address|地址/i.test(addr)) continue;
          if (!addr.startsWith('paxi1') || addr.length < 38) continue;
          const amtNum = parseFloat(amount);
          if (isNaN(amtNum) || amtNum <= 0) continue;
          if (seen.has(addr)) continue;
          seen.add(addr);
          count++;
        }
      }
    } else {
      const addrsText = btUniformAddrs?.value.trim() || '';
      const amount = btUniformAmount?.value;
      if (addrsText) {
        const addrs = addrsText.split('\n').map(a => a.trim()).filter(a => a);
        const seen = new Set();
        totalRaw = addrs.length;
        for (const a of addrs) {
          if (!a.startsWith('paxi1') || a.length < 38) continue;
          if (seen.has(a)) continue;
          seen.add(a);
          count++;
        }
        const amtNum = parseFloat(amount || '0');
        if (isNaN(amtNum) || amtNum <= 0) count = 0;
      }
    }
    const counterEl = document.getElementById('btLiveCounter');
    if (!counterEl) return;
    const pct = Math.min((count / maxTotal) * 100, 100);
    const over = count > maxTotal;
    const barColor = over ? '#ef4444' : pct > 90 ? '#f59e0b' : '#6366f1';
    counterEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
        <span style="color:${over ? '#ef4444' : 'var(--text-muted)'};font-weight:600;">
          ${over ? '⚠️ 超出上限！' : `📍 已识别 ${count}/${maxTotal} 个有效地址`}
        </span>
        <span style="color:var(--text-muted);">
          ${totalRaw > 0 ? `原始 ${totalRaw} 行，剩余 ${maxTotal - count < 0 ? 0 : maxTotal - count} 可用` : ''}
        </span>
      </div>
      <div style="width:100%;height:6px;background:var(--bg);border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${barColor};transition:width .2s ease;border-radius:4px;"></div>
      </div>
      ${over ? `<div style="font-size:11px;color:#ef4444;margin-top:4px;">超出 ${count - maxTotal} 个地址，请移除多余部分再点击「解析」</div>` : ''}
    `;
  };
  if (btCsvText) btCsvText.addEventListener('input', updateLiveCounter);
  if (btUniformAddrs) btUniformAddrs.addEventListener('input', updateLiveCounter);
  if (btUniformAmount) btUniformAmount.addEventListener('input', updateLiveCounter);
}

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('btCsvText').value = e.target.result;
    // 触发一次 input 事件以更新实时计数器
    document.getElementById('btCsvText').dispatchEvent(new Event('input'));
    parseBatchTransfer();
  };
  reader.readAsText(file);
}

function parseBatchTransfer() {
  const tokenType = state.batchTokenType;
  const mode = state.batchMode;
  let recipients = [];
  const seenAddresses = new Set();
  const invalidLines = [];
  if (mode === 'csv') {
    const text = document.getElementById('btCsvText').value.trim();
    if (!text) { showStatus('btStatus', '请输入 CSV 数据', 'warning'); return; }
    const lines = text.split('\n').filter(l => l.trim());
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) { invalidLines.push({ line: lineIdx + 1, reason: '格式不正确' }); continue; }
      const addr = parts[0], amount = parts[1];
      if (lineIdx === 0 && /^address|地址/i.test(addr)) continue;
      if (!addr.startsWith('paxi1') || addr.length < 38) { invalidLines.push({ line: lineIdx + 1, reason: '无效地址' }); continue; }
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) { invalidLines.push({ line: lineIdx + 1, reason: '无效金额' }); continue; }
      if (seenAddresses.has(addr)) { invalidLines.push({ line: lineIdx + 1, reason: '重复地址' }); continue; }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  } else {
    const addrsText = document.getElementById('btUniformAddrs').value.trim();
    const amount = document.getElementById('btUniformAmount').value;
    if (!addrsText || !amount) { showStatus('btStatus', '请输入地址列表和金额', 'warning'); return; }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) { showStatus('btStatus', '金额必须大于 0', 'warning'); return; }
    const addrs = addrsText.split('\n').map(a => a.trim()).filter(a => a);
    for (let i = 0; i < addrs.length; i++) {
      const addr = addrs[i];
      if (!addr.startsWith('paxi1') || addr.length < 38) { invalidLines.push({ line: i + 1, reason: '无效地址' }); continue; }
      if (seenAddresses.has(addr)) { invalidLines.push({ line: i + 1, reason: '重复地址' }); continue; }
      seenAddresses.add(addr);
      recipients.push({ address: addr, amount: amount });
    }
  }
  if (recipients.length === 0) { showStatus('btStatus', '未能解析任何有效的接收地址', 'warning'); return; }
  const validRecipients = recipients.filter(r => { try { bech32Decode(r.address); return true; } catch { return false; } });
  if (validRecipients.length === 0) { showStatus('btStatus', '没有有效的 Paxi 地址（bech32 校验失败）', 'error'); return; }
  const maxTotal = CONFIG.batchTransfer.maxTotalAddresses;
  if (validRecipients.length > maxTotal) {
    showStatus('btStatus', `最多支持 ${maxTotal} 个接收地址，当前 ${validRecipients.length} 个超出上限`, 'warning');
    return;
  }
  state.batchRecipients = validRecipients;
  renderBatchPreview(validRecipients, tokenType);
  document.getElementById('btPreview').style.display = 'block';
  document.getElementById('btSendBtn').style.display = 'inline-flex';
  document.getElementById('btClearBtn').style.display = 'inline-flex';
  document.getElementById('btStatus').style.display = 'none';
  if (invalidLines.length > 0) {
    setTimeout(() => {
      showStatus('btStatus', `⚠️ 跳过 ${invalidLines.length} 行无效数据：${invalidLines.slice(0,5).map(l => `第${l.line}行(${l.reason})`).join(', ')}${invalidLines.length>5?'...':''}`, 'warning');
    }, 100);
  }
}

function renderBatchPreview(recipients, tokenType) {
  const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  const tokenLabel = tokenType === 'native' ? 'PAXI' : tokenType === 'prc20' ? 'PRC-20' : 'NFT';
  const feePerAddr = tokenType === 'nft'
    ? CONFIG.batchTransfer.nftFeePerAddress
    : CONFIG.batchTransfer.feePerAddress;
  const feeAmount = recipients.length * feePerAddr;
  const feeNote = `${feePerAddr} PAXI/地址`;
  const batchCount = Math.ceil(recipients.length / CONFIG.batchTransfer.maxAddressesPerTx);
  const maxTotal = CONFIG.batchTransfer.maxTotalAddresses;
  const pct = Math.min((recipients.length / maxTotal) * 100, 100);
  const batchPct = Math.min(100, 100);
  const batches = [];
  for (let i = 0; i < recipients.length; i += CONFIG.batchTransfer.maxAddressesPerTx) {
    batches.push(recipients.slice(i, i + CONFIG.batchTransfer.maxAddressesPerTx).length);
  }
  document.getElementById('btStats').innerHTML = `
    <div style="grid-column:1/-1;margin-bottom:8px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
        <span style="font-weight:700;color:#10b981;">✅ 已解析 ${recipients.length}/${maxTotal} 个地址（校验通过）</span>
        <span style="color:var(--text-muted);">占用 ${pct.toFixed(1)}%</span>
      </div>
      <div style="width:100%;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:#10b981;transition:width .3s ease;border-radius:4px;"></div>
      </div>
      <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
        ${batches.map((len, i) => {
          const bpct = (len / CONFIG.batchTransfer.maxAddressesPerTx) * 100;
          return `<div style="min-width:60px;padding:4px 8px;background:var(--bg);border-radius:6px;font-size:11px;">
            <div style="font-weight:600;color:#6366f1;">第 ${i+1} 批</div>
            <div style="color:var(--text-muted);">${len} 个地址 · ${bpct.toFixed(0)}% 占用</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="stat-card"><div class="stat-value">${recipients.length}</div><div class="stat-label">接收地址数</div></div>
    <div class="stat-card"><div class="stat-value">${tokenType === 'nft' ? recipients.length : totalAmount.toLocaleString()}</div><div class="stat-label">${tokenType === 'nft' ? 'NFT 数量' : '总金额（' + tokenLabel + '）'}</div></div>
    <div class="stat-card"><div class="stat-value">${feeAmount.toFixed(5)}</div><div class="stat-label">服务费 ${feeNote}</div></div>
    <div class="stat-card"><div class="stat-value">${batchCount}</div><div class="stat-label">分 ${batchCount} 批发送</div></div>
  `;
  const tbody = document.getElementById('btPreviewBody');
  tbody.innerHTML = recipients.map((r, i) => `
    <tr><td>${i+1}</td><td><code>${escapeHtml(r.address.slice(0,14))}...${escapeHtml(r.address.slice(-8))}</code></td><td>${escapeHtml(parseFloat(r.amount).toLocaleString())}</td><td>${tokenLabel}</td></tr>
  `).join('');
}

function clearBatchTransfer() {
  state.batchRecipients = [];
  document.getElementById('btPreview').style.display = 'none';
  document.getElementById('btSendBtn').style.display = 'none';
  document.getElementById('btClearBtn').style.display = 'none';
  document.getElementById('btStatus').style.display = 'none';
}

async function executeBatchTransfer() {
  if (!state.connected) { showStatus('btStatus', '请先连接钱包', 'warning'); return; }
  if (state.batchRecipients.length === 0) { showStatus('btStatus', '没有可发送的转账', 'warning'); return; }
  const btn = document.getElementById('btSendBtn');
  btn.disabled = true;
  const statusEl = document.getElementById('btStatus');
  const totalRecipients = state.batchRecipients.length;
  const tokenType = state.batchTokenType;
  const maxPerTx = CONFIG.batchTransfer.maxAddressesPerTx;
  const batches = [];
  for (let i = 0; i < totalRecipients; i += maxPerTx) {
    batches.push(state.batchRecipients.slice(i, i + maxPerTx));
  }
  const feePerAddr = tokenType === 'nft'
    ? CONFIG.batchTransfer.nftFeePerAddress
    : CONFIG.batchTransfer.feePerAddress;
  const totalFeePaxi = totalRecipients * feePerAddr;

  statusEl.className = 'status-msg info';
  statusEl.style.display = 'block';
  statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 准备发送（共 ${totalRecipients} 个地址，分 ${batches.length} 批）...</div>`;

  const txHashes = [];
  let successCount = 0;
  let failCount = 0;

  try {
    const sender = state.wallet;
    const denom = CONFIG.denom;
    const chainId = CONFIG.chainId;

    // PRC-20 预查 decimals（每批复用）
    let prc20Decimals = 6;
    if (tokenType === 'prc20') {
      const contractAddr = document.getElementById('btPrc20Contract')?.value.trim();
      if (!contractAddr) throw new Error('缺少 PRC-20 合约地址');
      try {
        const queryMsg = btoa(JSON.stringify({ token_info: {} }));
        const queryRes = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contractAddr}/smart/${queryMsg}`).then(r => r.json());
        if (queryRes?.data?.decimals !== undefined) prc20Decimals = queryRes.data.decimals;
      } catch (e) {}
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchNum = batchIdx + 1;
      const batchFeePaxi = batch.length * feePerAddr;
      const batchFeeMicro = paxiToUpaxi(batchFeePaxi.toFixed(8));

      btn.innerHTML = `<span class="spinner"></span> 第 ${batchNum}/${batches.length} 批签名中...`;
      statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 正在发送第 ${batchNum}/${batches.length} 批（${batch.length} 个地址）</div><div style="font-size:13px;">💰 本批手续费：${batchFeePaxi.toFixed(5)} PAXI</div>`;

      // 构建本批消息
      const allMessages = [];
      for (const r of batch) {
        if (tokenType === 'native') {
          const amountMicro = paxiToUpaxi(r.amount);
          const msg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: r.address, amount: [PaxiCosmJS.coins(amountMicro, denom)[0]] });
          allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(msg).finish() }));
        } else if (tokenType === 'prc20') {
          const contractAddr = document.getElementById('btPrc20Contract')?.value.trim();
          const rawAmount = parseFloatToRawUnits(r.amount, prc20Decimals);
          const msgObj = { transfer: { recipient: r.address, amount: rawAmount } };
          const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: contractAddr, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
          allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
        } else if (tokenType === 'nft') {
          const nftContract = document.getElementById('btNftContract')?.value.trim();
          const msgObj = { transfer_nft: { recipient: r.address, token_id: String(r.amount) } };
          const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: nftContract, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
          allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
        }
      }
      // 手续费消息（与原来完全一样的 MsgSend 到 feeCollector）
      if (batchFeeMicro !== '0') {
        const feeMsg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: CONFIG.feeCollector, amount: [PaxiCosmJS.coins(batchFeeMicro, denom)[0]] });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(feeMsg).finish() }));
      }

      // 获取账户信息（每批需要刷新 sequence）
      const accountRes = await fetch(`${CONFIG.lcd}/cosmos/auth/v1beta1/accounts/${sender.address}`);
      const accountData = await accountRes.json();
      const account = accountData.account?.base_account || accountData.account;
      const accountNumber = Number(account.account_number);
      const sequence = Number(account.sequence);

      const txBody = PaxiCosmJS.TxBody.fromPartial({ messages: allMessages, memo: `Paxi Toolbox Batch ${batchNum}/${batches.length} (${batch.length} recipients) | Fee: ${batchFeePaxi.toFixed(5)} PAXI` });
      const memo = `Paxi Toolbox Batch ${batchNum}/${batches.length} (${batch.length} recipients) | Fee: ${batchFeePaxi.toFixed(5)} PAXI`;
      const pubkeyBytes = typeof sender.public_key === 'string' ? fromBase64(sender.public_key) : new Uint8Array(sender.public_key);

      // ⭐ 1. 先做链上 Gas 模拟（用户要求的核心修改）
      let totalGas = 0;
      let simulatedGas = null;
      const fallbackGas = allMessages.length * 90000 + 200000;
      const simBtnText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span> 第 ${batchNum}/${batches.length} 批模拟中...`;
      statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 第 ${batchNum}/${batches.length} 批（${batch.length} 个地址）链上 Gas 模拟中...</div><div style="font-size:13px;">📊 计算实际 gas_used × 安全系数 = 最终 gas_wanted</div>`;
      try {
        simulatedGas = await simulateGas(allMessages, memo, accountNumber, sequence, sender.public_key, sender.address);
      } catch (e) {
        console.warn('[BatchTx] simulateGas failed, fallback to estimate:', e.message);
      }
      if (simulatedGas && simulatedGas > 0) {
        // 按消息数量选择安全系数：消息越多，不确定性越大 → 越高的系数
        // 1~30 msg: 1.10倍  |  31~70 msg: 1.20倍  |  71~100+ msg: 1.30倍
        const msgCount = allMessages.length;
        const safetyRatio = msgCount <= 30 ? 1.10 : msgCount <= 70 ? 1.20 : 1.30;
        totalGas = Math.ceil(simulatedGas * safetyRatio);
        showToast(`📊 Gas 模拟：实际 ${simulatedGas.toLocaleString()} × ${safetyRatio} 安全系数 = ${totalGas.toLocaleString()}`, 'info');
      } else {
        totalGas = fallbackGas;
        showToast(`⚠️ Gas 模拟失败，使用估算值 ${totalGas.toLocaleString()}`, 'warning');
      }
      const gasPriceMatch = /^([\d.]+)\s*upaxi$/i.exec((window.SHARED_CONFIG || {}).gasPrice || '0.25upaxi');
      const gasPricePerUnit = gasPriceMatch ? parseFloat(gasPriceMatch[1]) : 0.25;
      const fee = { amount: [PaxiCosmJS.coins(Math.floor(totalGas * gasPricePerUnit).toString(), denom)[0]], gasLimit: totalGas };
      const pubkeyAny = { typeUrl: '/cosmos.crypto.secp256k1.PubKey', value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish() };
      const authInfo = PaxiCosmJS.AuthInfo.fromPartial({ signerInfos: [{ publicKey: pubkeyAny, modeInfo: { single: { mode: 1 } }, sequence: BigInt(sequence) }], fee });
      const signDoc = PaxiCosmJS.SignDoc.fromPartial({ bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(), authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(), chainId, accountNumber: BigInt(accountNumber) });
      const txObj = { bodyBytes: toBase64(signDoc.bodyBytes), authInfoBytes: toBase64(signDoc.authInfoBytes), chainId, accountNumber: signDoc.accountNumber.toString() };

      btn.innerHTML = `<span class="spinner"></span> 第 ${batchNum}/${batches.length} 批等待签名...`;
      const result = await window.paxihub.paxi.signAndSendTransaction(txObj);
      if (!result || !result.success) throw new Error(result?.message || '签名失败或被拒绝');
      const sigBytes = fromBase64(result.success);
      const txRaw = PaxiCosmJS.TxRaw.fromPartial({ bodyBytes: signDoc.bodyBytes, authInfoBytes: signDoc.authInfoBytes, signatures: [sigBytes] });
      const txBytes = PaxiCosmJS.TxRaw.encode(txRaw).finish();
      const base64Tx = toBase64(txBytes);

      btn.innerHTML = `<span class="spinner"></span> 第 ${batchNum}/${batches.length} 批广播中...`;
      const broadcastRes = await fetch(`${CONFIG.lcd}/cosmos/tx/v1beta1/txs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_bytes: base64Tx, mode: 'BROADCAST_MODE_SYNC' })
      }).then(r => r.json());
      const txResult = checkTxResult(broadcastRes);
      if (txResult.ok) {
        successCount += batch.length;
        txHashes.push(txResult.txhash);
        const actualGasUsed = broadcastRes.tx_response?.gas_used || '';
        showToast(`✅ 第 ${batchNum} 批成功（${batch.length} 个地址）${actualGasUsed ? `，实际 gas_used: ${actualGasUsed}` : ''}`, 'success');
      } else {
        failCount += batch.length;
        console.error(`Batch ${batchNum} failed:`, txResult.rawLog);
        showToast(`❌ 第 ${batchNum} 批失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
      }
      // 批间等待 2 秒让 sequence 更新
      if (batchIdx < batches.length - 1) {
        statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 第 ${batchNum} 批已完成，等待上链确认...</div><div style="font-size:13px;">已完成 ${successCount}/${totalRecipients} 个地址</div>`;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 汇总结果
    if (failCount === 0) {
      statusEl.className = 'status-msg success';
      statusEl.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:10px;color:var(--success)">✅ 全部完成！</div>
        <div style="font-size:13px;line-height:1.8;">📤 转账：${successCount} 笔（${batches.length} 批）<br>💰 手续费：${totalFeePaxi.toFixed(5)} PAXI（已包含）<br>🔗 <a href="https://explorer.paxinet.io/tx/${txHashes[0]}" target="_blank" style="color:var(--primary)">查看首笔交易详情</a>${txHashes.length > 1 ? `（共 ${txHashes.length} 笔交易）` : ''}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;background:rgba(99,102,241,0.1);padding:8px 12px;border-radius:6px;">💡 接收方如果钱包不显示记录，请在「余额查询」中点击「📜 转入记录」查看完整链上记录</div>
      `;
      txHashes.forEach(h => pollTxStatus(h));
      showToast(`✅ 全部完成！${successCount} 笔转账`, 'success');
    } else {
      statusEl.className = 'status-msg warning';
      statusEl.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:10px;color:#ffd700;">⚠️ 部分完成</div>
        <div style="font-size:13px;line-height:1.8;">✅ 成功：${successCount} 笔<br>❌ 失败：${failCount} 笔<br>💰 手续费：${(successCount * feePerAddr).toFixed(5)} PAXI（仅对成功交易收取）</div>
      `;
    }
    refreshBalance();
    clearBatchTransfer();
  } catch (e) {
    console.error('Batch transfer error:', e);
    statusEl.className = 'status-msg error';
    statusEl.innerHTML = `❌ 执行失败：${mapError(undefined, e.message)}${successCount > 0 ? `<br><br>✅ 已成功 ${successCount} 笔，手续费 ${(successCount * feePerAddr).toFixed(5)} PAXI` : ''}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行批量转账';
  }
}

window.TOOL_REGISTRY['batch-transfer'] = { render: renderBatchTransfer, bind: bindBatchTransferEvents };
