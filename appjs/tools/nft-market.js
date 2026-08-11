TOOL_REGISTRY['nft-market'] = { render: renderNftMarket, bind: bindNftMarketEvents };

const LS_KEY_LISTINGS = 'paxi_nft_market_listings';
const LS_KEY_IMPORTED = 'paxi_nft_market_imported';

function getMarketListings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_LISTINGS) || '[]'); }
  catch { return []; }
}
function saveListing(listing) {
  const list = getMarketListings();
  list.unshift(listing);
  localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
}
function removeListing(listingId) {
  let list = getMarketListings();
  list = list.filter(l => l.id !== listingId);
  localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
}
function updateListing(listingId, updates) {
  const list = getMarketListings();
  const idx = list.findIndex(l => l.id === listingId);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    localStorage.setItem(LS_KEY_LISTINGS, JSON.stringify(list));
  }
}
function getImportedListings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_IMPORTED) || '[]'); }
  catch { return []; }
}
function saveImportedListing(listing) {
  const list = getImportedListings();
  if (!list.find(l => l.id === listing.id)) {
    list.unshift(listing);
    localStorage.setItem(LS_KEY_IMPORTED, JSON.stringify(list));
  }
}
function removeImportedListing(listingId) {
  let list = getImportedListings();
  list = list.filter(l => l.id !== listingId);
  localStorage.setItem(LS_KEY_IMPORTED, JSON.stringify(list));
}
function getAllActiveListings() {
  const own = getMarketListings().filter(l => l.status === 'listed' || l.status === 'granted');
  const imported = getImportedListings().filter(l => l.status === 'listed' || l.status === 'granted');
  const seen = new Set();
  const all = [...own, ...imported].filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  return all.filter(l => new Date(l.expiresAt) > new Date());
}

function generateShareCode(listing) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(listing))));
}
function parseShareCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}
function generateBuyRequestCode(listing, buyer) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({
    type: 'buy_request',
    listingId: listing.id,
    contract: listing.contract,
    tokenId: listing.tokenId,
    price: listing.price,
    seller: listing.seller,
    buyer,
    timestamp: new Date().toISOString(),
  }))));
}
function parseBuyRequestCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}

async function queryNftOwner(contract, tokenId) {
  const queryMsg = { owner_of: { token_id: String(tokenId) } };
  const encodedMsg = btoa(JSON.stringify(queryMsg));
  const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
  if (!res.ok) throw new Error(`查询 NFT owner 失败: HTTP ${res.status}`);
  const data = await res.json();
  return data.data?.owner;
}
async function queryNftInfo(contract, tokenId) {
  const owner = await queryNftOwner(contract, tokenId);
  let info = {};
  try {
    const queryMsg = { nft_info: { token_id: String(tokenId) } };
    const encodedMsg = btoa(JSON.stringify(queryMsg));
    const res = await fetch(`${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encodedMsg}`);
    if (res.ok) {
      const data = await res.json();
      info = data.data || {};
    }
  } catch (e) {}
  return {
    access: { owner, approvals: [] },
    info: { token_uri: info.token_uri || '', extension: info.extension || {} },
  };
}
async function checkGrantStatus(seller, buyer) {
  const url = `${CONFIG.lcd}/cosmos/authz/v1beta1/grants?granter=${seller}&grantee=${buyer}&msg_type_url=${encodeURIComponent(CONFIG.nftMarket.msgTypeUrl)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`查询授权失败: HTTP ${res.status}`);
  const data = await res.json();
  const grants = data.grants || [];
  if (grants.length === 0) return null;
  const grant = grants[0];
  const exp = grant.expiration ? new Date(grant.expiration) : null;
  if (exp && exp < new Date()) return null;
  return grant;
}

function renderNftMarket() {
  if (state.nftMarket.currentBuy) {
    return renderBuyFlow();
  }
  const sub = state.nftMarket.subTab;
  const tabs = [
    { key: 'browse', label: t('nftMarket.tabs')[0] },
    { key: 'list', label: t('nftMarket.tabs')[1] },
    { key: 'mine', label: t('nftMarket.tabs')[2] },
    { key: 'import', label: t('nftMarket.tabs')[3] },
  ];
  let content = '';
  switch (sub) {
    case 'browse': content = renderMarketBrowse(); break;
    case 'list': content = renderMarketListForm(); break;
    case 'mine': content = renderMarketMine(); break;
    case 'import': content = renderMarketImport(); break;
  }
  return `
    <div class="card">
      <div class="card-title">${t('nftMarket.title')}</div>
      <div class="tool-desc">${t('nftMarket.desc')}</div>
      <div class="sub-tabs">
        ${tabs.map(t => `<div class="sub-tab ${sub === t.key ? 'active' : ''}" data-nft-tab="${t.key}">${t.label}</div>`).join('')}
      </div>
    </div>
    ${content}
  `;
}
function bindNftMarketEvents() {
  document.querySelectorAll('[data-nft-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.nftMarket.subTab = tab.dataset.nftTab;
      renderTool('nft-market');
    });
  });
  if (state.nftMarket.subTab === 'import') {
    renderImportedList();
  }
  if (state.nftMarket.currentBuy) {
    const codeEl = document.getElementById('buyReqCode');
    if (codeEl) {
      const code = generateBuyRequestCode(state.nftMarket.currentBuy.listing, state.wallet.address);
      codeEl.textContent = code;
    }
  }
}
function scrollToGrantPanel() {
  const el = document.getElementById('grantBuyRequest');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
  }
}

function renderMarketBrowse() {
  const listings = getAllActiveListings();
  if (listings.length === 0) {
    return `
      <div class="card">
        <div style="text-align:center;padding:32px 16px;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">🏪</div>
          <div style="font-size:14px;margin-bottom:8px">暂无在售 NFT</div>
          <div style="font-size:12px">从卖家获取分享码，在「导入」页粘贴即可浏览</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="nft-market-grid">
      ${listings.map(l => {
        const isOwn = l.seller === state.wallet?.address;
        const expired = new Date(l.expiresAt) < new Date();
        return `
          <div class="nft-card">
            <div class="nft-card-img">
              ${l.image ? `<img src="${sanitizeUrl(l.image)}" alt="NFT" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
              <div class="nft-card-placeholder" style="${l.image ? 'display:none' : 'display:flex'}">🎨</div>
            </div>
            <div class="nft-card-body">
              <div class="nft-card-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
              <div class="nft-card-meta">Token #${escapeHtml(l.tokenId)}</div>
              <div class="nft-card-price">${escapeHtml(l.price)} PAXI</div>
              <div class="nft-card-seller">卖家: ${escapeHtml(l.seller.slice(0,10))}...${escapeHtml(l.seller.slice(-4))}</div>
              ${expired
                ? '<div class="nft-card-badge" style="color:var(--danger)">已过期</div>'
                : isOwn
                  ? '<div class="nft-card-badge" style="color:var(--text-muted)">我的</div>'
                  : `<button class="btn btn-primary btn-block" onclick="startBuyFlow('${l.id}')">购买</button>`
              }
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
function renderMarketListForm() {
  return `
    <div class="card">
      <div class="card-title">📤 上架 NFT</div>
      <div class="tool-desc">
        填写 NFT 合约地址和 Token ID，系统将查询链上信息确认你持有该 NFT，
        然后生成分享码供买家导入。上架免费，授权时收取 ${CONFIG.nftMarket.listingFee} PAXI 服务费。
      </div>
      <div class="form-group">
        <label class="form-label">NFT 合约地址 *</label>
        <input type="text" id="nmContract" placeholder="paxi1...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Token ID *</label>
          <input type="text" id="nmTokenId" placeholder="例如：1">
        </div>
        <div class="form-group">
          <label class="form-label">售价 (PAXI) *</label>
          <input type="number" id="nmPrice" placeholder="100" step="0.01" min="0">
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="queryNftForListing()">🔍 查询NFT信息</button>
        <button class="btn btn-primary" id="btnListNft" onclick="listNft()">📤 上架</button>
      </div>
      <div id="nmPreview" style="margin-top:16px"></div>
      <div class="status-msg" id="nmStatus"></div>
    </div>
  `;
}
function renderMarketMine() {
  const listings = getMarketListings();
  if (listings.length === 0) {
    return `
      <div class="card">
        <div style="text-align:center;padding:32px 16px;color:var(--text-muted)">
          <div style="font-size:40px;margin-bottom:12px">📋</div>
          <div style="font-size:14px">暂无上架记录</div>
        </div>
      </div>
    `;
  }
  return `
    <div class="card">
      <div class="card-title">📋 我的上架</div>
      ${listings.map(l => {
        const expired = new Date(l.expiresAt) < new Date();
        const statusLabel = l.status === 'sold' ? '已售' : l.status === 'delisted' ? '已下架' : expired ? '已过期' : l.status === 'granted' ? '已授权' : '在售';
        const statusColor = l.status === 'sold' ? 'var(--success)' : l.status === 'delisted' ? 'var(--text-muted)' : expired ? 'var(--danger)' : l.status === 'granted' ? 'var(--warning)' : 'var(--primary)';
        return `
          <div class="listing-item">
            <div class="listing-item-main">
              <div class="listing-item-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
              <div class="listing-item-meta">
                Token #${escapeHtml(l.tokenId)} · ${escapeHtml(l.price)} PAXI
              </div>
              <div class="listing-item-meta">
                <code style="word-break:break-all;font-size:10px">${escapeHtml(l.contract.slice(0,16))}...</code>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(99,102,241,0.15);color:${statusColor}">${statusLabel}</span>
                <span style="font-size:11px;color:var(--text-muted)">${new Date(l.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="listing-item-actions">
              ${(l.status === 'listed' || l.status === 'granted') && !expired
                ? `<button class="btn btn-outline btn-sm" onclick="copyShareCode('${l.id}')">📋 分享码</button>`
                : ''}
              ${l.status === 'listed' && !expired
                ? `<button class="btn btn-outline btn-sm" onclick="scrollToGrantPanel()">🔑 授权</button>`
                : ''}
              ${l.status === 'granted' && l.grantee && !expired
                ? `<button class="btn btn-danger btn-sm" onclick="revokeGrant('${l.grantee}','${l.id}')">撤销授权</button>`
                : ''}
              ${l.status !== 'sold'
                ? `<button class="btn btn-outline btn-sm" onclick="delistNft('${l.id}')">下架</button>`
                : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">🔑 授权买家</div>
      <div class="tool-desc">
        买家向你发送购买请求码后，在此粘贴并授权。授权后买家可在 <strong style="color:var(--warning)">${CONFIG.nftMarket.grantDurationSec / 60} 分钟</strong>内执行购买。
      </div>
      <div class="info-box" style="background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.3)">
        <strong style="color:var(--warning)">⚠️ 安全提示：</strong>
        Authz 授权按消息类型生效，买家可在有效期内代表你执行任意 <code>MsgExecuteContract</code>。
        请仅授权给信任的买家，授权时长已缩短至 ${CONFIG.nftMarket.grantDurationSec / 60} 分钟。成交或下架后授权将自动失效。
      </div>
      <div class="form-group">
        <label class="form-label">购买请求码</label>
        <textarea id="grantBuyRequest" placeholder="粘贴买家发来的购买请求码..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn-primary" id="btnGrantNft" onclick="grantNft()">🔑 授权交易</button>
      <div class="status-msg" id="grantStatus"></div>
    </div>
  `;
}
function renderMarketImport() {
  return `
    <div class="card">
      <div class="card-title">📥 导入 NFT 订单</div>
      <div class="tool-desc">粘贴卖家分享的 NFT 上架码，导入后可在「市场浏览」中查看和购买。</div>
      <div class="form-group">
        <label class="form-label">分享码</label>
        <textarea id="importCode" placeholder="粘贴卖家分享的上架码..." style="min-height:100px"></textarea>
      </div>
      <button class="btn btn-primary" onclick="importListing()">📥 导入</button>
      <div class="status-msg" id="importStatus"></div>
    </div>
    <div class="card">
      <div class="card-title">📥 已导入的订单</div>
      <div id="importedList"></div>
    </div>
  `;
}
function renderImportedList() {
  const list = getImportedListings();
  const el = document.getElementById('importedList');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">暂无导入的订单</p>';
    return;
  }
  el.innerHTML = list.map(l => {
    const expired = new Date(l.expiresAt) < new Date();
    return `
      <div class="listing-item">
        <div class="listing-item-main">
          <div class="listing-item-name">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
          <div class="listing-item-meta">Token #${escapeHtml(l.tokenId)} · ${escapeHtml(l.price)} PAXI</div>
          <div class="listing-item-meta">卖家: ${escapeHtml(l.seller.slice(0,12))}...${escapeHtml(l.seller.slice(-4))}</div>
          ${expired ? '<span style="font-size:11px;color:var(--danger)">已过期</span>' : ''}
        </div>
        <div class="listing-item-actions">
          <button class="btn btn-outline btn-sm" onclick="removeImportedListing('${l.id}');renderImportedList();">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderBuyFlow() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return '';
  const l = buy.listing;
  const step = buy.step;
  const fee = (parseFloat(l.price) * CONFIG.nftMarket.buyFeeRate / 100).toFixed(4);
  const total = (parseFloat(l.price) + parseFloat(fee)).toFixed(6);
  return `
    <div class="card">
      <div class="back-bar" onclick="cancelBuyFlow()">← 返回市场</div>
      <div class="card-title">🛒 购买 NFT</div>
      <div class="nft-buy-detail">
        <div class="nft-card-img" style="width:120px;height:120px;margin:0 auto 12px">
          ${l.image ? `<img src="${sanitizeUrl(l.image)}" style="width:120px;height:120px;border-radius:12px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:120px;height:120px;border-radius:12px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:40px">🎨</div>'}
        </div>
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-weight:700">${escapeHtml(l.name || 'NFT #' + l.tokenId)}</div>
          <div style="font-size:12px;color:var(--text-muted)">Token #${escapeHtml(l.tokenId)}</div>
        </div>
        <div class="price-breakdown">
          <div class="price-row"><span>售价</span><span>${escapeHtml(l.price)} PAXI</span></div>
          <div class="price-row"><span>平台费 (${CONFIG.nftMarket.buyFeeRate}%)</span><span>${fee} PAXI</span></div>
          <div class="price-row total"><span>合计</span><span>${total} PAXI</span></div>
        </div>
      </div>
      <div class="buy-steps">
        <div class="buy-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}">
          <div class="buy-step-num">${step > 1 ? '✓' : '1'}</div>
          <div class="buy-step-label">复制地址</div>
        </div>
        <div class="buy-step-line ${step > 1 ? 'done' : ''}"></div>
        <div class="buy-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}">
          <div class="buy-step-num">${step > 2 ? '✓' : '2'}</div>
          <div class="buy-step-label">等待授权</div>
        </div>
        <div class="buy-step-line"></div>
        <div class="buy-step ${step >= 3 ? 'active' : ''}">
          <div class="buy-step-num">3</div>
          <div class="buy-step-label">执行购买</div>
        </div>
      </div>
      ${step === 1 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">将以下地址或购买请求码发送给卖家，卖家授权后进入下一步。</p>
          <div class="copy-box">
            <label class="form-label">你的钱包地址</label>
            <div class="copy-row">
              <code style="flex:1;word-break:break-all;font-size:11px">${escapeHtml(state.wallet?.address || '')}</code>
              <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${state.wallet?.address || ''}').then(()=>showToast('已复制','success'))">📋</button>
            </div>
          </div>
          <div class="copy-box">
            <label class="form-label">购买请求码（含NFT信息，推荐）</label>
            <div class="copy-row">
              <code id="buyReqCode" style="flex:1;word-break:break-all;font-size:10px"></code>
              <button class="btn btn-outline btn-sm" id="btnCopyBuyReq" onclick="copyBuyReqCode()">📋</button>
            </div>
          </div>
          <button class="btn btn-primary btn-block" onclick="advanceBuyStep(2)">已发送，下一步 →</button>
        </div>
      ` : ''}
      ${step === 2 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">确认卖家已授权后，点击下方检查授权状态。</p>
          <button class="btn btn-outline btn-block" onclick="checkBuyGrant()">🔍 检查授权状态</button>
          <div class="status-msg" id="buyGrantStatus"></div>
          <button class="btn btn-primary btn-block" id="btnBuyStep3" style="margin-top:12px;display:none" onclick="advanceBuyStep(3)">授权确认，执行购买 →</button>
        </div>
      ` : ''}
      ${step === 3 ? `
        <div class="buy-step-content">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">点击执行原子购买，一笔交易同时付款 + NFT 到账。</p>
          <button class="btn btn-success btn-block" id="btnExecuteBuy" onclick="executeBuy()">🚀 执行原子购买</button>
          <div class="status-msg" id="buyExecuteStatus"></div>
        </div>
      ` : ''}
    </div>
  `;
}

async function queryNftForListing() {
  const contract = document.getElementById('nmContract')?.value.trim();
  const tokenId = document.getElementById('nmTokenId')?.value.trim();
  const preview = document.getElementById('nmPreview');
  if (!contract || !tokenId) {
    showStatus('nmStatus', '请填写合约地址和 Token ID', 'warning');
    return;
  }
  showStatus('nmStatus', '查询中...', 'info');
  try {
    const info = await queryNftInfo(contract, tokenId);
    const owner = info.access?.owner;
    const ext = info.info?.extension || {};
    const name = ext.name || ext.token_name || '';
    const image = ext.image || ext.image_url || '';
    const isOwner = state.wallet && owner === state.wallet.address;
    preview.innerHTML = `
      <div class="nft-preview-box">
        ${image ? `<img src="${sanitizeUrl(image)}" style="width:100px;height:100px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:100px;height:100px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:32px">🎨</div>'}
        <div>
          <div style="font-weight:700">${escapeHtml(name || 'NFT #' + tokenId)}</div>
          <div style="font-size:12px;color:var(--text-muted)">Token #${escapeHtml(tokenId)}</div>
          <div style="font-size:12px;margin-top:4px">持有者: <code style="font-size:10px">${escapeHtml(owner ? owner.slice(0,14)+'...' : '未知')}</code></div>
          <div style="font-size:12px;margin-top:4px;color:${isOwner ? 'var(--success)' : 'var(--danger)'}">${isOwner ? '✅ 你持有此 NFT' : '❌ 你不是此 NFT 的持有者'}</div>
        </div>
      </div>
    `;
    showStatus('nmStatus', '', '');
    document.getElementById('nmStatus').style.display = 'none';
  } catch (e) {
    showStatus('nmStatus', '查询失败：' + e.message, 'error');
    preview.innerHTML = '';
  }
}
async function listNft() {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const contract = document.getElementById('nmContract').value.trim();
  const tokenId = document.getElementById('nmTokenId').value.trim();
  const priceStr = document.getElementById('nmPrice').value.trim();
  if (!contract || !tokenId || !priceStr) {
    showStatus('nmStatus', '请填写所有必填项', 'warning');
    return;
  }
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) {
    showStatus('nmStatus', '价格必须大于 0', 'warning');
    return;
  }
  const btn = document.getElementById('btnListNft');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 上架中...';
  try {
    const info = await queryNftInfo(contract, tokenId);
    const owner = info.access?.owner;
    if (!owner) throw new Error('无法查询 NFT 持有者');
    if (owner !== state.wallet.address) throw new Error('你不是此 NFT 的持有者');
    const existingListings = getMarketListings();
    const duplicate = existingListings.find(l =>
      l.contract === contract &&
      l.tokenId === String(tokenId) &&
      (l.status === 'listed' || l.status === 'granted') &&
      new Date(l.expiresAt) > new Date()
    );
    if (duplicate) throw new Error('此 NFT 已在售（已上架且未过期），请先下架再重新上架');
    const ext = info.info?.extension || {};
    const name = ext.name || ext.token_name || `NFT #${tokenId}`;
    const image = ext.image || ext.image_url || '';
    const now = new Date();
    const listing = {
      id: 'lst_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      contract, tokenId: String(tokenId), price: priceStr,
      priceMicro: paxiToUpaxi(priceStr),
      seller: state.wallet.address, name, image,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CONFIG.nftMarket.listingDurationSec * 1000).toISOString(),
      status: 'listed'
    };
    saveListing(listing);
    const shareCode = generateShareCode(listing);
    showStatus('nmStatus', '✅ 上架成功！', 'success');
    document.getElementById('nmPreview').innerHTML = `
      <div class="info-box">
        <strong>📋 分享码（发送给买家）：</strong>
        <div class="copy-row" style="margin-top:8px">
          <code id="listShareCode" style="flex:1;word-break:break-all;font-size:10px">${escapeHtml(shareCode)}</code>
          <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${shareCode}').then(()=>showToast('已复制','success'))">📋</button>
        </div>
      </div>
    `;
    showToast('上架成功！', 'success');
  } catch (e) {
    showStatus('nmStatus', '❌ 上架失败：' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📤 上架';
  }
}
function copyShareCode(listingId) {
  const listing = getMarketListings().find(l => l.id === listingId);
  if (!listing) return;
  const code = generateShareCode(listing);
  copyToClipboard(code).then(() => showToast('分享码已复制', 'success'));
}
function importListing() {
  const code = document.getElementById('importCode').value.trim();
  if (!code) { showStatus('importStatus', '请粘贴分享码', 'warning'); return; }
  try {
    const listing = parseShareCode(code);
    if (!listing.contract || !listing.tokenId || !listing.seller || !listing.price) {
      throw new Error('分享码格式不正确');
    }
    saveImportedListing(listing);
    showStatus('importStatus', `✅ 导入成功：${escapeHtml(listing.name || 'NFT #' + listing.tokenId)}`, 'success');
    document.getElementById('importCode').value = '';
    renderImportedList();
  } catch (e) {
    showStatus('importStatus', '❌ 导入失败：' + e.message, 'error');
  }
}
function startBuyFlow(listingId) {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const listings = getAllActiveListings();
  const listing = listings.find(l => l.id === listingId);
  if (!listing) { showToast('订单不存在或已过期', 'error'); return; }
  if (listing.seller === state.wallet.address) { showToast('不能购买自己的 NFT', 'error'); return; }
  state.nftMarket.currentBuy = { listing, step: 1 };
  renderTool('nft-market');
}
function cancelBuyFlow() {
  state.nftMarket.currentBuy = null;
  state.nftMarket.subTab = 'browse';
  renderTool('nft-market');
}
function advanceBuyStep(step) {
  if (state.nftMarket.currentBuy) {
    state.nftMarket.currentBuy.step = step;
    renderTool('nft-market');
  }
}
function copyBuyReqCode() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const code = generateBuyRequestCode(buy.listing, state.wallet.address);
  copyToClipboard(code).then(() => showToast('购买请求码已复制', 'success'));
}
async function checkBuyGrant() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const seller = buy.listing.seller;
  const buyer = state.wallet.address;
  showStatus('buyGrantStatus', '查询授权中...', 'info');
  try {
    const grant = await checkGrantStatus(seller, buyer);
    if (grant) {
      showStatus('buyGrantStatus', '✅ 卖家已授权！可以执行购买了', 'success');
      document.getElementById('btnBuyStep3').style.display = 'inline-flex';
    } else {
      showStatus('buyGrantStatus', '⏳ 卖家尚未授权，或授权已过期。请提醒卖家授权。', 'warning');
    }
  } catch (e) {
    showStatus('buyGrantStatus', '❌ 查询失败：' + e.message, 'error');
  }
}
async function grantNft() {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  const code = document.getElementById('grantBuyRequest').value.trim();
  if (!code) { showStatus('grantStatus', '请粘贴购买请求码', 'warning'); return; }
  const btn = document.getElementById('btnGrantNft');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 授权中...';
  try {
    const req = parseBuyRequestCode(code);
    if (req.type !== 'buy_request' || !req.buyer) throw new Error('购买请求码格式不正确');
    if (req.seller !== state.wallet.address) throw new Error('此购买请求不是发给你');
    const listings = getMarketListings();
    const listing = listings.find(l => l.id === req.listingId);
    if (!listing) throw new Error('找不到对应的上架记录');
    const now = Math.floor(Date.now() / 1000);
    const expiration = { seconds: BigInt(now + CONFIG.nftMarket.grantDurationSec), nanos: 0 };
    const genericAuthBytes = PaxiCosmJS.GenericAuthorization.encode({
      msg: CONFIG.nftMarket.msgTypeUrl,
    }).finish();
    const authorization = { typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization', value: genericAuthBytes };
    const grant = { authorization, expiration };
    const grantMsg = PaxiCosmJS.MsgGrant.fromPartial({
      granter: state.wallet.address,
      grantee: req.buyer,
      grant,
    });
    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: PaxiCosmJS.MsgGrant.encode(grantMsg).finish(),
    })];
    const feeMicro = paxiToUpaxi(CONFIG.nftMarket.listingFee.toFixed(6));
    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [PaxiCosmJS.coins(feeMicro, CONFIG.denom)[0]],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    }));
    btn.innerHTML = '<span class="spinner"></span> 等待签名...';
    const memo = `Paxi NFT Market: Grant to ${req.buyer.slice(0,12)}... | Fee: ${CONFIG.nftMarket.listingFee} PAXI`;
    const res = await buildSignAndBroadcast(messages, memo, 300000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      updateListing(listing.id, { status: 'granted', grantee: req.buyer });
      showStatus('grantStatus', `✅ 授权成功！买家可在 ${CONFIG.nftMarket.grantDurationSec / 60} 分钟内执行购买。TxHash: ${txResult.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) showToast('交易已上链确认', 'success');
        else if (conf.confirmed && !conf.success) showToast('交易上链但执行失败', 'error');
      });
      document.getElementById('grantBuyRequest').value = '';
      showToast('授权成功', 'success');
      setTimeout(() => {
        state.nftMarket.subTab = 'mine';
        renderTool('nft-market');
      }, 2000);
    } else {
      showStatus('grantStatus', `❌ 授权失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('Grant error:', e);
    showStatus('grantStatus', '❌ 授权失败：' + mapError(undefined, e.message), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔑 授权交易';
  }
}
async function revokeGrant(grantee, listingId) {
  if (!state.connected) { showToast('请先连接钱包', 'error'); return; }
  if (!confirm('确定撤销对该买家的授权？')) return;
  try {
    const revokeMsg = PaxiCosmJS.MsgRevoke.fromPartial({
      granter: state.wallet.address,
      grantee,
      msgTypeUrl: CONFIG.nftMarket.msgTypeUrl,
    });
    const messages = [PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
      value: PaxiCosmJS.MsgRevoke.encode(revokeMsg).finish(),
    })];
    showToast('等待签名...', 'info');
    const res = await buildSignAndBroadcast(messages, 'Paxi NFT Market: Revoke grant', 200000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      updateListing(listingId, { status: 'listed', grantee: null });
      showToast('授权已撤销', 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed) showToast(conf.success ? '撤销已上链' : '撤销交易失败', conf.success ? 'success' : 'error');
      });
      renderTool('nft-market');
    } else {
      showToast('撤销失败：' + mapError(txResult.code, txResult.rawLog), 'error');
    }
  } catch (e) {
    showToast('撤销失败：' + mapError(undefined, e.message), 'error');
  }
}
async function executeBuy() {
  const buy = state.nftMarket.currentBuy;
  if (!buy) return;
  const l = buy.listing;
  const btn = document.getElementById('btnExecuteBuy');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 构建交易...';
  try {
    const grant = await checkGrantStatus(l.seller, state.wallet.address);
    if (!grant) throw new Error('卖家授权已失效或不存在，请提醒卖家重新授权');
    const messages = [];
    const priceMicro = l.priceMicro || paxiToUpaxi(l.price);
    const payMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: l.seller,
      amount: [PaxiCosmJS.coins(priceMicro, CONFIG.denom)[0]],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(payMsg).finish(),
    }));
    const feeAmount = parseFloat(l.price) * CONFIG.nftMarket.buyFeeRate / 100;
    const feeMicro = paxiToUpaxi(feeAmount.toFixed(6));
    if (feeMicro !== '0') {
      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: state.wallet.address,
        toAddress: CONFIG.feeCollector,
        amount: [PaxiCosmJS.coins(feeMicro, CONFIG.denom)[0]],
      });
      messages.push(PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      }));
    }
    const transferMsg = { transfer_nft: { recipient: state.wallet.address, token_id: String(l.tokenId) } };
    const innerExecMsg = PaxiCosmJS.MsgExecuteContract.fromPartial({
      sender: l.seller,
      contract: l.contract,
      msg: new TextEncoder().encode(JSON.stringify(transferMsg)),
    });
    const innerAny = {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: PaxiCosmJS.MsgExecuteContract.encode(innerExecMsg).finish(),
    };
    const execMsg = PaxiCosmJS.MsgExec.fromPartial({
      grantee: state.wallet.address,
      msgs: [innerAny],
    });
    messages.push(PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: PaxiCosmJS.MsgExec.encode(execMsg).finish(),
    }));
    btn.innerHTML = '<span class="spinner"></span> 等待签名...';
    const memo = `Paxi NFT Market: Buy ${l.name || 'NFT #'+l.tokenId} | ${l.price} PAXI`;
    const res = await buildSignAndBroadcast(messages, memo, 600000, state.wallet);
    const txResult = checkTxResult(res);
    if (txResult.ok) {
      showStatus('buyExecuteStatus', `✅ 购买成功！NFT 已到账。TxHash: ${txResult.txhash.slice(0,20)}...`, 'success');
      removeListing(l.id);
      removeImportedListing(l.id);
      btn.style.display = 'none';
      showToast('🎉 购买成功！NFT 已到账', 'success');
      pollTxStatus(txResult.txhash).then(conf => {
        if (conf.confirmed && conf.success) showToast('交易已上链确认', 'success');
        else if (conf.confirmed && !conf.success) showToast('⚠️ 交易上链但执行失败：' + mapError(conf.code, conf.rawLog), 'error');
      });
      setTimeout(() => {
        cancelBuyFlow();
        refreshBalance();
      }, 3000);
    } else {
      showStatus('buyExecuteStatus', `❌ 购买失败：${mapError(txResult.code, txResult.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('Buy error:', e);
    showStatus('buyExecuteStatus', '❌ 执行失败：' + mapError(undefined, e.message), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🚀 执行原子购买';
  }
}
function delistNft(listingId) {
  if (!confirm('确定下架此 NFT？')) return;
  removeListing(listingId);
  showToast('已下架', 'success');
  renderTool('nft-market');
}
