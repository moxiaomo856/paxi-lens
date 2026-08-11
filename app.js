/**
 * Paxi 工具箱 - 主入口
 * 负责：工具渲染调度、事件绑定、应用初始化
 */

// ============================================================
// 工具渲染（二级页面）
// ============================================================
function renderTool(tool, prevTool) {
  const main = document.getElementById('mainContent');

  // Cleanup previous tool
  if (prevTool && window.TOOL_REGISTRY && window.TOOL_REGISTRY[prevTool]) {
    if (typeof window.TOOL_REGISTRY[prevTool].beforeUnmount === 'function') {
      window.TOOL_REGISTRY[prevTool].beforeUnmount();
    }
  }

  let content = '';

  if (window.TOOL_REGISTRY && window.TOOL_REGISTRY[tool] && typeof window.TOOL_REGISTRY[tool].render === 'function') {
    content = window.TOOL_REGISTRY[tool].render();
  } else {
    content = '<p style="color:var(--text-muted);text-align:center;padding:20px;">加载中...</p>';
  }

  main.innerHTML = `
    <div class="back-bar" onclick="navigateBack()">${t('back')}</div>
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
  }
  // onMount 已在 renderTool 中统一调用，此处不再重复
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
