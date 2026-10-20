/* ============================================================================
 * Paxi Suite · 治理投票模块 (Governance Vote)
 *  - 读取链上治理提案，对投票中提案发起 赞成/反对/弃权/强烈反对 投票
 *  - 无平台服务费（纯治理操作）
 * 依赖：PaxiCosmJS（官方 SDK）、shared.js（escapeHtml/showStatus/showToast）、
 *       core.js（state 钱包状态、currentLang、fetchAPI、getLCD、buildSignAndBroadcast）
 * ==========================================================================*/

window.TOOL_REGISTRY ||= {};

(function () {
  'use strict';

  /* ------------------------------------------------ 治理投票专用 i18n */
  const PT_DICT = {
    zh: {
      title: '治理投票',
      desc: '浏览链上治理提案，对处于「投票中」状态的提案投出你的选票。本工具不收取任何平台服务费。',
      info: '💡 仅「投票中」的提案可以投票；投票后需由钱包签名并广播上链，结果以链上记录为准。',
      voting: '投票中',
      passed: '已通过',
      rejected: '已拒绝',
      deposit: '押金期',
      connectFirst: '请先连接钱包后再投票',
      yes: '赞成',
      no: '反对',
      abstain: '弃权',
      veto: '强烈反对',
      voted: '您已投：',
      confirmMsg: (id, opt) => `确认对提案 #${id} 投出「${opt}」票？\n\n点击「确定」后将在钱包中签名并广播。`,
      success: '✅ 投票成功',
      failPrefix: '❌ 投票失败：',
      sdkErr: '当前 SDK 不支持该消息类型',
      noProposals: '暂无提案',
      loading: '加载中...',
      statusUnknown: '未知状态',
      voteFailed: '投票失败',
    },
    en: {
      title: 'Governance Vote',
      desc: 'Browse on-chain governance proposals and cast your vote on proposals in the voting period. This tool charges no platform fee.',
      info: '💡 Only proposals in the "Voting" period can be voted on. Voting requires wallet signing and on-chain broadcast; the chain record is authoritative.',
      voting: 'Voting',
      passed: 'Passed',
      rejected: 'Rejected',
      deposit: 'Deposit',
      connectFirst: 'Please connect a wallet before voting',
      yes: 'Yes',
      no: 'No',
      abstain: 'Abstain',
      veto: 'NoWithVeto',
      voted: 'You voted: ',
      confirmMsg: (id, opt) => `Confirm voting "${opt}" on proposal #${id}?\n\nClick "OK" to sign and broadcast via your wallet.`,
      success: '✅ Vote submitted',
      failPrefix: 'Vote failed: ',
      sdkErr: 'SDK does not support this message type',
      noProposals: 'No proposals',
      loading: 'Loading...',
      statusUnknown: 'Unknown',
      voteFailed: 'Vote failed',
    }
  };
  const pt = (key, ...args) => {
    const lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
    let v = PT_DICT[lang][key];
    if (v === undefined) v = PT_DICT.zh[key];
    return typeof v === 'function' ? v(...args) : v;
  };

  const esc = (s) => (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);

  // 状态 -> 标签（多语言）
  function statusLabel(status) {
    switch (status) {
      case 'PROPOSAL_STATUS_VOTING_PERIOD': return pt('voting');
      case 'PROPOSAL_STATUS_PASSED': return pt('passed');
      case 'PROPOSAL_STATUS_REJECTED': return pt('rejected');
      case 'PROPOSAL_STATUS_DEPOSIT_PERIOD': return pt('deposit');
      default: return pt('statusUnknown');
    }
  }

  // 投票选项 -> 展示标签
  function optionLabel(option) {
    switch (option) {
      case 'VOTE_OPTION_YES': return pt('yes');
      case 'VOTE_OPTION_NO': return pt('no');
      case 'VOTE_OPTION_ABSTAIN': return pt('abstain');
      case 'VOTE_OPTION_NO_WITH_VETO': return pt('veto');
      default: return option;
    }
  }

  /* ------------------------------------------------ 渲染 */
  function renderGovVote() {
    return `
      <div class="card">
        <div class="card-title">${esc(pt('title'))}</div>
        <div class="tool-desc">${esc(pt('desc'))}</div>
        <div class="info-box">
          <strong>${esc(pt('info'))}</strong>
        </div>
        <div class="status-msg" id="gvStatus"></div>
        <div id="gvList"></div>
      </div>
    `;
  }

  /* ------------------------------------------------ 数据加载 (onMount) */
  let gvLoadSeq = 0;
  async function loadGovVote() {
    const listEl = document.getElementById('gvList');
    if (!listEl) return;
    const my = ++gvLoadSeq;
    listEl.innerHTML = `<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">⏳ ${esc(pt('loading'))}</div>`;
    try {
      const data = await fetchAPI('/cosmos/gov/v1beta1/proposals');
      if (my !== gvLoadSeq) return; // 防止语言切换/重载竞态
      const proposals = (data && data.proposals) || [];
      if (proposals.length === 0) {
        listEl.innerHTML = `<div style="font-size:13px;color:var(--text-muted);padding:8px 0;">${esc(pt('noProposals'))}</div>`;
        return;
      }
      listEl.innerHTML = '';
      for (const p of proposals) {
        const id = p.id;
        const title = p.title || (p.content && p.content.title) || ('# ' + id);
        const status = p.status || '';
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px;background:rgba(255,255,255,0.02);';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <div style="font-weight:600;font-size:14px;">#${esc(id)} · ${esc(title)}</div>
            <span class="badge" style="font-size:11px;padding:3px 8px;border-radius:20px;background:rgba(74,222,128,.12);color:var(--success);white-space:nowrap;">${esc(statusLabel(status))}</span>
          </div>
          <div id="gvVote_${esc(id)}" style="margin-top:10px;"></div>
        `;
        listEl.appendChild(card);

        const voteEl = card.querySelector(`#gvVote_${CSS.escape ? CSS.escape(String(id)) : id}`);

        if (status === 'PROPOSAL_STATUS_VOTING_PERIOD') {
          const options = [
            ['VOTE_OPTION_YES', pt('yes')],
            ['VOTE_OPTION_NO', pt('no')],
            ['VOTE_OPTION_ABSTAIN', pt('abstain')],
            ['VOTE_OPTION_NO_WITH_VETO', pt('veto')],
          ];
          const btnWrap = document.createElement('div');
          btnWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
          for (const [opt, label] of options) {
            const b = document.createElement('button');
            b.className = 'btn btn-outline btn-sm';
            b.style.minHeight = '38px';
            b.textContent = label;
            b.onclick = () => castVote(id, opt);
            btnWrap.appendChild(b);
          }
          voteEl.appendChild(btnWrap);

          // 已连接钱包时查询本人是否已投票
          if (typeof state !== 'undefined' && state.connected && state.wallet && state.wallet.address) {
            const votedLabel = document.createElement('div');
            votedLabel.id = `gvVoted_${esc(id)}`;
            votedLabel.style.cssText = 'margin-top:8px;font-size:12px;color:var(--primary);';
            voteEl.appendChild(votedLabel);
            try {
              const vData = await fetchAPI(`/cosmos/gov/v1beta1/proposals/${encodeURIComponent(String(id))}/votes/${encodeURIComponent(state.wallet.address)}`);
              if (my !== gvLoadSeq) return;
              const v = vData && vData.vote;
              if (v && v.option) {
                votedLabel.textContent = pt('voted') + optionLabel(v.option);
              }
            } catch (_) {
              // 部分链端点可能不同；失败时静默跳过"已投"标签
            }
          }
        }
      }
    } catch (e) {
      if (my !== gvLoadSeq) return;
      console.error('[GovVote] 提案加载失败:', e);
      listEl.innerHTML = `<div style="color:var(--danger);font-size:13px;padding:8px 0;">❌ ${esc(e.message || String(e))}</div>`;
    }
  }

  /* ------------------------------------------------ 投票 */
  async function castVote(id, option) {
    if (typeof state === 'undefined' || !state.connected) {
      showStatusSafe(pt('connectFirst'), 'warning');
      if (typeof showToast === 'function') showToast(pt('connectFirst'), 'error');
      return;
    }
    const address = state.wallet.address;

    // SDK 支持性守卫
    if (typeof PaxiCosmJS === 'undefined' || typeof PaxiCosmJS.MsgVote === 'undefined' || typeof PaxiCosmJS.Any === 'undefined') {
      showStatusSafe(pt('sdkErr'), 'error');
      if (typeof showToast === 'function') showToast(pt('sdkErr'), 'error');
      return;
    }

    const ok = confirm(pt('confirmMsg', id, optionLabel(option)));
    if (!ok) return;

    // 签名期间禁用本提案全部投票按钮，防止重复点击导致重复投票
    const voteBtns = document.querySelectorAll('#gvVote_' + (CSS.escape ? CSS.escape(String(id)) : id) + ' button');
    voteBtns.forEach(b => b.disabled = true);

    const statusEl = document.getElementById('gvStatus');
    if (statusEl) { statusEl.textContent = '⏳ ...'; statusEl.className = 'status-msg'; }
    try {
      // MsgVote.option 必须是数字枚举（v1beta1）；字符串会被编码为 0（UNSPECIFIED）导致投票被链拒绝
      const VOTE_OPT = { VOTE_OPTION_YES: 1, VOTE_OPTION_ABSTAIN: 2, VOTE_OPTION_NO: 3, VOTE_OPTION_NO_WITH_VETO: 4, YES: 1, ABSTAIN: 2, NO: 3, NO_WITH_VETO: 4 };
      const optNum = (typeof option === 'number') ? option : (VOTE_OPT[option] || 1);
      const m = PaxiCosmJS.MsgVote.fromPartial({
        voter: address,
        proposal_id: BigInt(id),
        option: optNum,
      });
      const any = PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.gov.v1beta1.MsgVote',
        value: PaxiCosmJS.MsgVote.encode(m).finish(),
      });

      const memo = `Paxi Suite Gov Vote #${id} ${option}`;
      const res = await buildSignAndBroadcast([any], memo, null, state.wallet);
      const r = checkTxResult(res);
      if (r.ok) {
        // SYNC 仅代表 CheckTx 通过；轮询确认 DeliverTx 真实上链，避免"假成功"
        const final = (typeof pollTxStatus === 'function') ? await pollTxStatus(r.txhash) : null;
        if (final && final.confirmed && !final.success) {
          showStatusSafe(pt('failPrefix') + mapErrorSafe(final.code, final.rawLog), 'error');
        } else {
          showStatusSafe(pt('success') + ' TxHash: ' + (r.txhash ? r.txhash.slice(0, 20) + '...' : ''), 'success');
          if (typeof showToast === 'function') showToast(pt('success'), 'success');
          // 重新渲染列表，刷新"已投"状态
          await loadGovVote();
        }
      } else {
        const detail = mapErrorSafe(r.code, r.rawLog);
        showStatusSafe(pt('failPrefix') + detail, 'error');
      }
    } catch (e) {
      showStatusSafe(pt('failPrefix') + (e.message || String(e)), 'error');
    } finally {
      voteBtns.forEach(b => b.disabled = false);
    }
  }

  function showStatusSafe(msg, type) {
    if (typeof showStatus === 'function') {
      showStatus('gvStatus', msg, type);
      return;
    }
    const el = document.getElementById('gvStatus');
    if (el) {
      el.textContent = msg;
      el.className = 'status-msg' + (type ? ' ' + type : '');
    }
  }

  function mapErrorSafe(code, rawLog) {
    if (typeof mapError === 'function') return mapError(code, rawLog);
    return `code=${code}` + (rawLog ? ` ${rawLog}` : '');
  }

  /* ------------------------------------------------ 绑定 */
  function bindGovVote() {
    // 投票通过内联 onclick / 动态绑定按钮，无需额外事件委托
    // 此处预留：若后续需要监听钱包连接状态变化可在此扩展
  }

  /* ------------------------------------------------ 注册 */
  window.TOOL_REGISTRY['gov-vote'] = {
    render: renderGovVote,
    bind: bindGovVote,
    onMount: loadGovVote,
  };
})();
