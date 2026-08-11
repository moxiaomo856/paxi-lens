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
}

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('btCsvText').value = e.target.result;
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
  if (validRecipients.length > CONFIG.maxMessagesPerTx) {
    showStatus('btStatus', `单笔交易最多 ${CONFIG.maxMessagesPerTx} 个接收地址，请分批发送`, 'warning');
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
  let feeAmount, feeNote;
  if (tokenType === 'nft') {
    feeAmount = recipients.length * 0.5;
    feeNote = '0.5 PAXI/笔（固定费率）';
  } else {
    const feeRate = CONFIG.feeRate;
    feeAmount = totalAmount * feeRate / 100;
    feeNote = `${feeRate}%（以 PAXI 收取）`;
  }
  document.getElementById('btStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${recipients.length}</div><div class="stat-label">接收地址数</div></div>
    <div class="stat-card"><div class="stat-value">${tokenType === 'nft' ? recipients.length : totalAmount.toLocaleString()}</div><div class="stat-label">${tokenType === 'nft' ? 'NFT 数量' : '总金额（' + tokenLabel + '）'}</div></div>
    <div class="stat-card"><div class="stat-value">${feeAmount.toFixed(4)}</div><div class="stat-label">服务费 ${feeNote}</div></div>
    <div class="stat-card"><div class="stat-value">${feeAmount.toFixed(4)}</div><div class="stat-label">PAXI 手续费总额</div></div>
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
  const total = state.batchRecipients.length;
  statusEl.className = 'status-msg info';
  statusEl.style.display = 'block';
  statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 准备打包发送（共 ${total} 笔）...</div>`;
  try {
    const sender = state.wallet;
    const denom = CONFIG.denom;
    const tokenType = state.batchTokenType;
    const chainId = CONFIG.chainId;
    let totalAmountMicro = BigInt(0);
    for (const r of state.batchRecipients) totalAmountMicro += BigInt(paxiToUpaxi(r.amount));
    const feeMicro = (totalAmountMicro * BigInt(Math.round(CONFIG.feeRate * 100)) / BigInt(10000)).toString();
    let fixedFeeMicro = '0';
    if (tokenType === 'nft') {
      const totalFee = state.batchRecipients.length * 0.5;
      fixedFeeMicro = paxiToUpaxi(totalFee.toFixed(6));
    }
    const actualFeeMicro = tokenType === 'nft' ? fixedFeeMicro : feeMicro;
    const actualFeePaxi = upaxiToPaxi(actualFeeMicro);

    const allMessages = [];
    for (const r of state.batchRecipients) {
      let amountMicro;
      if (tokenType === 'native') {
        amountMicro = paxiToUpaxi(r.amount);
        const msg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: r.address, amount: [PaxiCosmJS.coins(amountMicro, denom)[0]] });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(msg).finish() }));
      } else if (tokenType === 'prc20') {
        const contractAddr = document.getElementById('btPrc20Contract')?.value.trim();
        if (!contractAddr) throw new Error('缺少 PRC-20 合约地址');
        let prc20Decimals = 6;
        try {
          const queryMsg = btoa(JSON.stringify({ token_info: {} }));
          const queryRes = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contractAddr}/smart/${queryMsg}`).then(r => r.json());
          if (queryRes?.data?.decimals !== undefined) prc20Decimals = queryRes.data.decimals;
        } catch (e) {}
        const rawAmount = parseFloatToRawUnits(r.amount, prc20Decimals);
        const msgObj = { transfer: { recipient: r.address, amount: rawAmount } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: contractAddr, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
      } else if (tokenType === 'nft') {
        const nftContract = document.getElementById('btNftContract')?.value.trim();
        if (!nftContract) throw new Error('缺少 NFT 合约地址');
        const msgObj = { transfer_nft: { recipient: r.address, token_id: String(r.amount) } };
        const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({ sender: sender.address, contract: nftContract, msg: new TextEncoder().encode(JSON.stringify(msgObj)) });
        allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract', value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish() }));
      }
    }
    if (actualFeeMicro !== '0') {
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({ fromAddress: sender.address, toAddress: CONFIG.feeCollector, amount: [PaxiCosmJS.coins(actualFeeMicro, denom)[0]] });
      allMessages.push(PaxiCosmJS.Any.fromPartial({ typeUrl: '/cosmos.bank.v1beta1.MsgSend', value: PaxiCosmJS.MsgSend.encode(feeMsg).finish() }));
    }

    const accountRes = await fetch(`${CONFIG.lcd}/cosmos/auth/v1beta1/accounts/${sender.address}`);
    const accountData = await accountRes.json();
    const account = accountData.account?.base_account || accountData.account;
    const accountNumber = Number(account.account_number);
    const sequence = Number(account.sequence);

    btn.innerHTML = '<span class="spinner"></span> 构建交易...';
    statusEl.innerHTML = `<div style="font-weight:600;font-size:14px;margin-bottom:8px;">⏳ 打包发送 ${total} 笔转账 + 手续费</div><div style="font-size:13px;">📤 共 ${allMessages.length} 条消息打包中...</div>`;

    const txBody = PaxiCosmJS.TxBody.fromPartial({ messages: allMessages, memo: `Paxi Toolbox Transfer (${total} recipients) | Fee: ${actualFeePaxi} PAXI` });
    const totalGas = allMessages.length * 90000 + 200000;
    const gasPriceMatch = /^([\d.]+)\s*upaxi$/i.exec((window.SHARED_CONFIG || {}).gasPrice || '0.25upaxi');
    const gasPricePerUnit = gasPriceMatch ? parseFloat(gasPriceMatch[1]) : 0.25;
    const fee = { amount: [PaxiCosmJS.coins(Math.floor(totalGas * gasPricePerUnit).toString(), denom)[0]], gasLimit: totalGas };
    const pubkeyBytes = typeof sender.public_key === 'string' ? fromBase64(sender.public_key) : new Uint8Array(sender.public_key);
    const pubkeyAny = { typeUrl: '/cosmos.crypto.secp256k1.PubKey', value: PaxiCosmJS.PubKey.encode({ key: pubkeyBytes }).finish() };
    const authInfo = PaxiCosmJS.AuthInfo.fromPartial({ signerInfos: [{ publicKey: pubkeyAny, modeInfo: { single: { mode: 1 } }, sequence: BigInt(sequence) }], fee });
    const signDoc = PaxiCosmJS.SignDoc.fromPartial({ bodyBytes: PaxiCosmJS.TxBody.encode(txBody).finish(), authInfoBytes: PaxiCosmJS.AuthInfo.encode(authInfo).finish(), chainId, accountNumber: BigInt(accountNumber) });
    const txObj = { bodyBytes: toBase64(signDoc.bodyBytes), authInfoBytes: toBase64(signDoc.authInfoBytes), chainId, accountNumber: signDoc.accountNumber.toString() };

    btn.innerHTML = '<span class="spinner"></span> 等待钱包签名...';
    const result = await window.paxihub.paxi.signAndSendTransaction(txObj);
    if (!result || !result.success) throw new Error(result?.message || '签名失败或被拒绝');
    const sigBytes = fromBase64(result.success);
    const txRaw = PaxiCosmJS.TxRaw.fromPartial({ bodyBytes: signDoc.bodyBytes, authInfoBytes: signDoc.authInfoBytes, signatures: [sigBytes] });
    const txBytes = PaxiCosmJS.TxRaw.encode(txRaw).finish();
    const base64Tx = toBase64(txBytes);

    btn.innerHTML = '<span class="spinner"></span> 广播交易中...';
    const broadcastRes = await fetch(`${CONFIG.lcd}/cosmos/tx/v1beta1/txs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_bytes: base64Tx, mode: 'BROADCAST_MODE_SYNC' })
    }).then(r => r.json());
    const txResult = checkTxResult(broadcastRes);
    if (txResult.ok) {
      statusEl.className = 'status-msg success';
      statusEl.innerHTML = `
        <div style="font-weight:600;font-size:16px;margin-bottom:10px;color:var(--success)">✅ 全部完成！</div>
        <div style="font-size:13px;line-height:1.8;">📤 转账：${total} 笔${actualFeeMicro !== '0' ? `<br>💰 手续费：${actualFeePaxi} PAXI（已包含）` : ''}<br>🔗 <a href="https://explorer.paxinet.io/tx/${txResult.txhash}" target="_blank" style="color:var(--primary)">查看交易详情</a></div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;background:rgba(99,102,241,0.1);padding:8px 12px;border-radius:6px;">💡 接收方如果钱包不显示记录，请在「余额查询」中点击「📜 转入记录」查看完整链上记录</div>
      `;
      pollTxStatus(txResult.txhash);
      showToast(`✅ 完成！${total} 笔转账 + 手续费`, 'success');
    } else {
      throw new Error(`交易失败：${mapError(txResult.code, txResult.rawLog)}`);
    }
    refreshBalance();
    clearBatchTransfer();
  } catch (e) {
    console.error('Batch transfer error:', e);
    statusEl.className = 'status-msg error';
    statusEl.innerHTML = `❌ 执行失败：${mapError(undefined, e.message)}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行批量转账';
  }
}

window.TOOL_REGISTRY['batch-transfer'] = { render: renderBatchTransfer, bind: bindBatchTransferEvents };
