/**
 * 泡泡龙 - 瞄准发射，消除同色泡泡
 * Canvas 渲染，鼠标/触摸瞄准，点击发射
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

let _bubbleCanvas = null;
let _bubbleCtx = null;
let _bubbleState = null;
let _bubbleAnimId = null;
let _bubbleMouseHandler = null;
let _bubbleClickHandler = null;

const BUBBLE_W = 360;
const BUBBLE_H = 480;
const BUBBLE_R = 16;
const BUBBLE_COLS = 10;
const BUBBLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

function renderBubbleShooter() {
  return `
    <div class="card">
      <div class="card-title">🫧 ${t('bubble.title')}</div>
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${t('bubble.desc')}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">
          <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('bubble.score')}: <b id="bubbleScore" style="color:var(--primary)">0</b></span>
          ${GamePay.roundsBadge('bubble-shooter')}
        </div>
      </div>
      <div style="position:relative;display:flex;justify-content:center;">
        <canvas id="bubbleCanvas" width="${BUBBLE_W}" height="${BUBBLE_H}" style="background:linear-gradient(180deg,#1a1a3a 0%,#0a0a1a 100%);border-radius:8px;touch-action:none;max-width:100%;height:auto;"></canvas>
        <div id="gpOverlay" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);border-radius:8px;z-index:10;">
          ${GamePay.overlayHTML('bubble-shooter', 'bubble.title', 'bubble.desc')}
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);">${t('bubble.controls')}</div>
    </div>
  `;
}

function bindBubbleEvents() {
  GamePay.bindStart('bubble-shooter', startBubbleGame);
}

function startBubbleGame() {
  if (!GamePay.consumeRound('bubble-shooter')) return;

  _bubbleCanvas = document.getElementById('bubbleCanvas');
  if (!_bubbleCanvas) return;
  _bubbleCtx = _bubbleCanvas.getContext('2d');

  // 初始化泡泡网格 (顶部6行)
  const grid = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    const cols = r % 2 === 0 ? BUBBLE_COLS : BUBBLE_COLS - 1;
    for (let c = 0; c < cols; c++) {
      row.push({ color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] });
    }
    grid.push(row);
  }

  _bubbleState = {
    grid: grid,
    shooter: { x: BUBBLE_W / 2, y: BUBBLE_H - 40, angle: -Math.PI / 2 },
    currentBubble: { color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] },
    nextBubble: { color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] },
    flying: null,
    score: 0,
    over: false,
    dropping: [],
    frame: 0,
  };

  // 鼠标/触摸控制
  if (_bubbleMouseHandler) _bubbleCanvas.removeEventListener('mousemove', _bubbleMouseHandler);
  if (_bubbleClickHandler) _bubbleCanvas.removeEventListener('click', _bubbleClickHandler);

  _bubbleMouseHandler = (e) => {
    if (!_bubbleState || _bubbleState.over) return;
    const rect = _bubbleCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (BUBBLE_W / rect.width);
    const y = (e.clientY - rect.top) * (BUBBLE_H / rect.height);
    _bubbleState.shooter.angle = Math.atan2(y - _bubbleState.shooter.y, x - _bubbleState.shooter.x);
    // 限制角度（不能向下射）
    if (_bubbleState.shooter.angle > -0.2) _bubbleState.shooter.angle = -0.2;
    if (_bubbleState.shooter.angle < -Math.PI + 0.2) _bubbleState.shooter.angle = -Math.PI + 0.2;
  };
  _bubbleClickHandler = () => { _shootBubble(); };

  _bubbleCanvas.addEventListener('mousemove', _bubbleMouseHandler);
  _bubbleCanvas.addEventListener('click', _bubbleClickHandler);
  _bubbleCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!_bubbleState || _bubbleState.over) return;
    const rect = _bubbleCanvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (BUBBLE_W / rect.width);
    const y = (touch.clientY - rect.top) * (BUBBLE_H / rect.height);
    _bubbleState.shooter.angle = Math.atan2(y - _bubbleState.shooter.y, x - _bubbleState.shooter.x);
    if (_bubbleState.shooter.angle > -0.2) _bubbleState.shooter.angle = -0.2;
    if (_bubbleState.shooter.angle < -Math.PI + 0.2) _bubbleState.shooter.angle = -Math.PI + 0.2;
    _shootBubble();
  }, { passive: false });

  if (_bubbleAnimId) cancelAnimationFrame(_bubbleAnimId);
  _bubbleAnimId = requestAnimationFrame(_bubbleLoop);
}

function _shootBubble() {
  const s = _bubbleState;
  if (!s || s.over || s.flying) return;
  const speed = 8;
  s.flying = {
    x: s.shooter.x,
    y: s.shooter.y,
    vx: Math.cos(s.shooter.angle) * speed,
    vy: Math.sin(s.shooter.angle) * speed,
    color: s.currentBubble.color,
  };
  s.currentBubble = s.nextBubble;
  s.nextBubble = { color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)] };
}

function _bubbleLoop() {
  const s = _bubbleState;
  if (!s || s.over) return;
  s.frame++;

  // 背景
  _bubbleCtx.fillStyle = 'rgba(10,10,26,0.5)';
  _bubbleCtx.fillRect(0, 0, BUBBLE_W, BUBBLE_H);

  // 绘制网格泡泡
  for (let r = 0; r < s.grid.length; r++) {
    const cols = r % 2 === 0 ? BUBBLE_COLS : BUBBLE_COLS - 1;
    const offsetX = r % 2 === 0 ? 0 : BUBBLE_R;
    for (let c = 0; c < cols; c++) {
      if (!s.grid[r][c]) continue;
      const x = c * BUBBLE_R * 2 + BUBBLE_R + offsetX;
      const y = r * BUBBLE_R * 1.8 + BUBBLE_R;
      _drawBubble(x, y, s.grid[r][c].color);
    }
  }

  // 瞄准线
  if (!s.flying) {
    const ax = s.shooter.x + Math.cos(s.shooter.angle) * 40;
    const ay = s.shooter.y + Math.sin(s.shooter.angle) * 40;
    _bubbleCtx.strokeStyle = 'rgba(255,255,255,0.3)';
    _bubbleCtx.setLineDash([4, 4]);
    _bubbleCtx.beginPath();
    _bubbleCtx.moveTo(s.shooter.x, s.shooter.y);
    _bubbleCtx.lineTo(ax, ay);
    _bubbleCtx.stroke();
    _bubbleCtx.setLineDash([]);
    // 当前泡泡
    _drawBubble(s.shooter.x, s.shooter.y, s.currentBubble.color);
  }

  // 飞行泡泡
  if (s.flying) {
    s.flying.x += s.flying.vx;
    s.flying.y += s.flying.vy;
    // 左右反弹
    if (s.flying.x < BUBBLE_R) { s.flying.x = BUBBLE_R; s.flying.vx *= -1; }
    if (s.flying.x > BUBBLE_W - BUBBLE_R) { s.flying.x = BUBBLE_W - BUBBLE_R; s.flying.vx *= -1; }
    // 碰撞检测
    const hit = _checkBubbleCollision(s.flying);
    if (hit || s.flying.y < BUBBLE_R) {
      _snapBubble(s.flying, hit);
      s.flying = null;
    } else {
      _drawBubble(s.flying.x, s.flying.y, s.flying.color);
    }
  }

  // 下落动画
  for (let i = s.dropping.length - 1; i >= 0; i--) {
    const d = s.dropping[i];
    d.y += d.vy;
    d.vy += 0.3;
    d.life--;
    if (d.life <= 0 || d.y > BUBBLE_H) { s.dropping.splice(i, 1); continue; }
    _drawBubble(d.x, d.y, d.color);
  }

  // 发射器底座
  _bubbleCtx.fillStyle = '#444';
  _bubbleCtx.fillRect(s.shooter.x - 25, s.shooter.y + 15, 50, 8);

  _bubbleAnimId = requestAnimationFrame(_bubbleLoop);
}

function _drawBubble(x, y, color) {
  const ctx = _bubbleCtx;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, BUBBLE_R / 3, 0, Math.PI * 2);
  ctx.fill();
}

function _checkBubbleCollision(flying) {
  const s = _bubbleState;
  for (let r = 0; r < s.grid.length; r++) {
    const cols = r % 2 === 0 ? BUBBLE_COLS : BUBBLE_COLS - 1;
    const offsetX = r % 2 === 0 ? 0 : BUBBLE_R;
    for (let c = 0; c < cols; c++) {
      if (!s.grid[r][c]) continue;
      const x = c * BUBBLE_R * 2 + BUBBLE_R + offsetX;
      const y = r * BUBBLE_R * 1.8 + BUBBLE_R;
      const dx = flying.x - x;
      const dy = flying.y - y;
      if (dx * dx + dy * dy < (BUBBLE_R * 1.8) ** 2) {
        return { r, c };
      }
    }
  }
  return null;
}

function _snapBubble(flying, hit) {
  const s = _bubbleState;
  // 计算落点行
  let targetR = hit ? hit.r : 0;
  // 简单处理：找到最近的空位
  const row = targetR;
  const cols = row % 2 === 0 ? BUBBLE_COLS : BUBBLE_COLS - 1;
  const offsetX = row % 2 === 0 ? 0 : BUBBLE_R;
  let targetC = Math.round((flying.x - BUBBLE_R - offsetX) / (BUBBLE_R * 2));
  targetC = Math.max(0, Math.min(cols - 1, targetC));

  // 确保行存在
  if (!s.grid[row]) s.grid[row] = new Array(cols).fill(null);
  if (!s.grid[row][targetC]) {
    s.grid[row][targetC] = { color: flying.color };
  } else {
    // 找空位
    let placed = false;
    for (let dc = 0; dc < cols && !placed; dc++) {
      for (const sign of [1, -1]) {
        const nc = targetC + sign * dc;
        if (nc >= 0 && nc < cols && !s.grid[row][nc]) {
          s.grid[row][nc] = { color: flying.color };
          targetC = nc;
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      // 新增一行
      s.grid.push(new Array(BUBBLE_COLS).fill(null));
      const newRow = s.grid.length - 1;
      s.grid[newRow][0] = { color: flying.color };
      targetR = newRow;
      targetC = 0;
    }
  }

  // 检查消除
  _popBubbles(targetR, targetC);

  // 检查游戏结束（泡泡超过底部）
  const maxRows = Math.floor((BUBBLE_H - 80) / (BUBBLE_R * 1.8));
  if (s.grid.length >= maxRows) {
    let hasBubble = false;
    for (const c of s.grid[maxRows - 1] || []) { if (c) { hasBubble = true; break; } }
    if (hasBubble) {
      s.over = true;
      if (_bubbleAnimId) cancelAnimationFrame(_bubbleAnimId);
      GamePay.showGameOver('bubble-shooter', `${t('gamePay.finalScore')}: <b style="color:var(--primary);font-size:20px;">${s.score}</b>`);
    }
  }

  // 检查全部消除（胜利）
  let totalBubbles = 0;
  for (const row of s.grid) for (const c of row) if (c) totalBubbles++;
  if (totalBubbles === 0) {
    s.over = true;
    if (_bubbleAnimId) cancelAnimationFrame(_bubbleAnimId);
    GamePay.showGameOver('bubble-shooter', `${t('bubble.win')}! ${t('bubble.score')}: <b style="color:var(--primary);font-size:20px;">${s.score}</b>`);
  }
}

function _popBubbles(r, c) {
  const s = _bubbleState;
  if (!s.grid[r] || !s.grid[r][c]) return;
  const color = s.grid[r][c].color;
  const visited = new Set();
  const toPop = [];
  const queue = [[r, c]];

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    const key = cr + ',' + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    if (!s.grid[cr] || !s.grid[cr][cc] || s.grid[cr][cc].color !== color) continue;
    toPop.push([cr, cc]);
    // 邻居（六边形网格）
    const offset = cr % 2 === 0 ? 0 : -1;
    const neighbors = [
      [cr, cc - 1], [cr, cc + 1],
      [cr - 1, cc + offset], [cr - 1, cc + offset + 1],
      [cr + 1, cc + offset], [cr + 1, cc + offset + 1],
    ];
    for (const [nr, nc] of neighbors) queue.push([nr, nc]);
  }

  if (toPop.length >= 3) {
    const offsetX = r % 2 === 0 ? 0 : BUBBLE_R;
    for (const [pr, pc] of toPop) {
      const x = pc * BUBBLE_R * 2 + BUBBLE_R + (pr % 2 === 0 ? 0 : BUBBLE_R);
      const y = pr * BUBBLE_R * 1.8 + BUBBLE_R;
      s.dropping.push({ x, y, vy: -2, life: 40, color: s.grid[pr][pc].color });
      s.grid[pr][pc] = null;
    }
    s.score += toPop.length * 10;
    const scoreEl = document.getElementById('bubbleScore');
    if (scoreEl) scoreEl.textContent = s.score;
  }
}

window.TOOL_REGISTRY['bubble-shooter'] = {
  render: renderBubbleShooter,
  bind: bindBubbleEvents,
  beforeUnmount: () => {
    if (_bubbleAnimId) cancelAnimationFrame(_bubbleAnimId);
    _bubbleAnimId = null;
    if (_bubbleCanvas && _bubbleMouseHandler) _bubbleCanvas.removeEventListener('mousemove', _bubbleMouseHandler);
    if (_bubbleCanvas && _bubbleClickHandler) _bubbleCanvas.removeEventListener('click', _bubbleClickHandler);
    _bubbleState = null;
    _bubbleCanvas = null;
    _bubbleCtx = null;
  }
};
