if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const IQ_DICT = {
  zh: {
    title: 'IBC 查询',
    desc: '只读查询 Paxi 网络的 IBC 通道、客户端与跨链资产(denom)映射。',
    channelsBtn: '📡 查询通道',
    denomTracesBtn: '🔗 查询 denom 映射',
    clientsBtn: '🛡 查询客户端',
    resolveBtn: '🔍 解析 denom',
    hashPh: '输入 ibc/... 哈希或裸哈希',
    notEnabled: '⚠️ Paxi 部分 IBC 接口未实现，跨链可用性请以实际转账为准。',
    loading: '查询中...',
    noData: '无数据',
    resolved: '✅ 解析结果',
    info: '本工具为只读查询，不会对链上发起任何交易。Paxi 主网部分 IBC 接口尚未实现（如 denom 映射），相关查询返回错误属正常现象；跨链能否使用请以实际转账到账为准。'
  },
  en: {
    title: 'IBC Query',
    desc: 'Read-only query of Paxi IBC channels, clients and cross-chain denom traces.',
    channelsBtn: 'Query Channels',
    denomTracesBtn: 'Query Denom Traces',
    clientsBtn: 'Query Clients',
    resolveBtn: 'Resolve Denom',
    hashPh: 'Enter ibc/... hash or bare hash',
    notEnabled: '⚠️ Some Paxi IBC endpoints are not implemented; cross-chain availability should be verified by an actual transfer.',
    loading: 'Querying...',
    noData: 'No data',
    resolved: 'Resolved',
    info: 'This tool is read-only and submits no transactions. Some Paxi IBC endpoints are not yet implemented (e.g. denom traces); endpoint errors are expected. Whether cross-chain transfers actually work should be verified by a real transfer.'
  }
};

const iqPt = (k, ...a) => {
  const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
  let v = IQ_DICT[lang][k];
  if (v === undefined) v = IQ_DICT.zh[k];
  return typeof v === 'function' ? v(...a) : v;
};

function renderIbcQuery() {
  return `
    <div class="card">
      <div class="card-title">${iqPt('title')}</div>
      <div class="tool-desc">${iqPt('desc')}</div>
      <div class="info-box" style="margin-bottom:16px">
        ${iqPt('info')}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-primary" onclick="ibcChannels()">${iqPt('channelsBtn')}</button>
        <button class="btn btn-primary" onclick="ibcDenomTraces()">${iqPt('denomTracesBtn')}</button>
        <button class="btn btn-primary" onclick="ibcClients()">${iqPt('clientsBtn')}</button>
      </div>
      <div class="form-group" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:240px">
          <label class="form-label">${iqPt('resolveBtn')}</label>
          <input id="ibcHash" class="input" placeholder="${iqPt('hashPh')}" />
        </div>
        <button class="btn btn-outline" onclick="ibcResolveDenom()">${iqPt('resolveBtn')}</button>
      </div>
      <div id="ibcResult" style="margin-top:16px"></div>
      <div class="status-msg" id="ibcStatus"></div>
    </div>
  `;
}

function bindIbcQuery() {}

function ibcTable(headers, rows) {
  if (!rows.length) return `<div class="muted">${iqPt('noData')}</div>`;
  const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(String(c === undefined ? '' : c))}</td>`).join('')}</tr>`).join('');
  return `<table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

async function ibcChannels() {
  try {
    showStatus('ibcStatus', iqPt('loading'), 'info');
    const data = await fetchAPI('/ibc/core/channel/v1/channels');
    const channels = (data && data.channels) || [];
    const rows = channels.map(c => [
      c.channel_id,
      c.port_id,
      c.state,
      c.counterparty ? (c.counterparty.port_id + ' / ' + c.counterparty.channel_id) : ''
    ]);
    document.getElementById('ibcResult').innerHTML = ibcTable(['channel_id', 'port_id', 'state', 'counterparty'], rows);
    showStatus('ibcStatus', '', 'info');
  } catch (e) {
    document.getElementById('ibcResult').innerHTML =
      `<div class="info-box muted">${iqPt('notEnabled')}<div style="margin-top:6px;font-size:11px;opacity:.7">${escapeHtml(String(e && e.message ? e.message : e))}</div></div>`;
    showStatus('ibcStatus', '', 'info');
  }
}

async function ibcDenomTraces() {
  try {
    showStatus('ibcStatus', iqPt('loading'), 'info');
    const data = await fetchAPI('/ibc/apps/transfer/v1/denom_traces');
    const traces = (data && data.denom_traces) || [];
    const rows = traces.map(t => [t.index, t.denom, (t.path || []).join(',')]);
    document.getElementById('ibcResult').innerHTML = ibcTable(['index', 'denom', 'path'], rows);
    showStatus('ibcStatus', '', 'info');
  } catch (e) {
    document.getElementById('ibcResult').innerHTML =
      `<div class="info-box muted">${iqPt('notEnabled')}<div style="margin-top:6px;font-size:11px;opacity:.7">${escapeHtml(String(e && e.message ? e.message : e))}</div></div>`;
    showStatus('ibcStatus', '', 'info');
  }
}

async function ibcClients() {
  try {
    showStatus('ibcStatus', iqPt('loading'), 'info');
    const data = await fetchAPI('/ibc/core/client/v1/client_states');
    const states = (data && data.client_states) || [];
    const rows = states.map(s => [s.client_id, s.client_state ? s.client_state['@type'] : '']);
    document.getElementById('ibcResult').innerHTML = ibcTable(['client_id', 'type'], rows);
    showStatus('ibcStatus', '', 'info');
  } catch (e) {
    document.getElementById('ibcResult').innerHTML =
      `<div class="info-box muted">${iqPt('notEnabled')}<div style="margin-top:6px;font-size:11px;opacity:.7">${escapeHtml(String(e && e.message ? e.message : e))}</div></div>`;
    showStatus('ibcStatus', '', 'info');
  }
}

async function ibcResolveDenom() {
  try {
    const raw = (document.getElementById('ibcHash').value || '').trim();
    if (!raw) { showStatus('ibcStatus', '', 'info'); return; }
    const hash = raw.replace(/^ibc\//i, '');
    showStatus('ibcStatus', iqPt('loading'), 'info');
    const data = await fetchAPI(`/ibc/apps/transfer/v1/denom_traces/${hash}`);
    const trace = data && data.denom_trace ? data.denom_trace : null;
    if (!trace) {
      document.getElementById('ibcResult').innerHTML = `<div class="muted">${iqPt('noData')}</div>`;
    } else {
      document.getElementById('ibcResult').innerHTML =
        `<div class="info-box"><strong>${iqPt('resolved')}</strong><div style="margin-top:8px">` +
        `<div><b>denom:</b> ${escapeHtml(trace.denom || '')}</div>` +
        `<div><b>path:</b> ${escapeHtml((trace.path || []).join(', '))}</div></div></div>`;
    }
    showStatus('ibcStatus', '', 'info');
  } catch (e) {
    document.getElementById('ibcResult').innerHTML =
      `<div class="info-box muted">${iqPt('notEnabled')}<div style="margin-top:6px;font-size:11px;opacity:.7">${escapeHtml(String(e && e.message ? e.message : e))}</div></div>`;
    showStatus('ibcStatus', '', 'info');
  }
}

window.TOOL_REGISTRY ||= {};
window.TOOL_REGISTRY['ibc-query'] = { render: renderIbcQuery, bind: bindIbcQuery };
