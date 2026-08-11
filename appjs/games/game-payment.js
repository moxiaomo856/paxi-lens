/**
 * 游戏共享付费模块
 * 所有游戏共用：5 PAXI = 10 局
 * 通过 window.GamePay 调用
 */
if (!window.GamePay) window.GamePay = {};

// 付费模式开关（false = 免费体验，true = 付费游玩）
const GAME_PAY_ENABLED = true;

window.GamePay = {
  FEE: '5',
  ROUNDS: 10,
  _paying: false,

  // 获取剩余局数
  getRounds(gameId) {
    if (!GAME_PAY_ENABLED) return 999;
    return parseInt(localStorage.getItem('paxi_game_rounds_' + gameId) || '0', 10);
  },

  // 设置局数
  setRounds(gameId, n) {
    if (!GAME_PAY_ENABLED) return;
    localStorage.setItem('paxi_game_rounds_' + gameId, String(n));
  },

  // 钱包是否已连接
  isConnected() {
    if (!GAME_PAY_ENABLED) return true;
    return (typeof state !== 'undefined' && state.connected);
  },

  // 根据状态生成覆盖层 HTML
  overlayHTML(gameId, titleKey, descKey) {
    // 免费模式：直接显示开始按钮
    if (!GAME_PAY_ENABLED) {
      return `
        <div id="gpOverlayTitle" style="font-size:24px;font-weight:800;color:#fff;margin-bottom:12px;">${t(titleKey)}</div>
        <div id="gpOverlaySub" style="font-size:13px;color:var(--text-muted);margin-bottom:20px;text-align:center;">${t('gamePay.touchToStart')}</div>
        <button id="gpStartBtn" class="btn btn-primary" style="min-width:120px;">${t('gamePay.startBtn')}</button>
      `;
    }

    // === 以下为付费模式逻辑（暂时注释） ===
    const rounds = this.getRounds(gameId);
    const connected = this.isConnected();

    if (!connected) {
      return `
        <div id="gpOverlayTitle" style="font-size:22px;font-weight:800;color:#fff;margin-bottom:12px;">${t(titleKey)}</div>
        <div id="gpOverlaySub" style="font-size:13px;color:var(--text-muted);margin-bottom:20px;text-align:center;line-height:1.8;">
          ${t('gamePay.needWallet')}<br>${t(descKey)}
        </div>
        <button id="gpStartBtn" class="btn btn-primary" style="min-width:160px;">${t('gamePay.connectFirst')}</button>
      `;
    } else if (rounds <= 0) {
      return `
        <div id="gpOverlayTitle" style="font-size:20px;font-weight:800;color:#fff;margin-bottom:12px;">${t('gamePay.payTitle')}</div>
        <div id="gpOverlaySub" style="font-size:13px;color:var(--text-muted);margin-bottom:20px;text-align:center;line-height:1.8;">
          ${t('gamePay.payDesc')}
        </div>
        <button id="gpStartBtn" class="btn btn-primary" style="min-width:180px;">${t('gamePay.payBtn')}</button>
      `;
    } else {
      return `
        <div id="gpOverlayTitle" style="font-size:24px;font-weight:800;color:#fff;margin-bottom:12px;">${t('gamePay.start')}</div>
        <div id="gpOverlaySub" style="font-size:13px;color:var(--text-muted);margin-bottom:20px;text-align:center;">
          ${t('gamePay.touchToStart')}<br>
          <span style="color:var(--primary);font-weight:600;">${t('gamePay.roundsLeft')}: ${rounds}</span>
        </div>
        <button id="gpStartBtn" class="btn btn-primary" style="min-width:120px;">${t('gamePay.startBtn')}</button>
      `;
    }
  },

  // 生成局数徽章 HTML
  roundsBadge(gameId) {
    if (!GAME_PAY_ENABLED) return '';
    return `<span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('gamePay.roundsLeft')}: <b id="gpRounds" style="color:var(--warning)">${this.getRounds(gameId)}</b></span>`;
  },

  // 绑定开始按钮点击
  bindStart(gameId, startFn) {
    setTimeout(() => {
      const btn = document.getElementById('gpStartBtn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onStart(gameId, startFn);
        });
      }
      const overlay = document.getElementById('gpOverlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay || e.target.id === 'gpOverlayTitle' || e.target.id === 'gpOverlaySub') {
            this.onStart(gameId, startFn);
          }
        });
      }
    }, 100);
  },

  // 开始按钮逻辑分发
  async onStart(gameId, startFn) {
    // 免费模式：直接开始
    if (!GAME_PAY_ENABLED) {
      startFn();
      return;
    }

    // === 以下为付费模式逻辑 ===
    if (!this.isConnected()) {
      if (typeof connectWallet === 'function') {
        await connectWallet();
        if (state.connected) {
          if (typeof renderTool === 'function') renderTool(gameId, gameId);
        }
      } else {
        showToast(t('gamePay.needWallet'), 'warning');
      }
      return;
    }

    const rounds = this.getRounds(gameId);
    if (rounds <= 0) {
      await this.payAndStart(gameId, startFn);
      return;
    }

    startFn();
  },

  // 支付 5 PAXI 获得 10 局（付费模式才调用）
  async payAndStart(gameId, startFn) {
    if (this._paying) return;
    if (!this.isConnected()) {
      showToast(t('gamePay.needWallet'), 'error');
      return;
    }

    this._paying = true;
    const btn = document.getElementById('gpStartBtn');
    const overlayTitle = document.getElementById('gpOverlayTitle');
    const overlaySub = document.getElementById('gpOverlaySub');

    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> ' + t('gamePay.paying'); }

    try {
      const addr = state.wallet.address;
      const feeAmount = paxiToUpaxi(this.FEE);

      const feeMsg = PaxiCosmJS.MsgSend.fromPartial({
        fromAddress: addr,
        toAddress: SHARED_CONFIG.feeCollector,
        amount: [PaxiCosmJS.coins(feeAmount, getDenom())[0]],
      });

      const messages = [PaxiCosmJS.Any.fromPartial({
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: PaxiCosmJS.MsgSend.encode(feeMsg).finish(),
      })];

      const memo = 'Game ' + gameId + ' - ' + this.ROUNDS + ' Rounds';
      const res = await buildSignAndBroadcast(messages, memo, null, state.wallet);

      const txHash = res?.tx_response?.txhash;
      if (!txHash) throw new Error('Transaction failed');

      if (typeof pollTxStatus === 'function') {
        const pollRes = await pollTxStatus(txHash, 25);
        if (!pollRes.confirmed || !pollRes.success) {
          throw new Error(pollRes.rawLog || 'Transaction failed on-chain');
        }
      }

      const newRounds = this.getRounds(gameId) + this.ROUNDS;
      this.setRounds(gameId, newRounds);

      const roundsEl = document.getElementById('gpRounds');
      if (roundsEl) roundsEl.textContent = newRounds;

      showToast(t('gamePay.paySuccess'), 'success');

      if (overlayTitle) overlayTitle.textContent = t('gamePay.start');
      if (overlaySub) overlaySub.innerHTML = `${t('gamePay.touchToStart')}<br><span style="color:var(--primary);font-weight:600;">${t('gamePay.roundsLeft')}: ${newRounds}</span>`;
      if (btn) { btn.disabled = false; btn.textContent = t('gamePay.startBtn'); }

      startFn();
    } catch (e) {
      showToast(t('gamePay.payFailed') + ': ' + (e.message || e), 'error');
      if (btn) { btn.disabled = false; btn.textContent = t('gamePay.payBtn'); }
      if (overlayTitle) overlayTitle.textContent = t('gamePay.payTitle');
      if (overlaySub) overlaySub.innerHTML = t('gamePay.payDesc');
    } finally {
      this._paying = false;
    }
  },

  // 消耗一局（在 startFn 开头调用）
  consumeRound(gameId) {
    // 免费模式：直接放行
    if (!GAME_PAY_ENABLED) {
      const overlay = document.getElementById('gpOverlay');
      if (overlay) overlay.style.display = 'none';
      return true;
    }

    const rounds = this.getRounds(gameId);
    if (rounds <= 0) {
      showToast(t('gamePay.noRounds'), 'warning');
      this.showPayOverlay();
      return false;
    }
    this.setRounds(gameId, rounds - 1);
    const roundsEl = document.getElementById('gpRounds');
    if (roundsEl) roundsEl.textContent = rounds - 1;

    const overlay = document.getElementById('gpOverlay');
    if (overlay) overlay.style.display = 'none';
    return true;
  },

  // 显示付费覆盖层
  showPayOverlay() {
    const overlay = document.getElementById('gpOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    if (!GAME_PAY_ENABLED) return;
    const title = document.getElementById('gpOverlayTitle');
    const sub = document.getElementById('gpOverlaySub');
    const btn = document.getElementById('gpStartBtn');
    if (title) title.textContent = t('gamePay.payTitle');
    if (sub) sub.innerHTML = t('gamePay.payDesc');
    if (btn) btn.textContent = t('gamePay.payBtn');
  },

  // 显示游戏结束覆盖层
  showGameOver(gameId, scoreHTML) {
    const overlay = document.getElementById('gpOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    const title = document.getElementById('gpOverlayTitle');
    const sub = document.getElementById('gpOverlaySub');
    const btn = document.getElementById('gpStartBtn');
    if (title) title.textContent = t('gamePay.gameOver');
    if (!GAME_PAY_ENABLED) {
      if (sub) sub.innerHTML = scoreHTML;
      if (btn) btn.textContent = t('gamePay.playAgain');
      return;
    }
    const remaining = this.getRounds(gameId);
    if (sub) sub.innerHTML = `${scoreHTML}<br><span style="font-size:12px;color:var(--text-muted)">${t('gamePay.roundsLeft')}: ${remaining}</span>`;
    if (btn) {
      btn.textContent = remaining > 0 ? t('gamePay.playAgain') : t('gamePay.buyRounds');
    }
  },
};
