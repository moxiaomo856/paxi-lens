/**
 * 回归测试：DAO 资助申请白名单显隐逻辑
 *
 * 需求：DAO 资助申请（社区池拨款）功能只有这 4 个钱包地址连接钱包后可见/可用，
 *       其他钱包连接后完全看不到这个功能。
 *
 * 验证点：
 *   1. 白名单地址本身是合法 paxi bech32（43 字符账户地址 + checksum）
 *   2. isDaoProposerAllowed() 对白名单地址返回 true，其他地址返回 false
 *   3. 未连接钱包时一律返回 false（不渲染任何 DAO 入口）
 *   4. renderDaoProposalCard() 在非白名单 / 未连接时返回空串
 *   5. renderProposal() 的类型下拉框里已不再出现 pool（社区池拨款）选项
 *
 * 运行：node test/verify-dao-whitelist.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

// ---- bech32 校验（与 proposal.js 内实现一致）----
const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function isValidPaxiAddress(a) {
  if (typeof a !== 'string') return false;
  const s = a.trim();
  const m = /^paxi1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}|[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58})$/.exec(s);
  if (!m) return false;
  const hrp = [];
  for (const c of 'paxi') hrp.push(c.charCodeAt(0) >> 5);
  hrp.push(0);
  for (const c of 'paxi') hrp.push(c.charCodeAt(0) & 31);
  const data = [];
  for (const c of m[1]) data.push(BECH32.indexOf(c));
  let chk = 1;
  for (const v of hrp.concat(data)) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk === 1;
}

// ---- 沙箱：加载 shared.js + proposal.js ----
const sandbox = {
  console,
  window: {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
  fetch: async () => ({ ok: false, status: 0, json: async () => ({}) }),
  setTimeout: () => {},
  clearTimeout: () => {},
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

// 浏览器 API 桩
sandbox.t = (k) => k;                    // i18n 取不到 → 返回 key 本身
sandbox.escapeHtmlSafe = (s) => String(s == null ? '' : s);
sandbox.showStatus = () => {};
sandbox.showToast = () => {};
sandbox.mapError = (e) => (e && e.message) || String(e);
sandbox.paxiToUpaxi = (s) => String(Math.round(parseFloat(s || '0') * 1e6));
sandbox.upaxiToPaxi = (s) => String(parseInt(s || '0', 10) / 1e6);
sandbox.getLCD = () => 'https://example.invalid';
sandbox.CONFIG = { lcd: 'https://example.invalid', denom: 'upaxi', feeCollector: 'paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg' };
sandbox.SHARED_CONFIG = null;            // 由 shared.js 覆盖
sandbox.PaxiCosmJS = new Proxy({}, { get: () => undefined });
sandbox.state = { connected: false, wallet: null, currentTool: 'proposal' };
sandbox.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
sandbox.navigator = { userAgent: 'node', language: 'zh-CN' };
sandbox.location = { href: '', origin: 'https://example.invalid' };

const sharedSrc = fs.readFileSync(path.join(ROOT, 'shared.js'), 'utf8');
const proposalSrc = fs.readFileSync(path.join(ROOT, 'appjs/tools/proposal.js'), 'utf8');

try {
  vm.runInContext(sharedSrc, sandbox, { filename: 'shared.js' });
} catch (e) {
  console.error('❌ shared.js 加载失败:', e.message);
  process.exit(1);
}
try {
  vm.runInContext(proposalSrc, sandbox, { filename: 'proposal.js' });
} catch (e) {
  console.error('❌ proposal.js 加载失败:', e.message);
  process.exit(1);
}

// 注意：const/let 声明不会挂到 sandbox 对象上，需用 runInContext 取值
const wl = vm.runInContext('SHARED_CONFIG.governance.daoProposerWhitelist', sandbox);
const OUTSIDER = 'paxi1gzrza9s6frtwenz0p4dpjftjpvjaznn6f2lvh4'; // 白名单外的合法地址

let failures = 0;
function check(ok, label) {
  console.log((ok ? '✅' : '❌') + ' ' + label);
  if (!ok) failures++;
}

console.log('\n== 白名单配置 ==');
check(Array.isArray(wl) && wl.length === 4, `白名单共 4 个地址（实际 ${wl ? wl.length : 0}）`);
(wl || []).forEach((a, i) => check(isValidPaxiAddress(a), `白名单[${i}] bech32 合法: ${a}`));

console.log('\n== isDaoProposerAllowed 白名单判定 ==');
function withWallet(addr) {
  sandbox.state.connected = !!addr;
  sandbox.state.wallet = addr ? { address: addr } : null;
  return sandbox.isDaoProposerAllowed();
}
check(withWallet(null) === false, '未连接钱包 → 不可用');
(wl || []).forEach((a) => check(withWallet(a) === true, `白名单地址可用: ${a}`));
check(withWallet(OUTSIDER) === false, `非白名单地址不可用: ${OUTSIDER}`);
check(withWallet('paxi1notavalidaddress000000000000000000000000000') === false, '非法地址不可用');

console.log('\n== renderDaoProposalCard 显隐 ==');
withWallet(null);
check(sandbox.renderDaoProposalCard() === '', '未连接钱包 → 不渲染 DAO 卡片');
withWallet(OUTSIDER);
check(sandbox.renderDaoProposalCard() === '', '非白名单钱包 → 不渲染 DAO 卡片');
withWallet(wl[0]);
const card = sandbox.renderDaoProposalCard();
check(card && card.includes('daoPropSubmitBtn'), '白名单钱包 → 渲染 DAO 卡片（含提交按钮）');
check(card && card.includes('daoPropRecipient') && card.includes('daoPropAmount'), '白名单钱包 → 卡片含收款地址/金额输入');

console.log('\n== 类型下拉框不再暴露 pool 选项 ==');
const sel = sandbox.renderProposal().match(/<select id="proposalType"[\s\S]*?<\/select>/);
check(!!sel && !/value="pool"/.test(sel[0]), '提案类型下拉框中无 pool 选项');
check(!!sel && /value="text"/.test(sel[0]) && /value="param"/.test(sel[0]), '提案类型下拉框保留 text / param');

console.log('\n---------------- 判定 ----------------');
if (failures) { console.log(`\nRESULT: FAIL (${failures} 项未通过)`); process.exit(1); }
console.log('\nRESULT: PASS');
