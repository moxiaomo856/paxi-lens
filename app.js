/**
 * Paxi 工具箱 - 主入口
 * 负责：工具渲染调度、事件绑定、应用初始化
 */

// ============================================================
// 工具渲染（二级页面）
// ============================================================
function renderTool(tool) {
  const main = document.getElementById('mainContent');
  let content = '';

  if (tool === 'nft-launcher') {
    content = `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:20px;">🎨 NFT发射平台<br><br><a href="nft-launcher/index.html" target="_blank" style="color:var(--primary);">点击打开独立页面 →</a></p></div>`;
  } else if (window.TOOL_REGISTRY && window.TOOL_REGISTRY[tool] && typeof window.TOOL_REGISTRY[tool].render === 'function') {
    content = window.TOOL_REGISTRY[tool].render();
  } else {
    content = '<p style="color:var(--text-muted);text-align:center;padding:20px;">工具加载中...</p>';
  }

  main.innerHTML = `
    <div class="back-bar" onclick="navigateHome()">${t('back')}</div>
    ${content}
  `;

  bindToolEvents(tool);

  if (window.TOOL_REGISTRY && window.TOOL_REGISTRY[tool]) {
    if (typeof window.TOOL_REGISTRY[tool].onMount === 'function') {
      window.TOOL_REGISTRY[tool].onMount();
    }
  }
}

function bindToolEvents(tool) {
  if (window.TOOL_REGISTRY && window.TOOL_REGISTRY[tool] && typeof window.TOOL_REGISTRY[tool].bind === 'function') {
    window.TOOL_REGISTRY[tool].bind();
    return;
  }
  switch (tool) {
    case 'validator-compare':
      if (typeof loadValidatorData === 'function') loadValidatorData();
      break;
    case 'redelegate':
      if (typeof loadRedelegateData === 'function') loadRedelegateData();
      break;
  }
}

// ============================================================
// 初始化
// ============================================================
function initApp() {
  updateHeaderUI();
  renderHome();
  checkWalletInjection();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ============================================================
// 补充 delete 到 LANG.common
// ============================================================
if (typeof LANG !== 'undefined') {
  if (LANG.zh && LANG.zh.common) LANG.zh.common.delete = '删除';
  if (LANG.en && LANG.en.common) LANG.en.common.delete = 'Delete';
}
