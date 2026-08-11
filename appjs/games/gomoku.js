/**
 * 五子棋 - 人机对弈，五子连珠获胜
 * Canvas 棋盘，玩家执黑，AI 执白
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

let _gomokuCanvas = null;
let _gomokuCtx = null;
let _gomokuState = null;
let _gomokuClickHandler = null;

const GOMOKU_SIZE = 15;
const GOMOKU_CELL = 24;
const GOMOKU_W = GOMOKU_SIZE * GOMOKU_CELL;
const GOMOKU_H = GOMOKU_SIZE * GOMOKU_CELL;

function renderGomoku() {
  return `
    <div class="card">
      <div class="card-title">⚫ ${t('gomoku.title')}</div>
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${t('gomoku.desc')}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">
          <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('gomoku.turn')}: <b id="gomokuTurn" style="color:var(--primary)">${t('gomoku.you')}</b></span>
          ${GamePay.roundsBadge('gomoku')}
        </div>
      </div>
      <div style="position:relative;display:flex;justify-content:center;">
        <canvas id="gomokuCanvas" width="${GOMOKU_W}" height="${GOMOKU_H}" style="background:#dcb35c;border-radius:8px;touch-action:none;max-width:100%;height:auto;cursor:crosshair;"></canvas>
        <div id="gpOverlay" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);border-radius:8px;z-index:10;">
          ${GamePay.overlayHTML('gomoku', 'gomoku.title', 'gomoku.desc')}
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);">${t('gomoku.controls')}</div>
    </div>
  `;
}

function bindGomokuEvents() {
  GamePay.bindStart('gomoku', startGomokuGame);
}

function startGomokuGame() {
  if (!GamePay.consumeRound('gomoku')) return;

  _gomokuCanvas = document.getElementById('gomokuCanvas');
  if (!_gomokuCanvas) return;
  _gomokuCtx = _gomokuCanvas.getContext('2d');

  _gomokuState = {
    board: Array(GOMOKU_SIZE).fill(null).map(() => Array(GOMOKU_SIZE).fill(0)), // 0=空 1=黑 2=白
    turn: 1, // 玩家先手黑棋
    over: false,
    winner: 0,
    moves: 0,
    aiThinking: false,
    lastTouchTime: 0, // 防止触摸和点击重复触发
  };

  _drawGomokuBoard();

  // 统一的落子处理函数
  const handlePlace = (clientX, clientY) => {
    if (!_gomokuState || _gomokuState.over || _gomokuState.aiThinking || _gomokuState.turn !== 1) return;
    const rect = _gomokuCanvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (GOMOKU_W / rect.width);
    const y = (clientY - rect.top) * (GOMOKU_H / rect.height);
    const col = Math.round(x / GOMOKU_CELL) - 1;
    const row = Math.round(y / GOMOKU_CELL) - 1;
    if (row < 0 || row >= GOMOKU_SIZE || col < 0 || col >= GOMOKU_SIZE) return;
    if (_gomokuState.board[row][col] !== 0) return;

    _gomokuState.board[row][col] = 1;
    _gomokuState.moves++;
    _drawGomokuStone(row, col, 1);

    if (_checkGomokuWin(row, col, 1)) {
      _gomokuState.over = true;
      _gomokuState.winner = 1;
      setTimeout(() => {
        GamePay.showGameOver('gomoku', `${t('gomoku.youWin')}! 🎉`);
      }, 300);
      return;
    }

    _gomokuState.turn = 2;
    _gomokuState.aiThinking = true;
    const turnEl = document.getElementById('gomokuTurn');
    if (turnEl) turnEl.textContent = t('gomoku.ai');

    // AI 落子
    setTimeout(() => {
      _gomokuAI();
      _gomokuState.aiThinking = false;
    }, 300);
  };

  // 触摸事件（移动端优先）
  _gomokuCanvas.ontouchend = (e) => {
    e.preventDefault();
    if (!_gomokuState) return;
    _gomokuState.lastTouchTime = Date.now();
    const touch = e.changedTouches[0];
    handlePlace(touch.clientX, touch.clientY);
  };

  // 点击事件（桌面端）
  _gomokuCanvas.onclick = (e) => {
    if (!_gomokuState) return;
    // 如果刚发生过触摸事件，跳过点击（防止双重触发）
    if (Date.now() - _gomokuState.lastTouchTime < 500) return;
    handlePlace(e.clientX, e.clientY);
  };
}

function _drawGomokuBoard() {
  const ctx = _gomokuCtx;
  ctx.fillStyle = '#dcb35c';
  ctx.fillRect(0, 0, GOMOKU_W, GOMOKU_H);
  ctx.strokeStyle = '#5c4530';
  ctx.lineWidth = 1;
  for (let i = 0; i < GOMOKU_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(GOMOKU_CELL, i * GOMOKU_CELL + GOMOKU_CELL);
    ctx.lineTo(GOMOKU_SIZE * GOMOKU_CELL, i * GOMOKU_CELL + GOMOKU_CELL);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * GOMOKU_CELL + GOMOKU_CELL, GOMOKU_CELL);
    ctx.lineTo(i * GOMOKU_CELL + GOMOKU_CELL, GOMOKU_SIZE * GOMOKU_CELL);
    ctx.stroke();
  }
  // 天元和星位
  const stars = [[3,3],[3,11],[7,7],[11,3],[11,11]];
  for (const [r, c] of stars) {
    ctx.fillStyle = '#5c4530';
    ctx.beginPath();
    ctx.arc((c+1) * GOMOKU_CELL, (r+1) * GOMOKU_CELL, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _drawGomokuStone(row, col, player) {
  const ctx = _gomokuCtx;
  const x = (col + 1) * GOMOKU_CELL;
  const y = (row + 1) * GOMOKU_CELL;
  const r = GOMOKU_CELL / 2 - 2;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (player === 1) {
    const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, r);
    grad.addColorStop(0, '#666');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#ccc');
    ctx.fillStyle = grad;
  }
  ctx.fill();
}

function _checkGomokuWin(row, col, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) break;
      if (_gomokuState.board[r][c] !== player) break;
      count++;
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) break;
      if (_gomokuState.board[r][c] !== player) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}

// 简单 AI：评分系统
function _gomokuAI() {
  const s = _gomokuState;
  let bestScore = -1;
  let bestMove = null;

  // 优先检查必胜/必防
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (s.board[r][c] !== 0) continue;
      // 检查是否有邻居（避免在偏远位置落子）
      if (!_hasNeighbor(r, c)) continue;

      // AI 进攻评分
      s.board[r][c] = 2;
      const attackScore = _evaluatePos(r, c, 2);
      s.board[r][c] = 0;

      // AI 防守评分（阻止玩家）
      s.board[r][c] = 1;
      const defenseScore = _evaluatePos(r, c, 1);
      s.board[r][c] = 0;

      const score = attackScore * 1.1 + defenseScore;
      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }
  }

  // 如果没有合适位置（开局），下天元附近
  if (!bestMove) {
    bestMove = [7, 7];
  }

  const [r, c] = bestMove;
  s.board[r][c] = 2;
  s.moves++;
  _drawGomokuStone(r, c, 2);

  if (_checkGomokuWin(r, c, 2)) {
    s.over = true;
    s.winner = 2;
    setTimeout(() => {
      GamePay.showGameOver('gomoku', `${t('gomoku.aiWin')} 😅`);
    }, 300);
    return;
  }

  s.turn = 1;
  const turnEl = document.getElementById('gomokuTurn');
  if (turnEl) turnEl.textContent = t('gomoku.you');
}

function _hasNeighbor(row, col) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < GOMOKU_SIZE && c >= 0 && c < GOMOKU_SIZE && _gomokuState.board[r][c] !== 0) return true;
    }
  }
  return false;
}

function _evaluatePos(row, col, player) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let totalScore = 0;
  for (const [dr, dc] of dirs) {
    let count = 1;
    let blocked = 0;
    // 正方向
    let i = 1;
    for (; i < 5; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) { blocked++; break; }
      if (_gomokuState.board[r][c] === player) count++;
      else if (_gomokuState.board[r][c] !== 0) { blocked++; break; }
      else break;
    }
    // 反方向
    let j = 1;
    for (; j < 5; j++) {
      const r = row - dr * j, c = col - dc * j;
      if (r < 0 || r >= GOMOKU_SIZE || c < 0 || c >= GOMOKU_SIZE) { blocked++; break; }
      if (_gomokuState.board[r][c] === player) count++;
      else if (_gomokuState.board[r][c] !== 0) { blocked++; break; }
      else break;
    }
    // 评分
    if (count >= 5) totalScore += 100000;
    else if (count === 4 && blocked === 0) totalScore += 10000;
    else if (count === 4 && blocked === 1) totalScore += 1000;
    else if (count === 3 && blocked === 0) totalScore += 1000;
    else if (count === 3 && blocked === 1) totalScore += 100;
    else if (count === 2 && blocked === 0) totalScore += 100;
    else if (count === 2 && blocked === 1) totalScore += 10;
    else totalScore += 1;
  }
  return totalScore;
}

window.TOOL_REGISTRY['gomoku'] = {
  render: renderGomoku,
  bind: bindGomokuEvents,
  beforeUnmount: () => {
    if (_gomokuCanvas && _gomokuClickHandler) _gomokuCanvas.removeEventListener('click', _gomokuClickHandler);
    _gomokuState = null;
    _gomokuCanvas = null;
    _gomokuCtx = null;
  }
};
