/**
 * 我的 NFT 查看器 (my-nfts)
 * 查询任意地址持有的 NFT，显示图片、名称、属性等完整信息
 * 支持：合约选择器、网格卡片、详情弹窗、分页、导出CSV、缓存、并发、超时
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

// ============================================================
// 状态
// ============================================================
const _NFTV_PAGE_SIZE = 20;
const _NFTV_CONCURRENCY = 10;
const _NFTV_META_TIMEOUT = 5000;
const _NFTV_CACHE_TTL = 5 * 60 * 1000; // 5 分钟

let _nftvState = {
  owner: '',
  contract: '',
  tokens: [],        // 全部 token id
  infos: {},         // tokenId -> { token_uri, extension }
  displays: {},      // tokenId -> { name, image, desc, attrs, tokenUri }
  rendered: 0,
  loading: false,
};
const _nftvCache = {}; // key -> { tokens, infos, displays, ts }

// ============================================================
// 渲染
// ============================================================
function renderMyNfts() {
  const walletAddr = (state && state.wallet) ? state.wallet.address : '';
  const deployed = JSON.parse(localStorage.getItem('paxi_nft_deployed') || '[]');

  const contractOptions = [
    `<option value="">${t('myNfts.selectContract')}</option>`,
    ...deployed.map(c => `<option value="${escapeHtml(c.contractAddr || '')}">${escapeHtml(c.name || '?')} (${escapeHtml((c.contractAddr || '').slice(0, 10))}...)</option>`),
    `<option value="__manual">${t('myNfts.manualInput')}</option>`,
  ].join('');

  return `
    <div class="card">
      <div class="card-title">${t('myNfts.title')}</div>
      <div class="tool-desc">${t('myNfts.desc')}</div>
      <div class="info-box">${t('myNfts.disclaimer')}</div>

      <div class="form-group">
        <label class="form-label">${t('myNfts.walletAddr')}</label>
        <input type="text" id="nftvOwner" placeholder="paxi1..." value="${escapeHtml(walletAddr)}">
      </div>

      <div class="form-group">
        <label class="form-label">${t('myNfts.contract')}</label>
        <select id="nftvContractSelect" style="font-family:sans-serif;">
          ${contractOptions}
        </select>
        <input type="text" id="nftvContractManual" placeholder="paxi1..." style="display:none;margin-top:8px;">
      </div>

      <button class="btn btn-primary btn-block" id="btnNftvQuery">${t('myNfts.query')}</button>
      <div class="status-msg" id="nftvStatus"></div>
    </div>

    <div class="card" id="nftvResultsCard" style="display:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div id="nftvSummary" style="font-size:13px;font-weight:700;"></div>
        <button class="btn btn-outline btn-sm" id="btnNftvExport" style="display:none;">${t('myNfts.exportCsv')}</button>
      </div>
      <div class="nft-market-grid" id="nftvGrid"></div>
      <div id="nftvLoadMoreWrap" style="text-align:center;margin-top:14px;display:none;">
        <button class="btn btn-outline btn-sm" id="btnNftvLoadMore">${t('myNfts.loadMore')}</button>
      </div>
    </div>
  `;
}

function bindMyNftsEvents() {
  setTimeout(() => {
    const sel = document.getElementById('nftvContractSelect');
    const manual = document.getElementById('nftvContractManual');
    if (sel) sel.addEventListener('change', () => {
      if (manual) manual.style.display = (sel.value === '__manual') ? 'block' : 'none';
    });

    const btnQuery = document.getElementById('btnNftvQuery');
    if (btnQuery) btnQuery.addEventListener('click', queryMyNfts);

    const btnLoadMore = document.getElementById('btnNftvLoadMore');
    if (btnLoadMore) btnLoadMore.addEventListener('click', renderNextPage);

    const btnExport = document.getElementById('btnNftvExport');
    if (btnExport) btnExport.addEventListener('click', exportNftsCsv);

    // 卡片点击委托（详情弹窗）
    const grid = document.getElementById('nftvGrid');
    if (grid) grid.addEventListener('click', (e) => {
      const card = e.target.closest('.nft-card[data-token-id]');
      if (card) showNftDetail(card.dataset.tokenId);
    });
  }, 100);
}

// ============================================================
// 查询主流程
// ============================================================
async function queryMyNfts() {
  const owner = (document.getElementById('nftvOwner')?.value || '').trim();
  const sel = document.getElementById('nftvContractSelect');
  let contract = sel ? sel.value : '';
  if (contract === '__manual') {
    contract = (document.getElementById('nftvContractManual')?.value || '').trim();
  }
  if (!owner) { showToast(t('myNfts.walletAddr'), 'warning'); return; }
  if (!contract) { showToast(t('myNfts.noContract'), 'warning'); return; }

  const statusEl = document.getElementById('nftvStatus');
  const resultsCard = document.getElementById('nftvResultsCard');
  _nftvState = { owner, contract, tokens: [], infos: {}, displays: {}, rendered: 0, loading: true };

  // 缓存命中
  const cacheKey = `${contract}:${owner}`;
  const cached = _nftvCache[cacheKey];
  if (cached && Date.now() - cached.ts < _NFTV_CACHE_TTL) {
    _nftvState.tokens = cached.tokens;
    _nftvState.infos = cached.infos;
    _nftvState.displays = cached.displays;
    _renderResults(t('myNfts.cached'));
    return;
  }

  if (statusEl) { statusEl.className = 'status-msg info'; statusEl.style.display = 'block'; statusEl.innerHTML = `<span class="spinner"></span> ${t('myNfts.querying')}`; }
  if (resultsCard) resultsCard.style.display = 'none';

  try {
    // 1. 查询全部 token id（分页）
    const tokens = await _queryAllTokens(contract, owner);
    _nftvState.tokens = tokens;

    if (!tokens.length) {
      if (statusEl) { statusEl.className = 'status-msg info'; statusEl.style.display = 'block'; statusEl.textContent = t('myNfts.noNft'); }
      if (resultsCard) resultsCard.style.display = 'none';
      return;
    }

    // 2. 批量查询 nft_info
    if (statusEl) statusEl.innerHTML = `<span class="spinner"></span> ${t('myNfts.loadingMeta')} (${tokens.length})`;
    const infos = await _queryBatch((tokenId) => _queryNftInfo(contract, tokenId), tokens, _NFTV_CONCURRENCY);
    tokens.forEach((tokenId, i) => { _nftvState.infos[tokenId] = infos[i] || {}; });

    // 3. 对缺少图片/名称的 token，从 token_uri 拉取元数据 JSON
    const needMeta = tokens.filter(tid => {
      const ext = _nftvState.infos[tid]?.extension || {};
      const tu = _nftvState.infos[tid]?.token_uri;
      return (!ext.image && !ext.name && tu);
    });
    if (needMeta.length) {
      if (statusEl) statusEl.innerHTML = `<span class="spinner"></span> ${t('myNfts.loadingMeta')} (${needMeta.length}/${tokens.length})`;
      const metas = await _queryBatch((tid) => fetchTokenUriMetadata(_nftvState.infos[tid]?.token_uri, _NFTV_META_TIMEOUT), needMeta, _NFTV_CONCURRENCY);
      needMeta.forEach((tid, i) => {
        _nftvState.displays[tid] = _resolveDisplay(_nftvState.infos[tid], metas[i]);
      });
    }
    // 对已有 extension 的直接解析
    tokens.forEach(tid => {
      if (!_nftvState.displays[tid]) _nftvState.displays[tid] = _resolveDisplay(_nftvState.infos[tid], null);
    });

    // 写缓存
    _nftvCache[cacheKey] = { tokens, infos: _nftvState.infos, displays: _nftvState.displays, ts: Date.now() };

    _renderResults('');
  } catch (e) {
    if (statusEl) { statusEl.className = 'status-msg error'; statusEl.style.display = 'block'; statusEl.innerHTML = `<strong>❌ ${t('myNfts.queryFail')}</strong><br>${escapeHtml(e.message)}`; }
  } finally {
    _nftvState.loading = false;
  }
}

function _renderResults(suffix) {
  const statusEl = document.getElementById('nftvStatus');
  if (statusEl) statusEl.style.display = 'none';
  const resultsCard = document.getElementById('nftvResultsCard');
  if (resultsCard) resultsCard.style.display = 'block';

  const summary = document.getElementById('nftvSummary');
  if (summary) summary.innerHTML = `${t('myNfts.total')} <strong style="color:var(--primary)">${_nftvState.tokens.length}</strong> ${t('myNfts.nftUnit')} ${suffix || ''}`;

  _nftvState.rendered = 0;
  renderNextPage();

  const btnExport = document.getElementById('btnNftvExport');
  if (btnExport) btnExport.style.display = _nftvState.tokens.length ? 'inline-flex' : 'none';
}

function renderNextPage() {
  const grid = document.getElementById('nftvGrid');
  if (!grid) return;
  const total = _nftvState.tokens.length;
  const next = Math.min(_nftvState.rendered + _NFTV_PAGE_SIZE, total);
  let html = '';
  for (let i = 0; i < next; i++) {
    html += _renderNftCard(_nftvState.tokens[i], _nftvState.displays[_nftvState.tokens[i]]);
  }
  grid.innerHTML = html;
  _nftvState.rendered = next;

  const wrap = document.getElementById('nftvLoadMoreWrap');
  if (wrap) wrap.style.display = (next < total) ? 'block' : 'none';
}

function _renderNftCard(tokenId, display) {
  const d = display || {};
  const imgSrc = safeNftImgSrc(d.image);
  const attrs = d.attrs || [];
  const name = d.name || tokenId;
  return `
    <div class="nft-card" data-token-id="${escapeHtml(tokenId)}" style="cursor:pointer;">
      <div class="nft-card-img">
        <div class="nft-card-placeholder" style="display:${imgSrc ? 'none' : 'flex'};">🎨</div>
        ${imgSrc ? `<img src="${imgSrc}" loading="lazy" onerror="this.style.display='none';this.previousElementSibling.style.display='flex';">` : ''}
      </div>
      <div class="nft-card-body">
        <div class="nft-card-name">${escapeHtml(name)}</div>
        <div class="nft-card-meta">Token #${escapeHtml(tokenId)}</div>
        ${attrs.length ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${attrs.slice(0, 3).map(a => `${escapeHtml(a.trait_type || '')}: ${escapeHtml(String(a.value ?? ''))}`).join(' · ')}</div>` : ''}
      </div>
    </div>
  `;
}

// ============================================================
// 详情弹窗
// ============================================================
function showNftDetail(tokenId) {
  const d = _nftvState.displays[tokenId] || {};
  const imgSrc = safeNftImgSrc(d.image);
  const attrs = d.attrs || [];
  const existing = document.getElementById('nftvModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'nftvModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;max-width:420px;width:100%;max-height:90vh;overflow-y:auto;padding:20px;position:relative;">
      <button onclick="document.getElementById('nftvModal').remove()" style="position:absolute;top:12px;right:12px;background:var(--bg);border:1px solid var(--border);color:var(--text);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;">✕</button>
      <div style="text-align:center;margin-bottom:14px;">
        <div style="width:100%;max-width:240px;aspect-ratio:1;margin:0 auto 12px;background:var(--bg);border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
          ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=&quot;font-size:48px;&quot;>🎨</div>'">` : '<div style="font-size:48px;">🎨</div>'}
        </div>
        <h3 style="font-size:17px;margin-bottom:4px;">${escapeHtml(d.name || tokenId)}</h3>
        <div style="font-size:12px;color:var(--text-muted);">Token #${escapeHtml(tokenId)}</div>
      </div>
      ${d.desc ? `<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">${escapeHtml(d.desc)}</div>` : ''}
      ${attrs.length ? `
        <div style="font-size:12px;font-weight:700;margin-bottom:6px;">${t('myNfts.attributes')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">
          ${attrs.map(a => `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;font-size:11px;"><div style="color:var(--text-muted);font-size:10px;">${escapeHtml(a.trait_type || '')}</div><div style="font-weight:600;">${escapeHtml(String(a.value ?? ''))}</div></div>`).join('')}
        </div>` : ''}
      <div style="border-top:1px solid var(--border);padding-top:10px;font-size:11px;color:var(--text-muted);line-height:1.8;word-break:break-all;">
        <div><strong>${t('myNfts.contractAddr')}:</strong><br><code style="word-break:break-all;color:var(--primary)">${escapeHtml(_nftvState.contract)}</code></div>
        ${d.tokenUri ? `<div style="margin-top:6px;"><strong>${t('myNfts.tokenUri')}:</strong><br><code style="word-break:break-all;font-size:10px;">${escapeHtml(d.tokenUri)}</code></div>` : ''}
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ============================================================
// 导出 CSV
// ============================================================
function exportNftsCsv() {
  const rows = [[t('myNfts.tokenId'), t('myNfts.name'), t('myNfts.image'), t('myNfts.attributes')]];
  for (const tokenId of _nftvState.tokens) {
    const d = _nftvState.displays[tokenId] || {};
    const attrsStr = (d.attrs || []).map(a => `${a.trait_type || ''}=${a.value ?? ''}`).join('; ');
    rows.push([tokenId, d.name || '', d.image || '', attrsStr]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nfts-${_nftvState.contract.slice(0, 10)}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('myNfts.exported'), 'success');
}

// ============================================================
// 链上查询辅助
// ============================================================
// 解析 CosmWasm smart query 响应（data 为 base64 字符串或已解析对象）
function _decodeSmartQuery(data) {
  if (!data) return null;
  if (typeof data.data === 'string') {
    try {
      const bytes = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }
  if (data.data && typeof data.data === 'object') return data.data;
  return data;
}

async function _queryAllTokens(contract, owner) {
  const all = [];
  let startAfter = null;
  while (true) {
    const query = { tokens: { owner, limit: 100, ...(startAfter ? { start_after: startAfter } : {}) } };
    const encoded = btoa(JSON.stringify(query));
    const url = `${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encoded}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const parsed = _decodeSmartQuery(data);
    const tokens = parsed?.tokens || parsed?.ids || [];
    all.push(...tokens);
    if (tokens.length < 100) break;
    startAfter = tokens[tokens.length - 1];
    if (all.length >= 500) break; // 安全上限
  }
  return all;
}

async function _queryNftInfo(contract, tokenId) {
  const query = { nft_info: { token_id: tokenId } };
  const encoded = btoa(JSON.stringify(query));
  const url = `${CONFIG.lcd}/cosmwasm/wasm/v1/contract/${contract}/smart/${encoded}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return _decodeSmartQuery(data) || {};
}

// 并发批处理（限制并发数）
async function _queryBatch(fn, items, limit) {
  const results = new Array(items.length);
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const res = await Promise.all(batch.map((item, j) => fn(item, i + j)));
    res.forEach((r, j) => { results[i + j] = r; });
  }
  return results;
}

// 合并 extension 与外部元数据，得到展示信息
function _resolveDisplay(info, meta) {
  const ext = (info && info.extension) || {};
  const m = meta || {};
  return {
    name: ext.name || m.name || '',
    image: ext.image || m.image || '',
    desc: ext.description || m.description || '',
    attrs: ext.attributes || m.attributes || [],
    tokenUri: (info && info.token_uri) || '',
  };
}

window.TOOL_REGISTRY['my-nfts'] = {
  render: renderMyNfts,
  bind: bindMyNftsEvents,
};
