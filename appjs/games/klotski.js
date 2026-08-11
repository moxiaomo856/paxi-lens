/**
 * 华容道 - 经典滑块拼图
 * 点击方块选中，再点击方向移动；或键盘方向键移动选中方块
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

let _klotskiState = null;
let _klotskiKeyDown = null;

// 经典横刀立马布局 (4列 x 5行)
// 0=空, 1=小兵(1x1), 2=曹操(2x2), 3=关羽(2x1横), 4=张飞(1x2竖), 5=赵云, 6=马超, 7=黄忠
const KLOTSKI_LAYOUT = [
  { id: 'caocao', type: 'big', x: 1, y: 0, w: 2, h: 2, name: '曹操', nameEn: 'Cao Cao' },
  { id: 'zhangfei', type: 'vert', x: 0, y: 0, w: 1, h: 2, name: '张飞', nameEn: 'Zhang Fei' },
  { id: 'zhaoyun', type: 'vert', x: 3, y: 0, w: 1, h: 2, name: '赵云', nameEn: 'Zhao Yun' },
  { id: 'machao', type: 'vert', x: 0, y: 2, w: 1, h: 2, name: '马超', nameEn: 'Ma Chao' },
  { id: 'huangzhong', type: 'vert', x: 3, y: 2, w: 1, h: 2, name: '黄忠', nameEn: 'Huang Zhong' },
  { id: 'guanyu', type: 'horiz', x: 1, y: 2, w: 2, h: 1, name: '关羽', nameEn: 'Guan Yu' },
  { id: 'b1', type: 'small', x: 1, y: 3, w: 1, h: 1, name: '兵', nameEn: 'Soldier' },
  { id: 'b2', type: 'small', x: 2, y: 3, w: 1, h: 1, name: '兵', nameEn: 'Soldier' },
  { id: 'b3', type: 'small', x: 0, y: 4, w: 1, h: 1, name: '兵', nameEn: 'Soldier' },
  { id: 'b4', type: 'small', x: 3, y: 4, w: 1, h: 1, name: '兵', nameEn: 'Soldier' },
];

function renderKlotski() {
  return `
    <div class="card">
      <div class="card-title">🧩 ${t('klotski.title')}</div>
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${t('klotski.desc')}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px;">
          <span style="background:var(--bg);padding:4px 10px;border-radius:6px;font-size:12px;">${t('klotski.moves')}: <b id="klotskiMoves" style="color:var(--primary)">0</b></span>
          ${GamePay.roundsBadge('klotski')}
        </div>
      </div>
      <div style="position:relative;display:flex;justify-content:center;">
        <div id="klotskiBoard" style="width:280px;max-width:100%;height:auto;aspect-ratio:4/5;background:#8b6f47;border:3px solid #5c4530;border-radius:8px;position:relative;touch-action:none;"></div>
        <div id="gpOverlay" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);border-radius:8px;z-index:10;">
          ${GamePay.overlayHTML('klotski', 'klotski.title', 'klotski.desc')}
        </div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);">${t('klotski.controls')}</div>
    </div>
  `;
}

function bindKlotskiEvents() {
  GamePay.bindStart('klotski', startKlotskiGame);
}

function startKlotskiGame() {
  if (!GamePay.consumeRound('klotski')) return;

  _klotskiState = {
    blocks: JSON.parse(JSON.stringify(KLOTSKI_LAYOUT)),
    selected: null,
    moves: 0,
    won: false,
  };
  _renderKlotskiBoard();

  // 键盘控制
  if (_klotskiKeyDown) window.removeEventListener('keydown', _klotskiKeyDown);
  _klotskiKeyDown = (e) => {
    if (!_klotskiState || _klotskiState.won || !_klotskiState.selected) return;
    let dx = 0, dy = 0;
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
      case 'ArrowRight': case 'd': case 'D': dx = 1; break;
      case 'ArrowUp': case 'w': case 'W': dy = -1; break;
      case 'ArrowDown': case 's': case 'S': dy = 1; break;
      default: return;
    }
    e.preventDefault();
    _tryMoveBlock(_klotskiState.selected, dx, dy);
  };
  window.addEventListener('keydown', _klotskiKeyDown);

  // 触摸滑动控制（手机端）
  const board = document.getElementById('klotskiBoard');
  if (board) {
    let touchStart = null;
    board.ontouchstart = (e) => {
      if (!_klotskiState || _klotskiState.won || !_klotskiState.selected) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    board.ontouchend = (e) => {
      if (!touchStart || !_klotskiState || _klotskiState.won || !_klotskiState.selected) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX, absY) < 15) { touchStart = null; return; }
      if (absX > absY) {
        _tryMoveBlock(_klotskiState.selected, dx > 0 ? 1 : -1, 0);
      } else {
        _tryMoveBlock(_klotskiState.selected, 0, dy > 0 ? 1 : -1);
      }
      touchStart = null;
    };
  }
}

function _renderKlotskiBoard() {
  const board = document.getElementById('klotskiBoard');
  if (!board || !_klotskiState) return;
  board.innerHTML = '';

  // 使用百分比定位，适配手机缩放
  const cellWPct = 100 / 4;  // 每列 25%
  const cellHPct = 100 / 5;  // 每行 20%

  const colors = { big: '#e74c3c', vert: '#3498db', horiz: '#2ecc71', small: '#f39c12' };

  _klotskiState.blocks.forEach(b => {
    const el = document.createElement('div');
    const isSelected = _klotskiState.selected === b.id;
    el.style.cssText = `
      position:absolute;
      left:${b.x * cellWPct}%;
      top:${b.y * cellHPct}%;
      width:${b.w * cellWPct}%;
      height:${b.h * cellHPct}%;
      padding:2px;
      box-sizing:border-box;
      background:${colors[b.type]};
      border-radius:6px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:#fff;
      font-weight:700;
      font-size:${b.type === 'big' ? '16px' : '11px'};
      cursor:pointer;
      box-shadow:${isSelected ? '0 0 0 3px #fff, 0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)'};
      transition:all 0.15s;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
    `;
    el.textContent = currentLang === 'zh' ? b.name : b.nameEn;
    el.dataset.blockId = b.id;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_klotskiState || _klotskiState.won) return;
      if (_klotskiState.selected === b.id) {
        _klotskiState.selected = null;
      } else {
        _klotskiState.selected = b.id;
      }
      _renderKlotskiBoard();
    });
    board.appendChild(el);
  });

  // 点击空白处取消选中
  board.onclick = () => {
    if (_klotskiState) { _klotskiState.selected = null; _renderKlotskiBoard(); }
  };

  const movesEl = document.getElementById('klotskiMoves');
  if (movesEl) movesEl.textContent = _klotskiState.moves;
}

function _tryMoveBlock(blockId, dx, dy) {
  const block = _klotskiState.blocks.find(b => b.id === blockId);
  if (!block) return false;

  const newX = block.x + dx;
  const newY = block.y + dy;

  // 边界检查
  if (newX < 0 || newY < 0 || newX + block.w > 4 || newY + block.h > 5) return false;

  // 碰撞检查
  for (const other of _klotskiState.blocks) {
    if (other.id === block.id) continue;
    if (newX < other.x + other.w && newX + block.w > other.x &&
        newY < other.y + other.h && newY + block.h > other.y) {
      return false;
    }
  }

  block.x = newX;
  block.y = newY;
  _klotskiState.moves++;
  _renderKlotskiBoard();

  // 胜利条件：曹操(2x2)到达底部中间 (x=1, y=3)
  if (block.id === 'caocao' && block.x === 1 && block.y === 3) {
    _klotskiState.won = true;
    if (_klotskiKeyDown) { window.removeEventListener('keydown', _klotskiKeyDown); _klotskiKeyDown = null; }
    setTimeout(() => {
      GamePay.showGameOver('klotski', `${t('klotski.win')}! ${t('klotski.moves')}: <b style="color:var(--primary);font-size:20px;">${_klotskiState.moves}</b>`);
    }, 300);
  }
  return true;
}

window.TOOL_REGISTRY['klotski'] = {
  render: renderKlotski,
  bind: bindKlotskiEvents,
  beforeUnmount: () => {
    if (_klotskiKeyDown) { window.removeEventListener('keydown', _klotskiKeyDown); _klotskiKeyDown = null; }
    _klotskiState = null;
  }
};
