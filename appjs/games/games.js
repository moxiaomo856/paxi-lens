/**
 * 游戏娱乐 - 游戏列表页面
 */
if (!window.TOOL_REGISTRY) window.TOOL_REGISTRY = {};

const GAMES = [
  { id: 'plane-war', icon: '✈️', name: '飞机大战', nameEn: 'Plane War', desc: '经典射击游戏，躲避敌机，消灭敌人', descEn: 'Classic shooter, dodge and destroy enemies', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
  { id: 'game-2048', icon: '🔢', name: '2048', nameEn: '2048', desc: '合并相同数字，挑战2048！', descEn: 'Merge same numbers, reach 2048!', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
  { id: 'klotski', icon: '🧩', name: '华容道', nameEn: 'Klotski', desc: '经典滑块拼图，移动方块助曹操突围', descEn: 'Classic sliding puzzle, help Cao Cao escape', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
  { id: 'bubble-shooter', icon: '🫧', name: '泡泡龙', nameEn: 'Bubble Shooter', desc: '瞄准发射，消除同色泡泡', descEn: 'Aim and shoot, pop same-color bubbles', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
  { id: 'tetris', icon: '🟦', name: '俄罗斯方块', nameEn: 'Tetris', desc: '经典方块消除游戏', descEn: 'Classic block-stacking game', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
  { id: 'gomoku', icon: '⚫', name: '五子棋', nameEn: 'Gomoku', desc: '人机对弈，五子连珠获胜', descEn: 'Play vs AI, connect five to win', price: '5 PAXI / 10局', priceEn: '5 PAXI / 10 rounds' },
];

function renderGamesList() {
  return `
    <div class="card">
      <div class="card-title">🎮 ${t('games.title')}</div>
      <div class="tool-desc">${t('games.desc')}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
        ${GAMES.map(g => `
          <div class="tool-card" data-game="${g.id}" style="min-height:100px;cursor:pointer;">
            <div class="icon" style="font-size:32px;">${g.icon}</div>
            <div class="name" style="font-size:12px;font-weight:600;">${currentLang === 'zh' ? g.name : g.nameEn}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;padding:0 4px;">${currentLang === 'zh' ? g.desc : g.descEn}</div>
            <div style="font-size:10px;color:var(--primary);margin-top:4px;font-weight:600;">💳 ${currentLang === 'zh' ? g.price : g.priceEn}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function bindGamesListEvents() {
  document.querySelectorAll('.tool-card[data-game]').forEach(card => {
    card.addEventListener('click', () => {
      const gameId = card.dataset.game;
      navigateToTool(gameId);
    });
  });
}

window.TOOL_REGISTRY['games'] = { render: renderGamesList, bind: bindGamesListEvents };
