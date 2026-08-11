/**
 * 2048 游戏 - 合并相同数字达到 2048
 * 键盘方向键 / WASD + 触摸滑动
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

let _g2048State = null;
let _g2048KeyDown = null;
let _g2048TouchStart = null;

function render2048() {
  return `
    <div class="card">
      <div class="card-title">🔢 ${t('g2048.title')}</div>
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${t('g2048.desc')}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">
          <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('g2048.score')}: <b id="g2048Score" style="color:var(--primary)">0</b></span>
          <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('g2048.best')}: <b id="g2048Best" style="color:var(--warning)">0</b></span>
          ${GamePay.roundsBadge('game-2048')}
        </div>
      </div>
      <div style="position:relative;display:flex;justify-content:center;">
        <div id="g2048Board" style="width:320px;height:320px;background:var(--bg);border-radius:8px;padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;position:relative;touch-action:none;"></div>
        <div id="gpOverlay" style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:336px;height:336px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);border-radius:8px;z-index:10;">
          ${GamePay.overlayHTML('game-2048', 'g2048.title', 'g2048.desc')}
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);">${t('g2048.controls')}</div>
    </div>
  `;
}

function bind2048Events() {
  GamePay.bindStart('game-2048', start2048Game);
}

function start2048Game() {
  if (!GamePay.consumeRound('game-2048')) return;

  _g2048State = {
    grid: Array(4).fill(null).map(() => Array(4).fill(0)),
    score: 0,
    best: parseInt(localStorage.getItem('paxi_2048_best') || '0', 10),
    over: false,
    won: false,
  };

  _add2048Tile();
  _add2048Tile();
  _render2048Board();

  // 键盘控制
  if (_g2048KeyDown) window.removeEventListener('keydown', _g2048KeyDown);
  _g2048KeyDown = (e) => {
    if (!_g2048State || _g2048State.over) return;
    let moved = false;
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': moved = _move2048('left'); break;
      case 'ArrowRight': case 'd': case 'D': moved = _move2048('right'); break;
      case 'ArrowUp': case 'w': case 'W': moved = _move2048('up'); break;
      case 'ArrowDown': case 's': case 'S': moved = _move2048('down'); break;
    }
    if (moved) { e.preventDefault(); _after2048Move(); }
  };
  window.addEventListener('keydown', _g2048KeyDown);

  // 触摸滑动
  const board = document.getElementById('g2048Board');
  if (board) {
    board.addEventListener('touchstart', (e) => {
      _g2048TouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    board.addEventListener('touchend', (e) => {
      if (!_g2048TouchStart || !_g2048State || _g2048State.over) return;
      const dx = e.changedTouches[0].clientX - _g2048TouchStart.x;
      const dy = e.changedTouches[0].clientY - _g2048TouchStart.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX, absY) < 20) return;
      let moved = false;
      if (absX > absY) moved = _move2048(dx > 0 ? 'right' : 'left');
      else moved = _move2048(dy > 0 ? 'down' : 'up');
      if (moved) _after2048Move();
      _g2048TouchStart = null;
    }, { passive: true });
  }
}

function _add2048Tile() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (_g2048State.grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  _g2048State.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function _move2048(dir) {
  const g = _g2048State.grid;
  let moved = false;
  const rotate = (grid) => grid[0].map((_, i) => grid.map(row => row[i]).reverse());
  const unrotate = (grid) => grid[0].map((_, i) => grid.map(row => row[i])).reverse();

  let work = g.map(row => [...row]);
  // 统一转成向左移动
  for (let i = 0; i < { left: 0, up: 1, right: 2, down: 3 }[dir]; i++) work = rotate(work);

  for (let r = 0; r < 4; r++) {
    let row = work[r].filter(v => v !== 0);
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] === row[i + 1]) {
        row[i] *= 2;
        _g2048State.score += row[i];
        if (row[i] === 2048) _g2048State.won = true;
        row.splice(i + 1, 1);
      }
    }
    while (row.length < 4) row.push(0);
    if (JSON.stringify(row) !== JSON.stringify(work[r])) moved = true;
    work[r] = row;
  }
  // 转回来
  for (let i = 0; i < (4 - { left: 0, up: 1, right: 2, down: 3 }[dir]) % 4; i++) work = unrotate(work);

  if (moved) _g2048State.grid = work;
  return moved;
}

function _after2048Move() {
  _add2048Tile();
  _render2048Board();
  if (_g2048State.score > _g2048State.best) {
    _g2048State.best = _g2048State.score;
    localStorage.setItem('paxi_2048_best', String(_g2048State.best));
  }
  // 检查游戏结束
  if (_is2048Over()) {
    _g2048State.over = true;
    if (_g2048KeyDown) { window.removeEventListener('keydown', _g2048KeyDown); _g2048KeyDown = null; }
    GamePay.showGameOver('game-2048', `${t('gamePay.finalScore')}: <b style="color:var(--primary);font-size:20px;">${_g2048State.score}</b>`);
  }
}

function _is2048Over() {
  const g = _g2048State.grid;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (g[r][c] === 0) return false;
      if (c < 3 && g[r][c] === g[r][c + 1]) return false;
      if (r < 3 && g[r][c] === g[r + 1][c]) return false;
    }
  return true;
}

function _render2048Board() {
  const board = document.getElementById('g2048Board');
  if (!board || !_g2048State) return;
  board.innerHTML = '';
  const colors = { 0: 'var(--bg)', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = _g2048State.grid[r][c];
      const cell = document.createElement('div');
      cell.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:800;transition:all 0.1s;${v <= 4 ? 'color:#776e65;' : 'color:#fff;'}`;
      const bg = colors[v] || '#3c3a32';
      cell.style.background = bg;
      cell.style.fontSize = v >= 1024 ? '20px' : v >= 128 ? '22px' : '28px';
      cell.textContent = v || '';
      board.appendChild(cell);
    }
  }
  const scoreEl = document.getElementById('g2048Score');
  if (scoreEl) scoreEl.textContent = _g2048State.score;
  const bestEl = document.getElementById('g2048Best');
  if (bestEl) bestEl.textContent = _g2048State.best;
}

window.TOOL_REGISTRY['game-2048'] = {
  render: render2048,
  bind: bind2048Events,
  beforeUnmount: () => {
    if (_g2048KeyDown) { window.removeEventListener('keydown', _g2048KeyDown); _g2048KeyDown = null; }
    _g2048State = null;
  }
};
