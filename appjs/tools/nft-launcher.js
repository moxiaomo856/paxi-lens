/**
 * NFT Launcher (Inline Version)
 * 内嵌版 NFT 发射工具 - 取消跳转，直接在工具箱内展示
 * 支持：集合部署、批量铸造、合约历史、中英文双语
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const _NFT_LANG = {
  zh: {
    title: '🎨 NFT 发射平台',
    desc: '一键部署 PRC-721 NFT 合约到 Paxi 网络，支持批量铸造。',
    deploy: '部署 NFT 合约',
    batchMint: '批量铸造 NFT',
    contractHistory: '已部署的合约',
    contractAddr: 'NFT 合约地址',
    collectionName: '合集名称',
    symbol: '合集符号',
    maxSupply: '最大供应量',
    mint: '铸造数量',
    deployBtn: '🚀 部署 NFT 合约',
    mintBtn: '🏭 执行批量铸造',
    calcFee: '💰 预估费用',
    fee: '平台手续费',
    warning: '⚠️ 本工具仅提供 NFT 铸造的技术服务，不提供任何交易撮合、定价或兑换功能。用户自行承担持有和处置 NFT 的一切后果。',
    needWallet: '请先连接钱包',
    fillAll: '请完整填写信息',
    deploying: '构建部署交易...',
    waiting: '等待钱包签名...',
    broadcasting: '等待上链确认...',
    success: '✅ 操作成功',
    failed: '❌ 操作失败',
    noHistory: '暂无已部署的合约',
    nextStep: '👇 下一步：复制合约地址到上方铸造框',
    connected: '已连接',
  },
  en: {
    title: '🎨 NFT Launcher',
    desc: 'Deploy PRC-721 NFT contracts to Paxi Network with one click. Supports batch minting.',
    deploy: 'Deploy NFT Contract',
    batchMint: 'Batch Mint NFT',
    contractHistory: 'Deployed Contracts',
    contractAddr: 'NFT Contract Address',
    collectionName: 'Collection Name',
    symbol: 'Symbol',
    maxSupply: 'Max Supply',
    mint: 'Mint Count',
    deployBtn: '🚀 Deploy NFT Contract',
    mintBtn: '🏭 Execute Batch Mint',
    calcFee: '💰 Estimate Fee',
    fee: 'Platform Fee',
    warning: '⚠️ This tool only provides technical services for NFT minting. No trading, pricing, or exchange functions are offered. Users bear all consequences.',
    needWallet: 'Please connect wallet first',
    fillAll: 'Please fill in all fields',
    deploying: 'Building deploy transaction...',
    waiting: 'Waiting for wallet signature...',
    broadcasting: 'Waiting for confirmation...',
    success: '✅ Success',
    failed: '❌ Failed',
    noHistory: 'No deployed contracts',
    nextStep: '👇 Next: Copy contract address to mint field above',
    connected: 'Connected',
  }
};

function _nftL(k) {
  const lang = localStorage.getItem('paxi_lang') || 'zh';
  return (_NFT_LANG[lang] && _NFT_LANG[lang][k]) || (_NFT_LANG.en[k] || k);
}

let _nftDeployed = JSON.parse(localStorage.getItem('paxi_nft_deployed') || '[]');

function renderNftLauncher() {
  const walletAddr = (state && state.wallet) ? state.wallet.address : '';
  const connected = (state && state.connected);
  const l = _nftL;

  return `
    <div class="card">
      <div class="card-title">${l('title')}</div>
      <div class="tool-desc">${l('desc')}</div>
      <div style="margin:0 0 12px;padding:10px 12px;background:rgba(255,255,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:6px;font-size:11px;color:var(--text-muted);line-height:1.6;">
        ${l('warning')}
      </div>
      ${connected ? `<div style="font-size:11px;color:var(--success);margin-bottom:10px;">✓ ${l('connected')}: <code>${walletAddr.slice(0,12)}...</code></div>` : `<div style="font-size:11px;color:var(--warning);margin-bottom:10px;">⚠ ${l('needWallet')}</div>`}

      <!-- Deploy Section -->
      <div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:12px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px;">📦 ${l('deploy')}</div>
        <div class="form-group">
          <label class="form-label">${l('collectionName')} *</label>
          <input type="text" id="nftName" placeholder="Paxi Punks" maxlength="50">
        </div>
        <div class="form-group">
          <label class="form-label">${l('symbol')} *</label>
          <input type="text" id="nftSymbol" placeholder="PUNK" maxlength="20" style="text-transform:uppercase">
        </div>
        <div class="form-group">
          <label class="form-label">${l('maxSupply')}</label>
          <input type="number" id="nftMaxSupply" placeholder="2026" min="1" value="2026">
        </div>
        <button class="btn btn-primary btn-block" id="btnDeploy" style="margin-top:8px;" ${connected ? '' : 'disabled'}>${l('deployBtn')}</button>
        <div class="status-msg" id="nftDeployStatus"></div>
      </div>

      <!-- Mint Section -->
      <div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:12px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px;">🏭 ${l('batchMint')}</div>
        <div class="form-group">
          <label class="form-label">${l('contractAddr')} *</label>
          <input type="text" id="mintContractAddr" placeholder="paxi1...">
        </div>
        <div class="form-group">
          <label class="form-label">${l('mint')} *</label>
          <input type="number" id="mintCount" placeholder="5" min="1" max="10" value="5">
        </div>
        <div id="mintFeePreview" style="display:none;margin-bottom:10px;padding:10px;background:var(--bg-card);border-radius:6px;font-size:12px;">
          <span style="color:var(--text-muted)">${l('fee')}: </span><span id="mintFeeDisplay" style="color:var(--primary);font-weight:600;">-</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline btn-sm" id="btnCalcFee" ${connected ? '' : 'disabled'}>${l('calcFee')}</button>
          <button class="btn btn-success btn-sm" id="btnBatchMint" ${connected ? '' : 'disabled'}>${l('mintBtn')}</button>
        </div>
        <div class="status-msg" id="nftMintStatus"></div>
      </div>

      <!-- History Section -->
      <div style="background:var(--bg);border-radius:8px;padding:14px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:10px;">📜 ${l('contractHistory')}</div>
        <div id="nftDeployedList">
          ${_nftDeployed.length === 0 ? `<p style="color:var(--text-muted);font-size:12px">${l('noHistory')}</p>` : _nftDeployed.map(c => `
            <div style="background:var(--bg-card);border-radius:6px;padding:10px;margin-bottom:6px;font-size:12px;">
              <strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.symbol)})
              <div style="color:var(--text-muted);font-size:10px;margin-top:3px;">${c.contractAddr}</div>
              <button class="btn btn-outline btn-sm" style="margin-top:4px;padding:2px 8px;font-size:10px;" onclick="document.getElementById('mintContractAddr').value='${c.contractAddr}'">→ ${_nftL('contractAddr')}</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindNftLauncherEvents() {
  setTimeout(() => {
    const btnDeploy = document.getElementById('btnDeploy');
    const btnMint = document.getElementById('btnBatchMint');
    const btnCalc = document.getElementById('btnCalcFee');
    if (btnDeploy) btnDeploy.addEventListener('click', () => _deployNft());
    if (btnMint) btnMint.addEventListener('click', () => _mintNft());
    if (btnCalc) btnCalc.addEventListener('click', () => _calcMintFee());
  }, 100);
}

async function _deployNft() {
  if (!state || !state.connected) { showToast(_nftL('needWallet'), 'error'); return; }
  const name = document.getElementById('nftName').value.trim();
  const symbol = document.getElementById('nftSymbol').value.trim();
  if (!name || !symbol) { showToast(_nftL('fillAll'), 'warning'); return; }

  const btn = document.getElementById('btnDeploy');
  const statusEl = document.getElementById('nftDeployStatus');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ' + _nftL('deploying');

  try {
    const lcd = CONFIG.lcd;
    const denom = CONFIG.denom;
    const addr = state.wallet.address;

    const initMsg = JSON.stringify({ name, symbol, minter: addr });
    const instantiateMsg = PaxiCosmJS.MsgInstantiateContract.fromPartial({
      sender: addr,
      admin: addr,
      codeId: 2,
      label: `PaxiNFT-${name}-${Date.now()}`,
      msg: new TextEncoder().encode(initMsg),
      funds: [],
    });

    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
      value: PaxiCosmJS.MsgInstantiateContract.encode(instantiateMsg).finish(),
    })];

    btn.innerHTML = '<span class="spinner"></span> ' + _nftL('waiting');
    const memo = `Deploy PRC-721: ${name}`;
    const res = await buildSignAndBroadcast(messages, memo, null, state.wallet);

    const txHash = res?.tx_response?.txhash;
    if (!txHash) throw new Error('Failed to get tx hash');

    statusEl.className = 'status-msg info';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<strong>⏳ ${_nftL('broadcasting')}</strong><br><span style="font-size:11px">Tx: <code>${escapeHtml(txHash)}</code></span>`;

    const txResp = res?.tx_response || res;
    if (txResp.code !== undefined && txResp.code !== 0) throw new Error(txResp.raw_log || 'Failed');

    // Poll for confirmation
    if (typeof pollTxStatus === 'function') {
      const info = await pollTxStatus(txHash, 25);
      if (!info || !info.confirmed || !info.success) throw new Error(info?.rawLog || 'Failed');
    }

    // Extract contract address
    let contractAddr = null;
    const evs = (res?.tx_response || res)?.events || [];
    for (const ev of evs) {
      if (ev.type === 'instantiate') {
        for (const attr of ev.attributes || []) {
          if (attr.key === '_contract_address') {
            contractAddr = attr.value;
            break;
          }
        }
      }
      if (contractAddr) break;
    }

    statusEl.className = 'status-msg success';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
      <strong>✅ ${_nftL('success')}</strong><br>
      <strong>${_nftL('contractAddr')}:</strong> <code style="word-break:break-all;color:var(--primary)">${contractAddr || txHash}</code><br>
      <span style="font-size:11px;">Tx: <code style="font-size:11px">${escapeHtml(txHash)}</code></span><br>
      <span style="font-size:11px;color:var(--text-muted)">${_nftL('nextStep')}</span>
    `;

    // Save to history
    if (contractAddr) {
      _nftDeployed.unshift({ name, symbol, contractAddr, timestamp: Date.now() });
      localStorage.setItem('paxi_nft_deployed', JSON.stringify(_nftDeployed));
      _refreshDeployedList();
      document.getElementById('mintContractAddr').value = contractAddr;
    }

    showToast(_nftL('success'), 'success');
  } catch (e) {
    statusEl.className = 'status-msg error';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<strong>❌ ${_nftL('failed')}</strong><br>${escapeHtml(e.message || e)}`;
    showToast(_nftL('failed'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = _nftL('deployBtn');
  }
}

async function _mintNft() {
  if (!state || !state.connected) { showToast(_nftL('needWallet'), 'error'); return; }
  const contractAddr = document.getElementById('mintContractAddr').value.trim();
  const count = parseInt(document.getElementById('mintCount').value) || 0;
  if (!contractAddr || count < 1) { showToast(_nftL('fillAll'), 'warning'); return; }
  if (count > 10) { showToast('Max 10 per tx', 'warning'); return; }

  const btn = document.getElementById('btnBatchMint');
  const statusEl = document.getElementById('nftMintStatus');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ' + _nftL('deploying');

  try {
    const addr = state.wallet.address;
    const timestamp = Date.now();
    const messages = [];

    for (let i = 0; i < count; i++) {
      const tokenId = `${timestamp}_${i}`;
      const mintMsg = { mint: { token_id: tokenId, owner: addr, token_uri: '' } };
      const msg = PaxiCosmJS.MsgExecuteContract.fromPartial({
        sender: addr,
        contract: contractAddr,
        msg: new TextEncoder().encode(JSON.stringify(mintMsg)),
        funds: [],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: PaxiCosmJS.MsgExecuteContract.encode(msg).finish(),
      }));
    }

    // Platform fee (5 PAXI per batch)
    const feeAmount = paxiToUpaxi('5');
    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: addr,
      toAddress: (CONFIG.feeCollector || 'paxi1d0d2n4p0p6h8v2y6t4k8x0c4w2e6q8m2f4h6j0'),
      amount: [PaxiCosmJS.coins(feeAmount, CONFIG.denom)[0]],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    }));

    btn.innerHTML = '<span class="spinner"></span> ' + _nftL('waiting');
    const res = await buildSignAndBroadcast(messages, `Mint ${count} NFTs`, null, state.wallet);
    const txHash = res?.tx_response?.txhash;
    if (!txHash) throw new Error('Failed');

    statusEl.className = 'status-msg info';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<strong>⏳ ${_nftL('broadcasting')}</strong><br><span style="font-size:11px">Tx: <code>${escapeHtml(txHash)}</code></span>`;

    const txResp = res?.tx_response || res;
    if (txResp.code !== undefined && txResp.code !== 0) throw new Error(txResp.raw_log || 'Failed');

    if (typeof pollTxStatus === 'function') {
      const info = await pollTxStatus(txHash, 25);
      if (!info || !info.confirmed || !info.success) throw new Error(info?.rawLog || 'Failed');
    }

    statusEl.className = 'status-msg success';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
      <strong>✅ ${_nftL('success')}: ${count} NFTs</strong><br>
      <span style="font-size:11px">Tx: <code style="font-size:11px">${escapeHtml(txHash)}</code></span>
    `;
    showToast(`${count} NFTs minted`, 'success');
  } catch (e) {
    statusEl.className = 'status-msg error';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<strong>❌ ${_nftL('failed')}</strong><br>${escapeHtml(e.message || e)}`;
    showToast(_nftL('failed'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = _nftL('mintBtn');
  }
}

function _calcMintFee() {
  const count = parseInt(document.getElementById('mintCount').value) || 0;
  if (count < 1) return;
  const totalFee = (5 * count).toFixed(2);
  document.getElementById('mintFeeDisplay').textContent = `${totalFee} PAXI`;
  document.getElementById('mintFeePreview').style.display = 'block';
}

function _refreshDeployedList() {
  const container = document.getElementById('nftDeployedList');
  if (!container) return;
  const l = _nftL;
  container.innerHTML = _nftDeployed.length === 0
    ? `<p style="color:var(--text-muted);font-size:12px">${l('noHistory')}</p>`
    : _nftDeployed.map(c => `
        <div style="background:var(--bg-card);border-radius:6px;padding:10px;margin-bottom:6px;font-size:12px;">
          <strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.symbol)})
          <div style="color:var(--text-muted);font-size:10px;margin-top:3px;word-break:break-all;">${c.contractAddr}</div>
          <button class="btn btn-outline btn-sm" style="margin-top:4px;padding:2px 8px;font-size:10px;" onclick="document.getElementById('mintContractAddr').value='${c.contractAddr}'">→ ${l('contractAddr')}</button>
        </div>
      `).join('');
}

window.TOOL_REGISTRY['nft-launcher'] = {
  render: renderNftLauncher,
  bind: bindNftLauncherEvents,
};
