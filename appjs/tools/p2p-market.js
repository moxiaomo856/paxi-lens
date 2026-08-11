TOOL_REGISTRY['p2p-market'] = { render: renderP2pMarket };

const LS_KEY_P2P = 'paxi_p2p_ads';

function getP2pAds() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_P2P) || '[]'); }
  catch { return []; }
}
function saveP2pAd(ad) {
  const list = getP2pAds();
  list.unshift(ad);
  if (list.length > 200) list.length = 200;
  localStorage.setItem(LS_KEY_P2P, JSON.stringify(list));
}
function removeP2pAd(id) {
  let list = getP2pAds();
  list = list.filter(a => a.id !== id);
  localStorage.setItem(LS_KEY_P2P, JSON.stringify(list));
}

function renderP2pMarket() {
  const ads = getP2pAds();

  return `
    <div class="card">
      <div class="card-title">${t('p2pMarket.title')}</div>
      <div class="tool-desc">${t('p2pMarket.desc')}</div>
      <div class="info-box" style="margin-bottom:16px;">
        <strong>💡 ${t('p2pMarket.fee')}</strong>
      </div>

      <!-- 发布表单 -->
      <div style="background:var(--bg);border-radius:8px;padding:16px;margin-bottom:16px;">
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">类型</label>
            <select id="p2pType">
              <option value="buy">${t('p2pMarket.buyLabel')}</option>
              <option value="sell">${t('p2pMarket.sellLabel')}</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">${t('p2pMarket.amount')}</label>
            <input type="number" id="p2pAmount" placeholder="1000" min="0.000001" step="0.000001">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('p2pMarket.price')}</label>
          <input type="number" id="p2pPrice" placeholder="0.20" min="0" step="0.000001">
        </div>
        <div class="form-group">
          <label class="form-label">${t('p2pMarket.contact')}</label>
          <input type="text" id="p2pContact" placeholder="TG：@xxx 或 微信：xxx">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label">${t('p2pMarket.note')}</label>
          <input type="text" id="p2pNote" placeholder="例如：仅限大额交易">
        </div>
        <button class="btn btn-success btn-block" id="btnPublishP2p" onclick="publishP2pAd()" style="margin-top:12px;">
          ${t('p2pMarket.publish')}
        </button>
        <div class="status-msg" id="p2pStatus"></div>
      </div>

      <!-- 广告列表 -->
      <div style="margin-top:12px;">
        ${ads.length === 0 ? `
          <p style="color:var(--text-muted);text-align:center;padding:24px 0;">${t('p2pMarket.noData')}</p>
        ` : `
          ${ads.map(ad => {
            const isBuy = ad.type === 'buy';
            const time = ad.timestamp ? new Date(ad.timestamp).toLocaleString() : '--';
            const addr = ad.publisher ? ad.publisher.slice(0, 10) + '...' + ad.publisher.slice(-6) : '--';
            return `
              <div class="p2p-item ${isBuy ? 'buy' : 'sell'}">
                <div class="p2p-header">
                  <span class="p2p-type ${isBuy ? 'buy' : 'sell'}">${isBuy ? '📈 ' + t('p2pMarket.buyLabel') : '📉 ' + t('p2pMarket.sellLabel')}</span>
                  <span class="p2p-time">${time}</span>
                </div>
                <div class="p2p-body">
                  <span><span class="label">数量</span> ${ad.amount} PAXI</span>
                  <span><span class="label">单价</span> ${ad.price} USDT</span>
                  ${ad.note ? `<span><span class="label">备注</span> ${escapeHtml(ad.note)}</span>` : ''}
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-top:4px;">
                  <span class="p2p-contact">📱 ${escapeHtml(ad.contact || '--')}</span>
                  <span class="p2p-addr">👤 ${addr}</span>
                </div>
                ${state.connected && state.wallet?.address === ad.publisher ? `
                  <div style="margin-top:6px;">
                    <button class="btn btn-danger btn-sm" onclick="deleteP2pAd('${ad.id}')">${t('common.delete') || '删除'}</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        `}
      </div>
    </div>
  `;
}

async function publishP2pAd() {
  if (!state.connected) {
    showStatus('p2pStatus', t('p2pMarket.connectFirst'), 'warning');
    return;
  }

  const type = document.getElementById('p2pType').value;
  const amount = document.getElementById('p2pAmount').value.trim();
  const price = document.getElementById('p2pPrice').value.trim();
  const contact = document.getElementById('p2pContact').value.trim();
  const note = document.getElementById('p2pNote').value.trim();

  if (!amount || parseFloat(amount) <= 0) {
    showStatus('p2pStatus', '请输入有效的数量', 'warning');
    return;
  }
  if (!price || parseFloat(price) <= 0) {
    showStatus('p2pStatus', '请输入有效的价格', 'warning');
    return;
  }
  if (!contact) {
    showStatus('p2pStatus', '请填写联系方式', 'warning');
    return;
  }

  if (!confirm(t('p2pMarket.confirmPublish'))) return;

  const btn = document.getElementById('btnPublishP2p');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${t('p2pMarket.publishing')}`;

  try {
    const denom = CONFIG.denom;
    const feeMicro = (1 * 1e6).toFixed(0);

    const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
      fromAddress: state.wallet.address,
      toAddress: CONFIG.feeCollector,
      amount: [{ denom, amount: feeMicro }]
    });
    const feeAny = PaxiCosmJS.Any.fromPartial({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
    });

    const messages = [feeAny];
    const memo = `Paxi Toolbox P2P Ad: ${type} ${amount} PAXI @ ${price} USDT`;
    const broadcastRes = await buildSignAndBroadcast(messages, memo, null, state.wallet);
    const result = checkTxResult(broadcastRes);

    if (result.ok) {
      const ad = {
        id: 'p2p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: type,
        amount: amount,
        price: price,
        contact: contact,
        note: note || '',
        publisher: state.wallet.address,
        timestamp: Date.now(),
        txhash: result.txhash,
      };
      saveP2pAd(ad);
      showStatus('p2pStatus', `${t('p2pMarket.success')} TxHash: ${result.txhash.slice(0,20)}...`, 'success');
      pollTxStatus(result.txhash);
      renderP2pMarket();
      document.getElementById('p2pAmount').value = '';
      document.getElementById('p2pPrice').value = '';
      document.getElementById('p2pContact').value = '';
      document.getElementById('p2pNote').value = '';
      showToast('✅ 广告发布成功！', 'success');
    } else {
      showStatus('p2pStatus', `${t('p2pMarket.fail')} ${mapError(result.code, result.rawLog)}`, 'error');
    }
  } catch (e) {
    console.error('P2P publish error:', e);
    showStatus('p2pStatus', `${t('p2pMarket.fail')} ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = t('p2pMarket.publish');
  }
}

function deleteP2pAd(id) {
  if (!confirm(t('p2pMarket.deleteConfirm'))) return;
  removeP2pAd(id);
  renderP2pMarket();
  showToast(t('p2pMarket.deleted'), 'success');
}
