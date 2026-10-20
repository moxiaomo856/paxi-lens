/* ============================================================================
 * Paxi Suite · 链上解码器模块（decoder-core.js v2 的界面移植版）
 * 功能：交易故事解码 / 合约功能探测 / 合约沙盒 / 批量解码 / 失败诊断
 * 依赖：decoder-core.js（window.PaxiDecoder）、shared.js（escapeHtml/showToast）
 * ==========================================================================*/

window.TOOL_REGISTRY ||= {};

(function () {
  'use strict';
  const D = window.PaxiDecoder;

  /* ------------------------------------------------ i18n（工具内字典，zh/en 对称） */
  const DEC_DICT = {
    zh: {
      title: '🔍 链上解码器', searchPh: '交易哈希 / 合约地址 / 钱包地址', decodeBtn: '解码', clearTitle: '清空', clear: '清空',
      tabDecode: '📖 交易解码', tabSandbox: '🧪 合约沙盒', tabBatch: '📋 批量解码', tabDiagnose: '🩺 失败诊断',
      jumpBalance: '💰 余额查询', jumpRedelegate: '🔄 变更质押', jumpValidator: '📊 验证节点', jumpProposal: '📦 治理提案',
      sandboxHint: '直接向节点发起只读查询，不签名、不消耗 Gas。不知道该填什么？先用「解码」页查合约地址，会列出它真实支持的全部查询方法。',
      contractAddr: '合约地址', queryJson: '查询 JSON', runQuery: '执行查询',
      batchHint: '每行一个 64 位交易哈希（也可用空格/逗号分隔），上限 200 笔。', runBatchBtn: '开始批量解码', exportCsvBtn: '📥 导出 CSV',
      diagHint: '输入失败的交易哈希，自动归类失败原因并给出修复建议。', failHashPh: '失败交易的哈希...', diagBtn: '诊断原因',
      footer: '⚠️ 本工具仅查询链上公开数据并翻译成人话，不提供任何交易建议。解码全程只读，不签名、不接触资产。',
      txOk: '✅ 交易成功', txFail: '❌ 交易失败', txFailCause: '：{0}', height: '高度 {0}', paren: '（{0}）',
      storyTitle: '📖 这笔交易做了什么', memo: '📝 备注：{0}',
      feeTitle: '手续费', amount: '金额', feePayer: '付款地址', txHash: '交易哈希', copy: '⧉ 复制', sharePage: '分享本页', copyLink: '🔗 复制解码链接',
      nativeDelta: '原生币净变动（PAXI）', received: '📥 收到', sent: '📤 支出', contractFlows: '智能合约资产转移', from: '从 ', to: '到 ', qty: '数量：',
      msgsTitle: '底层动作（{0} 条）', sender: '发起方：', execMethod: '执行方法：', contractOf: ' · 合约 ', viewArgs: '查看参数', rawMsg: '原始消息', failLog: '失败日志',
      queryingChain: '正在查询链上数据…', isContract: '🔗 这是一个智能合约', profile: '合约档案', label: '标签', kind: '类别', creator: '创建者',
      admin: '管理员', upgradable: '（可升级）', noAdmin: '不可升级（已放弃管理权）', createdHeight: '创建高度',
      totalSupply: '总发行量', tokenInfo: '代币信息', name: '名称', symbol: '符号', decimals: '精度',
      srcEcho: '来自合约真实回显', srcProbe: '来自逐个实试验证', srcNoEcho: '合约未回显', srcErr: '回显异常',
      queryFeatures: '可查询功能（链上实测得出）',
      methodsFound: '已从链上实测出 {0} 个真实查询方法。点击任意方法可直接带入沙盒执行。',
      noMethods: '该合约未回显查询方法清单（可能是自定义实现或无公开查询接口）。你仍可在沙盒页手动输入方法名与参数进行测试。',
      openSandbox: '🧪 打开沙盒测试该合约',
      nativeBalance: '原生币余额', noBalance: '该地址当前无原生币余额',
      localNote: '本机备注（仅保存在这台设备）', noteName: '备注名', notSet: '未设置', address: '地址',
      editNote: '修改', addNote: '添加', notePrompt: '给这个地址起个备注名（仅保存在本机浏览器）：',
      unknownInput: '没认出这是哈希还是地址，检查一下是否复制完整？',
      inputHint: 'Paxi 地址以 <b>paxi1</b> 开头；交易哈希是 64 位字母数字组合。',
      parsingTx: '正在解析交易 {0}…', netErr: '⚠️ 网络/节点异常（这不是交易失败，请稍后重试）：{0}', nodeReturn: '节点返回',
      netErrHint: '常见原因：哈希不存在、尚未上链，或节点暂时无响应。',
      badAddr: '请填写合法的合约地址（以 paxi1 开头的完整地址）', noJson: '请填写查询 JSON', jsonErr: 'JSON 语法错误：{0}',
      queryingNode: '向节点发起只读查询…', queryOk: '✅ 查询成功',
      realMethods: '💡 该合约真实支持的查询方法为：', expandAll: '点击展开全部 {0} 个',
      notContract: '该地址不是合约，或合约已被迁移销毁。', queryFail: '查询失败：{0}', nodeRaw: '节点原始返回', realMethodsTitle: '真实查询方法',
      noValidHash: '未检测到有效哈希（每行一个 64 位十六进制哈希）。', overLimit: '数量超过上限，仅处理前 {0} 笔。',
      parsing: '解析中 {0}/{1}', stOk: '成功', stFail: '失败', stQueryFail: '查询失败', done: '完成 {0} 笔',
      needHash: '请输入 64 位交易哈希', diagnosing: '诊断中…', netErr2: '⚠️ 网络/节点异常（这不是交易失败）：{0}',
      txOkNoDiag: '✅ 该交易执行成功，无需诊断。', noClassify: '• 无法自动归类，请查看下方原始日志自行判断。',
      txFailCode: '❌ 交易失败（code {0}）', diagTitle: '诊断结论', gasSet: 'Gas 设定', gasUsed: '实际消耗', codespace: '错误空间', rawLogTitle: '原始日志',
      d1: '余额不足：账户不足以同时支付转账金额与手续费。', d2: 'Gas 超限：交易逻辑消耗超过设定的 gas_limit，需提高 Gas。',
      d3: '合约业务逻辑报错：这是合约内部主动返回的错误，与 Gas 无关。', d4: '权限不足：执行者不是该合约的 admin/minter。',
      d5: '对象已存在：如同名标签、同 token_id 已存在。', d6: '对象不存在：目标 ID、合约地址或提案不存在。',
      d7: '参数格式错误：JSON 与合约期望的字段结构不匹配。', d8: '交易序列冲突：该账户 nonce 未同步或交易重复广播。',
      d9: '交易超时：未在目标高度内打包，可重试广播。', d10: '精度错误：代币精度(decimals)设置有误。',
      welcome: '把任意 <b>交易哈希</b> 或 <b>地址</b> 粘贴进来，<br>我用大白话告诉你它做了什么。',
      coreMissing: '核心引擎 decoder-core.js 未加载成功。', copied: '✅ 已复制', copyFail: '❌ 复制失败', addrCopied: '✅ 地址已复制',
      truncated: '\n…（已截断，共 {0} 字符）'
    },
    en: {
      title: '🔍 On-chain Decoder', searchPh: 'Tx hash / contract address / wallet address', decodeBtn: 'Decode', clearTitle: 'Clear', clear: 'Clear',
      tabDecode: '📖 Decode Tx', tabSandbox: '🧪 Sandbox', tabBatch: '📋 Batch Decode', tabDiagnose: '🩺 Failure Diagnosis',
      jumpBalance: '💰 Balance', jumpRedelegate: '🔄 Redelegate', jumpValidator: '📊 Validators', jumpProposal: '📦 Proposals',
      sandboxHint: 'Send read-only queries straight to the node — no signing, no gas. Not sure what to enter? Look up the contract on the Decode tab first; it lists every query method the contract actually supports.',
      contractAddr: 'Contract address', queryJson: 'Query JSON', runQuery: 'Run query',
      batchHint: 'One 64-char tx hash per line (spaces/commas also work), up to 200 txs.', runBatchBtn: 'Start Batch Decode', exportCsvBtn: '📥 Export CSV',
      diagHint: 'Enter a failed tx hash to auto-classify the failure reason with fix suggestions.', failHashPh: 'Hash of the failed tx...', diagBtn: 'Diagnose',
      footer: '⚠️ This tool only reads public on-chain data and explains it in plain words. No trading advice. Fully read-only: no signing, no asset access.',
      txOk: '✅ Tx succeeded', txFail: '❌ Tx failed', txFailCause: ': {0}', height: 'Height {0}', paren: ' ({0})',
      storyTitle: '📖 What this tx did', memo: '📝 Memo: {0}',
      feeTitle: 'Fee', amount: 'Amount', feePayer: 'Fee payer', txHash: 'Tx hash', copy: '⧉ Copy', sharePage: 'Share', copyLink: '🔗 Copy decode link',
      nativeDelta: 'Native balance changes (PAXI)', received: '📥 Received', sent: '📤 Sent', contractFlows: 'Smart contract asset transfers', from: 'From ', to: 'To ', qty: 'Amount: ',
      msgsTitle: 'Messages ({0})', sender: 'Sender: ', execMethod: 'Method: ', contractOf: ' · Contract ', viewArgs: 'View args', rawMsg: 'Raw message', failLog: 'Failure log',
      queryingChain: 'Querying on-chain data…', isContract: '🔗 This is a smart contract', profile: 'Contract profile', label: 'Label', kind: 'Category', creator: 'Creator',
      admin: 'Admin', upgradable: ' (upgradable)', noAdmin: 'Not upgradable (admin renounced)', createdHeight: 'Created at height',
      totalSupply: 'Total supply', tokenInfo: 'Token info', name: 'Name', symbol: 'Symbol', decimals: 'Decimals',
      srcEcho: 'from real contract echo', srcProbe: 'from per-method probing', srcNoEcho: 'no echo', srcErr: 'echo error',
      queryFeatures: 'Queryable methods (verified on-chain)',
      methodsFound: 'Found {0} real query methods on-chain. Click any method to load it into the sandbox.',
      noMethods: 'This contract did not echo a method list (custom implementation or no public query interface). You can still type method names and args manually in the sandbox.',
      openSandbox: '🧪 Open sandbox for this contract',
      nativeBalance: 'Native balance', noBalance: 'No native balance at this address',
      localNote: 'Local note (stored on this device only)', noteName: 'Note', notSet: 'Not set', address: 'Address',
      editNote: 'Edit', addNote: 'Add', notePrompt: 'Set a note for this address (stored in this browser only):',
      unknownInput: 'Cannot tell whether this is a hash or an address — is it copied in full?',
      inputHint: 'Paxi addresses start with <b>paxi1</b>; tx hashes are 64 alphanumeric characters.',
      parsingTx: 'Parsing tx {0}…', netErr: '⚠️ Network/node error (this is NOT a tx failure, please retry): {0}', nodeReturn: 'Node response',
      netErrHint: 'Common causes: hash not found, not yet indexed, or the node is temporarily unresponsive.',
      badAddr: 'Please enter a valid contract address (full paxi1... address)', noJson: 'Please enter query JSON', jsonErr: 'JSON syntax error: {0}',
      queryingNode: 'Querying the node (read-only)…', queryOk: '✅ Query succeeded',
      realMethods: '💡 Real query methods supported by this contract: ', expandAll: 'click to expand all {0}',
      notContract: 'This address is not a contract, or the contract was migrated/destroyed.', queryFail: 'Query failed: {0}', nodeRaw: 'Raw node response', realMethodsTitle: 'Real query methods',
      noValidHash: 'No valid hashes detected (one 64-char hex hash per line).', overLimit: 'Over the limit — only processing the first {0}.',
      parsing: 'Parsing {0}/{1}', stOk: 'Success', stFail: 'Failed', stQueryFail: 'Query failed', done: 'Done: {0} txs',
      needHash: 'Please enter a 64-char tx hash', diagnosing: 'Diagnosing…', netErr2: '⚠️ Network/node error (this is NOT a tx failure): {0}',
      txOkNoDiag: '✅ This tx executed successfully — nothing to diagnose.', noClassify: '• Could not auto-classify. Check the raw log below.',
      txFailCode: '❌ Tx failed (code {0})', diagTitle: 'Diagnosis', gasSet: 'Gas limit', gasUsed: 'Gas used', codespace: 'Codespace', rawLogTitle: 'Raw log',
      d1: 'Insufficient funds: the account cannot cover both the transfer and the fee.', d2: 'Out of gas: execution exceeded the gas limit — raise the Gas.',
      d3: 'Contract logic error: the contract itself returned this error — unrelated to gas.', d4: 'Unauthorized: the caller is not the contract admin/minter.',
      d5: 'Already exists: e.g. duplicate label or token_id.', d6: 'Not found: the target ID, contract address or proposal does not exist.',
      d7: 'Invalid args: JSON does not match the fields the contract expects.', d8: 'Sequence conflict: account nonce out of sync, or the tx was broadcast twice.',
      d9: 'Timed out: not included within the target height — you may rebroadcast.', d10: 'Decimals error: token decimals misconfigured.',
      welcome: 'Paste any <b>tx hash</b> or <b>address</b> above,<br>and I will explain what it did in plain words.',
      coreMissing: 'Core engine decoder-core.js failed to load.', copied: '✅ Copied', copyFail: '❌ Copy failed', addrCopied: '✅ Address copied',
      truncated: '\n…(truncated, {0} chars total)'
    }
  };
  const dcPt = (k, ...a) => {
    const lang = (typeof currentLang !== 'undefined' && currentLang) || 'zh';
    let s = (DEC_DICT[lang] && DEC_DICT[lang][k]) || DEC_DICT.zh[k] || k;
    a.forEach((v, i) => { s = s.split('{' + i + '}').join(String(v)); });
    return s;
  };

  /* ------------------------------------------------ 模块状态（闭包隔离） */
  let seq = 0;                       // 竞态防护序号
  const schemaCache = new Map();     // 合约地址 -> schema
  const tokenCache = new Map();      // 合约地址 -> {symbol, decimals, name}

  /* 本机地址簿 */
  const BOOK_KEY = 'paxi_book';
  function loadBook() {
    try { return JSON.parse(localStorage.getItem(BOOK_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveBook(b) {
    try { localStorage.setItem(BOOK_KEY, JSON.stringify(b)); } catch (_) {}
    if (D) D.setAddressBook(b);
  }

  const esc = (s) => D ? D.esc(s) : String(s == null ? '' : s);
  const clip = (s, n = 20000) => {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + dcPt('truncated', s.length) : s;
  };

  async function copyText(s) {
    try { await navigator.clipboard.writeText(s); return true; }
    catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = s; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        return true;
      } catch (__) { return false; }
    }
  }

  /* ------------------------------------------------ 页面样式（作用域限定） */
  const STYLE = `
  #pg-decoder .d-sbar{display:flex;gap:8px;margin-bottom:10px}
  #pg-decoder .d-sbar input{flex:1;min-width:0;padding:13px 14px;border-radius:10px;
    border:1px solid var(--border);background:rgba(255,255,255,0.04);color:#fff;font-size:16px;
    font-family:ui-monospace,Menlo,Consolas,monospace}
  #pg-decoder .d-sbar input:focus{outline:none;border-color:var(--primary)}
  #pg-decoder .d-sbar button{background:var(--primary);border:none;color:#fff;font-weight:600;
    white-space:nowrap;padding:13px 20px;border-radius:10px;cursor:pointer}
  #pg-decoder .d-xbtn{width:42px;flex:none;border-radius:10px;border:1px solid var(--border);
    background:rgba(255,255,255,0.04);color:var(--text-muted);cursor:pointer;font-size:1rem}
  #pg-decoder .d-pills{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;scrollbar-width:none}
  #pg-decoder .d-pills::-webkit-scrollbar{display:none}
  #pg-decoder .d-pill{white-space:nowrap;padding:7px 14px;border-radius:18px;font-size:.82rem;
    background:rgba(255,255,255,0.03);border:1px solid var(--border);color:var(--text-muted);cursor:pointer}
  #pg-decoder .d-pill.on{background:rgba(99,102,241,0.15);color:var(--primary);border-color:var(--primary)}
  #pg-decoder .d-panel{display:none}
  #pg-decoder .d-panel.on{display:block}
  #pg-decoder .d-card{background:rgba(255,255,255,0.03);border:1px solid var(--border);
    border-radius:12px;padding:14px;margin-bottom:12px}
  #pg-decoder .d-ct{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);
    margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}
  #pg-decoder .d-ct .src{font-size:.66rem;color:var(--primary);background:rgba(99,102,241,0.12);
    padding:2px 7px;border-radius:10px;text-transform:none;letter-spacing:0}
  #pg-decoder .d-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.89rem;align-items:flex-start}
  #pg-decoder .d-row>span:first-child{color:var(--text-muted);flex:none}
  #pg-decoder .d-row>b{text-align:right;word-break:break-all;font-weight:600}
  #pg-decoder .d-hint{font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:12px}
  #pg-decoder .d-lnk{color:#93c5fd;cursor:pointer;border-bottom:1px dashed var(--primary)}
  #pg-decoder .d-story{background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(255,255,255,0.02));
    border:1px solid var(--primary);border-radius:12px;padding:15px;margin-bottom:14px}
  #pg-decoder .d-story-h{font-size:.76rem;color:var(--primary);font-weight:700;margin-bottom:10px;letter-spacing:.04em}
  #pg-decoder .d-story-b{font-size:.95rem;line-height:1.85;white-space:pre-wrap;word-break:break-word}
  #pg-decoder .d-story-b b{color:var(--primary);font-weight:700}
  #pg-decoder .d-delta{display:flex;justify-content:space-between;align-items:center;gap:10px;
    padding:10px;border-radius:8px;margin-bottom:7px;background:rgba(255,255,255,0.03);
    border-left:3px solid var(--border);font-size:.88rem}
  #pg-decoder .d-delta.pos{border-left-color:var(--success);background:rgba(74,222,128,.05)}
  #pg-decoder .d-delta.neg{border-left-color:var(--danger);background:rgba(248,113,113,.05)}
  #pg-decoder .d-delta .amt{font-weight:700;white-space:nowrap}
  #pg-decoder .d-delta.pos .amt{color:var(--success)}
  #pg-decoder .d-delta.neg .amt{color:var(--danger)}
  #pg-decoder .d-cflow{background:rgba(255,255,255,0.03);border-radius:8px;padding:11px;margin-bottom:8px;
    border-left:3px solid var(--primary);font-size:.86rem}
  #pg-decoder .d-cf-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
  #pg-decoder .d-cf-a{margin-top:5px;color:var(--text-muted)}
  #pg-decoder .d-cf-a b{color:var(--text)}
  #pg-decoder .d-tag{font-size:.68rem;background:rgba(99,102,241,0.12);color:var(--primary);
    padding:2px 8px;border-radius:10px;font-weight:600}
  #pg-decoder .d-msg{background:rgba(255,255,255,0.03);border-radius:8px;padding:11px;margin-bottom:9px;
    border-left:3px solid var(--primary)}
  #pg-decoder .d-msg-t{color:#93c5fd;font-weight:600;font-size:.84rem;margin-bottom:5px}
  #pg-decoder .d-msg-f{font-size:.83rem;color:var(--text-muted);margin-bottom:3px}
  #pg-decoder .d-msg-f b{color:var(--text)}
  #pg-decoder .d-fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
  #pg-decoder .d-fbtn{background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;
    padding:9px 6px;font-size:.78rem;text-align:center;cursor:pointer;color:var(--primary);font-weight:600;
    font-family:ui-monospace,Menlo,monospace;word-break:break-all}
  #pg-decoder .d-fbtn:active{background:rgba(99,102,241,0.15)}
  #pg-decoder .d-sbtn{width:100%;margin-top:12px;padding:11px;border-radius:9px;border:1px solid var(--primary);
    background:rgba(99,102,241,0.12);color:var(--primary);font-size:.87rem;font-weight:600;cursor:pointer}
  #pg-decoder textarea{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);
    background:rgba(255,255,255,0.04);color:#fff;font-size:14px;margin-bottom:12px;min-height:110px;
    font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.55;resize:vertical}
  #pg-decoder textarea:focus{outline:none;border-color:var(--primary)}
  #pg-decoder .d-run{width:100%;padding:13px;border-radius:10px;border:none;background:var(--primary);
    color:#fff;font-size:.95rem;font-weight:600;cursor:pointer}
  #pg-decoder .banner{padding:12px 14px;border-radius:10px;margin-bottom:14px;font-size:.87rem;
    display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  #pg-decoder .banner.ok{background:rgba(74,222,128,.1);border:1px solid #166534;color:var(--success)}
  #pg-decoder .banner.err{background:rgba(248,113,113,.1);border:1px solid #7f1d1d;color:var(--danger)}
  #pg-decoder .banner.info{background:rgba(99,102,241,0.1);border:1px solid #1e40af;color:#93c5fd}
  #pg-decoder .banner.warn{background:rgba(251,191,36,.08);border:1px solid #854d0e;color:#fbbf24}
  #pg-decoder .banner .mono{color:var(--text-muted)}
  #pg-decoder .banner details{width:100%;margin-top:6px}
  #pg-decoder .cp{padding:3px 10px;font-size:.72rem;border-radius:8px;border:1px solid var(--border);
    background:rgba(255,255,255,0.04);color:var(--text);cursor:pointer;font-weight:400}
  #pg-decoder details{margin-top:9px;background:rgba(0,0,0,0.35);border-radius:8px;padding:7px 11px}
  #pg-decoder summary{color:var(--text-muted);font-size:.82rem;cursor:pointer;outline:none;list-style:none}
  #pg-decoder summary::-webkit-details-marker{display:none}
  #pg-decoder summary::before{content:'▸ ';}
  #pg-decoder pre{margin-top:7px;font-size:.74rem;color:#9ca3af;white-space:pre-wrap;word-break:break-all;
    font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.5}
  #pg-decoder .spin{display:inline-block;width:13px;height:13px;border:2px solid var(--primary);
    border-top-color:transparent;border-radius:50%;animation:dsp .8s linear infinite;
    vertical-align:-2px;margin-right:6px}
  @keyframes dsp{to{transform:rotate(360deg)}}
  #pg-decoder .d-bcard{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;
    padding:11px;margin-bottom:8px}
  #pg-decoder .d-bh{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:5px}
  #pg-decoder .d-bs{font-size:.79rem;color:var(--text-muted);word-break:break-all}
  #pg-decoder .d-s{font-size:.7rem;padding:2px 8px;border-radius:10px;font-weight:700;flex:none}
  #pg-decoder .d-s.ok{background:rgba(74,222,128,.15);color:var(--success)}
  #pg-decoder .d-s.bad{background:rgba(248,113,113,.15);color:var(--danger)}
  #pg-decoder .d-s.err{background:rgba(251,191,36,.15);color:#fbbf24}
  #pg-decoder .d-welcome{text-align:center;padding:44px 16px;color:var(--text-muted)}
  #pg-decoder .d-wico{font-size:3rem;opacity:.18;margin-bottom:14px}
  #pg-decoder .d-welcome p{font-size:.92rem;line-height:2}
  #pg-decoder .d-welcome b{color:var(--primary)}
  `;

  /* ------------------------------------------------ 渲染 */
  function render() {
    return `
    <style>${STYLE}</style>
    <div id="pg-decoder">
      <div class="d-card">
        <div class="d-ct">${esc(dcPt('title'))}</div>
        <div class="d-sbar">
          <input type="text" id="dq" placeholder="${esc(dcPt('searchPh'))}" autocomplete="off" spellcheck="false">
          <button id="dSearchBtn">${esc(dcPt('decodeBtn'))}</button>
          <button class="d-xbtn" id="dClearBtn" title="${esc(dcPt('clearTitle'))}">✕</button>
        </div>
        <div class="d-pills" id="dDemoPills"></div>
      </div>

        <div class="d-pills">
          <div class="d-pill on" data-dtool="decode">${esc(dcPt('tabDecode'))}</div>
          <div class="d-pill" data-dtool="sandbox">${esc(dcPt('tabSandbox'))}</div>
          <div class="d-pill" data-dtool="batch">${esc(dcPt('tabBatch'))}</div>
          <div class="d-pill" data-dtool="diagnose">${esc(dcPt('tabDiagnose'))}</div>
        </div>
        <div class="d-pills" style="margin-top:10px">
          <div class="d-pill" id="dJumpBalance">${esc(dcPt('jumpBalance'))}</div>
          <div class="d-pill" id="dJumpRedelegate">${esc(dcPt('jumpRedelegate'))}</div>
          <div class="d-pill" id="dJumpValidator">${esc(dcPt('jumpValidator'))}</div>
          <div class="d-pill" id="dJumpProposal">${esc(dcPt('jumpProposal'))}</div>
        </div>

      <div class="d-panel on" id="dpanel-decode"><div id="dOut"></div></div>

      <div class="d-panel" id="dpanel-sandbox">
        <div class="d-card">
          <div class="d-hint">${esc(dcPt('sandboxHint'))}</div>
          <div class="d-row"><span>${esc(dcPt('contractAddr'))}</span></div>
          <input type="text" id="dSbAddr" placeholder="paxi1..." style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:#fff;font-size:14px;font-family:ui-monospace,Menlo,monospace">
          <div class="d-row"><span>${esc(dcPt('queryJson'))}</span></div>
          <textarea id="dSbMsg" placeholder='{"token_info":{}}'></textarea>
          <button class="d-run" id="dSbRun">${esc(dcPt('runQuery'))}</button>
          <button class="cp" id="dSbClear" style="width:100%;margin-top:8px;padding:9px">${esc(dcPt('clear'))}</button>
          <div id="dSbOut" style="margin-top:14px"></div>
        </div>
      </div>

      <div class="d-panel" id="dpanel-batch">
        <div class="d-card">
          <div class="d-hint">${esc(dcPt('batchHint'))}</div>
          <textarea id="dBtIn" placeholder="A1B2...&#10;C3D4..."></textarea>
          <button class="d-run" id="dBtRun">${esc(dcPt('runBatchBtn'))}</button>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
            <span class="d-hint" style="margin:0" id="dBtProg"></span>
            <button class="cp" id="dBtCsv" style="display:none">${esc(dcPt('exportCsvBtn'))}</button>
          </div>
          <div id="dBtOut" style="margin-top:12px"></div>
        </div>
      </div>

      <div class="d-panel" id="dpanel-diagnose">
        <div class="d-card">
          <div class="d-hint">${esc(dcPt('diagHint'))}</div>
          <input type="text" id="dDgIn" placeholder="${esc(dcPt('failHashPh'))}" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:#fff;font-size:14px;font-family:ui-monospace,Menlo,monospace;margin-bottom:12px">
          <button class="d-run" id="dDgRun">${esc(dcPt('diagBtn'))}</button>
          <div id="dDgOut" style="margin-top:14px"></div>
        </div>
      </div>

      <div class="d-card" style="margin-top:4px">
        <div class="d-hint" style="margin:0">${esc(dcPt('footer'))}</div>
      </div>
    </div>`;
  }

  /* ------------------------------------------------ 渲染：交易 */
  function renderTx(data, tokens) {
    const out = document.getElementById('dOut');
    const txr = data.tx_response || data;
    const tx = data.tx || txr.tx || {};
    const msgs = (tx.body && tx.body.messages) || [];
    const ok = txr.code === 0 || txr.code === '0';
    const flows = D.extractFlows(txr);

    let feeStr = '', feePayer = flows.feePayer || '';
    if (tx.auth_info && tx.auth_info.fee && tx.auth_info.fee.amount) {
      feeStr = tx.auth_info.fee.amount.map(a => D.fmtCoin(a.amount, a.denom)).join(' + ');
      if (tx.auth_info.fee.payer) feePayer = tx.auth_info.fee.payer;
    } else if (flows.fee) {
      feeStr = flows.fee;
    }

    let html = '';

    let rootCause = '';
    if (!ok && txr.raw_log) {
      for (const [re, txt] of DIAG) if (re.test(txr.raw_log)) { rootCause = txt; break; }
    }
    const relTime = D.timeAgo(txr.timestamp);
    html += `<div class="banner ${ok ? 'ok' : 'err'}">
      ${ok ? dcPt('txOk') : dcPt('txFail') + (rootCause ? dcPt('txFailCause', esc(rootCause)) : ' · code ' + esc(txr.code))}
      <span class="mono">${esc(dcPt('height', txr.height))}</span>
      <span class="mono">${esc(txr.timestamp || '')}</span>
      ${relTime ? `<span class="mono">${esc(dcPt('paren', relTime))}</span>` : ''}
    </div>`;

    const memo = (tx.body && tx.body.memo) || '';
    html += `<div class="d-story">
      <div class="d-story-h">${esc(dcPt('storyTitle'))}</div>
      <div class="d-story-b">${D.buildStory(txr, msgs, flows, tokens)}${memo ? '\n' + dcPt('memo', esc(memo)) : ''}</div>
    </div>`;

    html += `<div class="d-card">
      <div class="d-ct">${esc(dcPt('feeTitle'))}</div>
      <div class="d-row"><span>${esc(dcPt('amount'))}</span><b>${esc(feeStr || '—')}</b></div>
      <div class="d-row"><span>${esc(dcPt('feePayer'))}</span>${
        feePayer ? `<span class="d-lnk mono" data-addr="${esc(feePayer)}">${esc(D.shortAddr(feePayer))}</span>` : '—'}</div>
      <div class="d-row"><span>Gas</span><b>${esc(txr.gas_used || '?')} / ${esc(txr.gas_wanted || '?')}</b></div>
      <div class="d-row"><span>${esc(dcPt('txHash'))}</span><span class="mono" style="font-size:.72rem;word-break:break-all">${esc(txr.txhash || '')}</span>
        <button class="cp" data-copy="${esc(txr.txhash || '')}">${esc(dcPt('copy'))}</button></div>
      <div class="d-row"><span>${esc(dcPt('sharePage'))}</span><button class="cp" data-copy="${
        esc(location.href.split('?')[0] + '?tool=decoder&hash=' + (txr.txhash || ''))}">${esc(dcPt('copyLink'))}</button></div>
    </div>`;

    if (flows.native.length) {
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('nativeDelta'))}</div>`;
      for (const d of flows.native) {
        const pos = d.delta > 0n;
        html += `<div class="d-delta ${pos ? 'pos' : 'neg'}">
          <div>${pos ? esc(dcPt('received')) : esc(dcPt('sent'))} <span class="d-lnk mono" data-addr="${esc(d.address)}">${esc(D.shortAddr(d.address))}</span></div>
          <div class="amt">${pos ? '+' : '-'}${esc(D.fmtCoin(d.delta < 0n ? -d.delta : d.delta, d.denom))}</div>
        </div>`;
      }
      html += `</div>`;
    }

    if (flows.contract.length) {
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('contractFlows'))}</div>`;
      for (const c of flows.contract) {
        const info = tokens && tokens[c.contract];
        const amtStr = info
          ? `${esc(D.formatToken(c.amount, info))}（${esc(c.amount)}）`
          : esc(c.amount || '');
        html += `<div class="d-cflow">
          <div class="d-cf-h"><span class="d-tag">${esc(c.kind)}</span>
            ${c.contract ? `<span class="d-lnk mono" style="font-size:.72rem" data-addr="${esc(c.contract)}">${esc(D.shortAddr(c.contract))}</span>` : ''}</div>
          ${c.from ? `<div>${esc(dcPt('from'))}<span class="d-lnk mono" data-addr="${esc(c.from)}">${esc(D.shortAddr(c.from))}</span></div>` : ''}
          ${c.to ? `<div>${esc(dcPt('to'))}<span class="d-lnk mono" data-addr="${esc(c.to)}">${esc(D.shortAddr(c.to))}</span></div>` : ''}
          <div class="d-cf-a">${esc(dcPt('qty'))}<b>${amtStr || (c.tokenId ? '#' + esc(c.tokenId) : '—')}</b></div>
        </div>`;
      }
      html += `</div>`;
    }

    if (msgs.length) {
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('msgsTitle', msgs.length))}</div>`;
      msgs.forEach((m, i) => {
        const info = D.readMsg(m);
        html += `<div class="d-msg">
          <div class="d-msg-t">${i + 1}. ${esc(D.labelOf(info.type))}
            <span class="mono" style="font-size:.7rem">${esc(info.type)}</span></div>
          <div class="d-msg-f">${esc(dcPt('sender'))}<span class="d-lnk mono" data-addr="${esc(info.from)}">${esc(D.shortAddr(info.from))}</span></div>`;
        if (info.type === '/cosmwasm.wasm.v1.MsgExecuteContract') {
          const c = D.decodeContractMsg(m);
          if (c.action) {
            html += `<div class="d-msg-f">${esc(dcPt('execMethod'))}<b>${esc(c.action)}</b>
              ${c.contract ? ` · ${esc(dcPt('contractOf'))}<span class="d-lnk mono" data-addr="${esc(c.contract)}">${esc(D.shortAddr(c.contract))}</span>` : ''}</div>`;
            html += `<details><summary>${esc(dcPt('viewArgs'))}</summary><pre>${esc(clip(JSON.stringify(c.args, null, 2)))}</pre></details>`;
          }
        }
        html += `<details><summary>${esc(dcPt('rawMsg'))}</summary><pre>${esc(clip(JSON.stringify(m, null, 2)))}</pre></details>
        </div>`;
      });
      html += `</div>`;
    }

    if (!ok && txr.raw_log) {
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('failLog'))}</div>
        <details open><summary>raw_log</summary><pre>${esc(clip(txr.raw_log))}</pre></details></div>`;
    }

    out.innerHTML = html;
  }

  /* ------------------------------------------------ 代币精度补齐 */
  async function enrichTokens(contracts) {
    const tokens = {};
    for (const c of [...new Set(contracts)]) {
      if (!c) continue;
      if (tokenCache.has(c)) { tokens[c] = tokenCache.get(c); continue; }
      try {
        const r = await D.getJSON(
          `${D.LCD}/cosmwasm/wasm/v1/contract/${c}/smart/${D.getB64('{"token_info":{}}')}`, 8000);
        const ti = r.data;
        if (ti && ti.symbol !== undefined) {
          tokens[c] = { symbol: ti.symbol || '', decimals: Number(ti.decimals) || 0, name: ti.name || '' };
          tokenCache.set(c, tokens[c]);
        }
      } catch (_) { /* 非代币合约（如 NFT）查 token_info 会失败，跳过 */ }
    }
    return tokens;
  }

  /* ------------------------------------------------ 渲染：地址/合约 */
  async function renderAddress(addr) {
    const my = ++seq;
    const out = document.getElementById('dOut');
    out.innerHTML = `<div class="banner info"><span class="spin"></span>${esc(dcPt('queryingChain'))}</div>`;

    let info = null, codeInfo = null;
    try {
      const r = await D.getJSON(`${D.LCD}/cosmwasm/wasm/v1/contract/${addr}`, 12000);
      info = r.contract_info;
    } catch (_) {}
    if (my !== seq) return;

    let html = '';

    if (info) {
      try {
        const cr = await D.getJSON(`${D.LCD}/cosmwasm/wasm/v1/code/${info.code_id}`, 12000);
        codeInfo = cr.code_info;
      } catch (_) {}
      if (my !== seq) return;

      let schema = schemaCache.get(addr);
      if (!schema) {
        schema = await D.probeSchema(addr);
        schemaCache.set(addr, schema);
      }
      if (my !== seq) return;
      const kind = D.classify(info, schema);

      html += `<div class="banner ok">${esc(dcPt('isContract'))}</div>`;
      html += `<div class="d-card">
        <div class="d-ct">${esc(dcPt('profile'))}</div>
        <div class="d-row"><span>${esc(dcPt('label'))}</span><b>${esc(info.label || '—')}</b></div>
        <div class="d-row"><span>${esc(dcPt('kind'))}</span><b>${esc(kind)}</b></div>
        <div class="d-row"><span>Code ID</span><b class="mono">${esc(info.code_id)}</b></div>
        <div class="d-row"><span>${esc(dcPt('creator'))}</span>${
          codeInfo && codeInfo.creator
            ? `<span class="d-lnk mono" data-addr="${esc(codeInfo.creator)}">${esc(D.shortAddr(codeInfo.creator))}</span>`
            : '—'}</div>
        <div class="d-row"><span>${esc(dcPt('admin'))}</span>${
          info.admin
            ? `<span class="d-lnk mono" data-addr="${esc(info.admin)}">${esc(D.shortAddr(info.admin))}</span>${esc(dcPt('upgradable'))}`
            : esc(dcPt('noAdmin'))}</div>
        <div class="d-row"><span>${esc(dcPt('createdHeight'))}</span><b>${esc(info.created ? info.created.block_height : '—')}</b></div>
        <div class="d-row"><span>${esc(dcPt('contractAddr'))}</span><span class="mono" style="font-size:.72rem;word-break:break-all">${esc(addr)}</span>
          <button class="cp" data-copy="${esc(addr)}">${esc(dcPt('copy'))}</button></div>
      </div>`;

      if (kind.startsWith('PRC-20')) {
        try {
          const r = await D.getJSON(
            `${D.LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${D.getB64('{"token_info":{}}')}`, 8000);
          const ti = r.data;
          if (ti && ti.symbol !== undefined) {
            if (my !== seq) return;
            let supply = '';
            if (ti.total_supply !== undefined) {
              try {
                supply = `<div class="d-row"><span>${esc(dcPt('totalSupply'))}</span><b>${esc(D.formatToken(ti.total_supply, ti))}</b></div>`;
              } catch (_) { supply = `<div class="d-row"><span>${esc(dcPt('totalSupply'))}</span><b>${esc(ti.total_supply)}</b></div>`; }
            }
            html += `<div class="d-card">
              <div class="d-ct">${esc(dcPt('tokenInfo'))}</div>
              <div class="d-row"><span>${esc(dcPt('name'))}</span><b>${esc(ti.name || '—')}</b></div>
              <div class="d-row"><span>${esc(dcPt('symbol'))}</span><b>${esc(ti.symbol || '—')}</b></div>
              <div class="d-row"><span>${esc(dcPt('decimals'))}</span><b>${esc(ti.decimals ?? '—')}</b></div>
              ${supply}
            </div>`;
            tokenCache.set(addr, { symbol: ti.symbol, decimals: Number(ti.decimals) || 0, name: ti.name || '' });
          }
        } catch (_) {}
      }

      const srcText = schema.source === 'schema-echo' ? dcPt('srcEcho')
        : schema.source === 'known-probe' ? dcPt('srcProbe')
        : schema.source === 'no-echo' ? dcPt('srcNoEcho') : dcPt('srcErr');
      html += `<div class="d-card">
        <div class="d-ct">${esc(dcPt('queryFeatures'))}<span class="src">${esc(srcText)}</span></div>`;

      if (schema.methods && schema.methods.length) {
        html += `<div class="d-hint">${esc(dcPt('methodsFound', schema.methods.length))}
        <div class="d-fgrid">`;
        for (const m of schema.methods) {
          html += `<div class="d-fbtn" data-cmd='${esc(JSON.stringify(D.templateFor(m)))}'>${esc(m)}</div>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="d-hint">${esc(dcPt('noMethods'))}</div>`;
      }
      html += `<button class="d-sbtn" id="dGoSandbox">${esc(dcPt('openSandbox'))}</button>
      </div>`;
    }

    try {
      const bank = await D.getJSON(`${D.LCD}/cosmos/bank/v1beta1/balances/${addr}`, 12000);
      if (my !== seq) return;
      const bals = bank.balances || [];
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('nativeBalance'))}</div>`;
      if (!bals.length) html += `<div class="d-hint">${esc(dcPt('noBalance'))}</div>`;
      else for (const b of bals) {
        html += `<div class="d-row"><span>${esc(b.denom.toUpperCase())}</span><b>${esc(D.fmtCoin(b.amount, b.denom))}</b></div>`;
      }
      html += `</div>`;
    } catch (_) {}

    if (!info) {
      const book = loadBook();
      const cur = book[addr] || '';
      html += `<div class="d-card"><div class="d-ct">${esc(dcPt('localNote'))}</div>
        <div class="d-row"><span>${esc(dcPt('noteName'))}</span><b>${cur ? esc(cur) : esc(dcPt('notSet'))}</b></div>
        <div class="d-row"><span>${esc(dcPt('address'))}</span><span class="mono" style="font-size:.72rem;word-break:break-all">${esc(addr)}</span>
          <button class="cp" data-copy="${esc(addr)}">${esc(dcPt('copy'))}</button></div>
        <button class="d-sbtn" id="dNoteBtn">🏷️ ${cur ? esc(dcPt('editNote')) : esc(dcPt('addNote'))}${esc(dcPt('noteName'))}</button></div>`;
    }

    out.innerHTML = html;

    out.querySelectorAll('.d-fbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        let cmd = btn.getAttribute('data-cmd');
        try { cmd = JSON.stringify(JSON.parse(cmd), null, 2); } catch (_) {}
        gotoSandbox(addr, cmd);
      });
    });
    const goSb = document.getElementById('dGoSandbox');
    if (goSb) goSb.addEventListener('click', () => gotoSandbox(addr, '{\n  \n}'));
    const noteBtn = document.getElementById('dNoteBtn');
    if (noteBtn) {
      noteBtn.addEventListener('click', () => {
        const book = loadBook();
        const cur = book[addr] || '';
        const name = prompt(dcPt('notePrompt'), cur);
        if (name === null) return;
        const trimmed = name.trim().slice(0, 24);
        if (trimmed) book[addr] = trimmed; else delete book[addr];
        saveBook(book);
        renderAddress(addr);
      });
    }
  }

  /* ------------------------------------------------ 搜索路由 */
  async function doSearch() {
    const val = document.getElementById('dq').value.trim();
    if (!val) return;
    if (/^(paxi1)[0-9a-z]{20,}$/i.test(val)) return renderAddress(val);
    if (/^[0-9A-Fa-f]{64}$/.test(val)) return renderTxByHash(val);

    document.getElementById('dOut').innerHTML =
      `<div class="banner err">${esc(dcPt('unknownInput'))}
        <div class="d-hint">${dcPt('inputHint')}</div></div>`;
  }

  async function renderTxByHash(hash) {
    const my = ++seq;
    const out = document.getElementById('dOut');
    out.innerHTML = `<div class="banner info"><span class="spin"></span>${esc(dcPt('parsingTx', D.shortAddr(hash)))}</div>`;
    let data;
    try {
      data = await D.getJSON(`${D.LCD}/cosmos/tx/v1beta1/txs/${hash}`);
    } catch (e) {
      if (my !== seq) return;
      out.innerHTML = `<div class="banner warn">${esc(dcPt('netErr', e.message))}
        ${e.body ? `<details><summary>${esc(dcPt('nodeReturn'))}</summary><pre>${esc(clip(e.body))}</pre></details>` : ''}
        <div class="d-hint">${esc(dcPt('netErrHint'))}</div></div>`;
      return;
    }
    if (my !== seq) return;

    const flows = D.extractFlows(data.tx_response || data);
    const contracts = flows.contract.map(c => c.contract);
    for (const m of (data.tx && data.tx.body && data.tx.body.messages) || []) {
      if ((m['@type'] || '').endsWith('.MsgExecuteContract')) {
        const c = D.decodeContractMsg(m);
        if (c.contract) contracts.push(c.contract);
      }
    }
    const tokens = await enrichTokens(contracts);
    if (my !== seq) return;

    renderTx(data, tokens);
  }

  /* ------------------------------------------------ 沙盒 */
  function gotoSandbox(addr, cmd) {
    switchDPanel('sandbox');
    document.getElementById('dSbAddr').value = addr || '';
    document.getElementById('dSbMsg').value = cmd || '{\n  \n}';
    window.scrollTo(0, 0);
  }

  async function runSandbox() {
    const addr = document.getElementById('dSbAddr').value.trim();
    const raw = document.getElementById('dSbMsg').value.trim();
    const out = document.getElementById('dSbOut');
    if (!/^paxi1[0-9a-z]{20,}$/i.test(addr)) {
      out.innerHTML = `<div class="banner err">${esc(dcPt('badAddr'))}</div>`;
      return;
    }
    if (!raw) { out.innerHTML = `<div class="banner err">${esc(dcPt('noJson'))}</div>`; return; }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      out.innerHTML = `<div class="banner err">${esc(dcPt('jsonErr', e.message))}</div>`;
      return;
    }
    out.innerHTML = `<div class="banner info"><span class="spin"></span>${esc(dcPt('queryingNode'))}</div>`;
    try {
      const url = `${D.LCD}/cosmwasm/wasm/v1/contract/${addr}/smart/${D.getB64(JSON.stringify(parsed))}`;
      const res = await D.getJSON(url);
      out.innerHTML = `<div class="banner ok">${esc(dcPt('queryOk'))}</div>
        <div class="d-card"><pre style="color:#e2e8f0;margin:0">${esc(clip(JSON.stringify(res.data !== undefined ? res.data : res, null, 2)))}</pre></div>`;
    } catch (e) {
      let tip = '';
      const body = e.body || '';
      const m = body.match(/unknown variant\s+\S+,\s*expected one of\s*:?\s*(.+)$/s);
      if (m) {
        const list = [...m[1].matchAll(/`([^`]+)`/g)].map(x => x[1]);
        tip = `<div class="d-hint">${esc(dcPt('realMethods'))}
          <span class="d-lnk" data-cmd='${esc(JSON.stringify(list))}'>${esc(dcPt('expandAll', list.length))}</span></div>`;
      } else if (/no such contract/i.test(body)) {
        tip = `<div class="d-hint">${esc(dcPt('notContract'))}</div>`;
      }
      out.innerHTML = `<div class="banner err">${esc(dcPt('queryFail', e.message))}</div>${tip}
        ${body ? `<details><summary>${esc(dcPt('nodeRaw'))}</summary><pre>${esc(clip(body))}</pre></details>` : ''}`;
      const l = out.querySelector('.d-lnk[data-cmd]');
      if (l) l.addEventListener('click', () => {
        const list = JSON.parse(l.getAttribute('data-cmd'));
        out.insertAdjacentHTML('beforeend',
          `<div class="d-card"><div class="d-ct">${esc(dcPt('realMethodsTitle'))}</div><div class="d-fgrid">${
            list.map(x => `<div class="d-fbtn" data-cmd='${esc(JSON.stringify(D.templateFor(x)))}'>${esc(x)}</div>`).join('')
          }</div></div>`);
        out.querySelectorAll('.d-fbtn').forEach(b2 => b2.addEventListener('click', () => {
          let c = b2.getAttribute('data-cmd');
          try { c = JSON.stringify(JSON.parse(c), null, 2); } catch (_) {}
          document.getElementById('dSbMsg').value = c;
          window.scrollTo(0, 0);
        }));
      });
    }
  }

  /* ------------------------------------------------ 批量解码 */
  const BATCH_MAX = 200;
  async function runBatch() {
    const raw = document.getElementById('dBtIn').value.trim();
    if (!raw) return;
    let hashes = raw.split(/[\s,;]+/).filter(s => /^[0-9A-Fa-f]{64}$/.test(s));
    if (!hashes.length) {
      document.getElementById('dBtOut').innerHTML =
        `<div class="banner err">${esc(dcPt('noValidHash'))}</div>`;
      return;
    }
    if (hashes.length > BATCH_MAX) {
      hashes = hashes.slice(0, BATCH_MAX);
      document.getElementById('dBtOut').innerHTML =
        `<div class="banner info">${esc(dcPt('overLimit', BATCH_MAX))}</div>`;
    }
    const rows = [];
    for (let i = 0; i < hashes.length; i++) {
      const h = hashes[i];
      document.getElementById('dBtProg').textContent = dcPt('parsing', i + 1, hashes.length);
      let status = dcPt('stOk'), stCls = 'ok', detail = '', kind = '', send = '', recv = '';
      try {
        const data = await D.getJSON(`${D.LCD}/cosmos/tx/v1beta1/txs/${h}`, 20000);
        const txr = data.tx_response;
        const tx = data.tx || txr.tx || {};
        const msgs = (tx.body && tx.body.messages) || [];
        const flows = D.extractFlows(txr);
        if (!(txr.code === 0 || txr.code === '0')) { status = dcPt('stFail'); stCls = 'bad'; }
        kind = msgs.length ? D.labelOf(msgs[0]['@type']) : '—';
        const f = flows.native.filter(d => d.delta !== 0n);
        if (f.length >= 2) {
          const s = f.find(x => x.delta < 0n), r = f.find(x => x.delta > 0n);
          send = D.shortAddr(s.address); recv = D.shortAddr(r.address);
          detail = D.fmtCoin(s.delta < 0n ? -s.delta : s.delta, s.denom);
        } else if (flows.contract.length) {
          send = D.shortAddr(flows.contract[0].from); recv = D.shortAddr(flows.contract[0].to);
          detail = flows.contract[0].amount || ('#' + flows.contract[0].tokenId);
        }
        rows.push({ h, status, kind, send, recv, detail });
      } catch (e) {
        status = dcPt('stQueryFail'); stCls = 'err';
        rows.push({ h, status, kind: '—', send: '', recv: '', detail: e.message });
      }
      document.getElementById('dBtOut').insertAdjacentHTML('beforeend',
        `<div class="d-bcard"><div class="d-bh"><span class="d-s ${stCls}">${esc(status)}</span>
          <span class="d-lnk mono" data-h="${esc(h)}" style="font-size:.75rem">${esc(D.shortAddr(h))}</span></div>
          <div class="d-bs">${esc(kind)}${detail ? ` · ${esc(send)} → ${esc(recv)} · ${esc(detail)}` : ''}</div></div>`);
    }
    document.getElementById('dBtProg').textContent = dcPt('done', hashes.length);
    const csvBtn = document.getElementById('dBtCsv');
    csvBtn.dataset.rows = JSON.stringify(rows);
    csvBtn.style.display = 'inline-block';
    document.getElementById('dBtOut').querySelectorAll('.d-lnk[data-h]').forEach(el => {
      el.addEventListener('click', () => {
        document.getElementById('dq').value = el.dataset.h;
        switchDPanel('decode');
        doSearch();
      });
    });
  }

  function exportCsv() {
    const rows = JSON.parse(document.getElementById('dBtCsv').dataset.rows || '[]');
    const head = ['txhash', 'status', 'action', 'from', 'to', 'amount'];
    /* 公式注入防护：Excel 中 =+-@ 开头的值会被当公式执行，前置单引号 neutralize */
    const safe = (v) => /^[=+\-@]/.test(String(v || '')) ? "'" + v : (v || '');
    const csv = [head.join(',')].concat(
      rows.map(r => [r.h, r.status, r.kind, r.send, r.recv, r.detail].map(x => `"${safe(String(x || '').replace(/"/g, '""'))}"`).join(','))
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'paxi_batch_decode.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ------------------------------------------------ 失败诊断 */
  const DIAG = [
    [/insufficient funds/i, 'd1'],
    [/out of gas/i, 'd2'],
    [/wasm contract failed/i, 'd3'],
    [/Unauthorized|unauthorized/i, 'd4'],
    [/already exists/i, 'd5'],
    [/not found|not exist/i, 'd6'],
    [/invalid|parse error|unknown variant/i, 'd7'],
    [/duplicate|sequence mismatch/i, 'd8'],
    [/timed out waiting|tx already in cache/i, 'd9'],
    [/denom|decimals/i, 'd10'],
  ];

  async function runDiagnose() {
    const h = document.getElementById('dDgIn').value.trim();
    const out = document.getElementById('dDgOut');
    if (!/^[0-9A-Fa-f]{64}$/.test(h)) { out.innerHTML = `<div class="banner err">${esc(dcPt('needHash'))}</div>`; return; }
    out.innerHTML = `<div class="banner info"><span class="spin"></span>${esc(dcPt('diagnosing'))}</div>`;
    let data;
    try {
      data = await D.getJSON(`${D.LCD}/cosmos/tx/v1beta1/txs/${h}`);
    } catch (e) {
      out.innerHTML = `<div class="banner warn">${esc(dcPt('netErr2', e.message))}</div>`;
      return;
    }
    const txr = data.tx_response;
    const tx = data.tx || txr.tx || {};
    if (txr.code === 0 || txr.code === '0') {
      out.innerHTML = `<div class="banner ok">${esc(dcPt('txOkNoDiag'))}</div>`;
      return;
    }
    const log = txr.raw_log || '';
    const tips = [];
    for (const [re, key] of DIAG) if (re.test(log)) tips.push(dcPt(key));
    const fee = (tx.auth_info && tx.auth_info.fee) || {};
    const diag = tips.length
      ? tips.map(t => `<div class="d-hint">• ${esc(t)}</div>`).join('')
      : `<div class="d-hint">${esc(dcPt('noClassify'))}</div>`;

    out.innerHTML = `
      <div class="banner err">${esc(dcPt('txFailCode', txr.code))}</div>
      <div class="d-card">
        <div class="d-ct">${esc(dcPt('diagTitle'))}</div>
        ${diag}
        <div class="d-row" style="margin-top:12px"><span>${esc(dcPt('gasSet'))}</span><b>${esc(fee.gas_limit || '—')}</b></div>
        <div class="d-row"><span>${esc(dcPt('gasUsed'))}</span><b>${esc(txr.gas_used || '0')}</b></div>
        <div class="d-row"><span>${esc(dcPt('feeTitle'))}</span><b>${esc((fee.amount || []).map(a => D.fmtCoin(a.amount, a.denom)).join(' + ') || '—')}</b></div>
        <div class="d-row"><span>${esc(dcPt('codespace'))}</span><b>${esc(txr.codespace || '—')}</b></div>
      </div>
      <div class="d-card"><div class="d-ct">${esc(dcPt('rawLogTitle'))}</div><details open><summary>raw_log</summary><pre>${esc(clip(log))}</pre></details></div>`;
  }

  /* ------------------------------------------------ 面板切换与事件 */
  function switchDPanel(name) {
    document.querySelectorAll('#pg-decoder .d-pill[data-dtool]').forEach(p => p.classList.remove('on'));
    document.querySelectorAll('#pg-decoder .d-panel').forEach(p => p.classList.remove('on'));
    const pill = document.querySelector(`#pg-decoder .d-pill[data-dtool="${name}"]`);
    if (pill) pill.classList.add('on');
    const panel = document.getElementById('dpanel-' + name);
    if (panel) panel.classList.add('on');
  }

  const DEMOS = []; // 示例哈希可后续补充：{label, hash}

  function welcomeHTML() {
    return `<div class="d-welcome">
      <div class="d-wico">🔍</div>
      <p>${dcPt('welcome')}</p>
    </div>`;
  }

  window.TOOL_REGISTRY['decoder'] = {
    render,
    bind() {
      if (!D) {
        document.getElementById('dOut').innerHTML =
          `<div class="banner err">${esc(dcPt('coreMissing'))}</div>`;
        return;
      }
      D.setAddressBook(loadBook());

      document.getElementById('dSearchBtn').addEventListener('click', doSearch);
      document.getElementById('dq').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
      document.getElementById('dClearBtn').addEventListener('click', () => {
        document.getElementById('dq').value = '';
        document.getElementById('dOut').innerHTML = welcomeHTML();
      });
      document.getElementById('dSbRun').addEventListener('click', runSandbox);
      document.getElementById('dSbClear').addEventListener('click', () => {
        document.getElementById('dSbMsg').value = '';
        document.getElementById('dSbOut').innerHTML = '';
      });
      document.getElementById('dBtRun').addEventListener('click', runBatch);
      document.getElementById('dBtCsv').addEventListener('click', exportCsv);
      document.getElementById('dDgRun').addEventListener('click', runDiagnose);
      document.getElementById('dDgIn').addEventListener('keydown', e => { if (e.key === 'Enter') runDiagnose(); });

      // 解码器联动：快捷跳转到相关工具
      [['dJumpBalance','balance-check'], ['dJumpRedelegate','redelegate'], ['dJumpValidator','validator-compare'], ['dJumpProposal','proposal']].forEach(([id, tool]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', () => { if (typeof navigateToTool === 'function') navigateToTool(tool); });
      });

      document.querySelectorAll('#pg-decoder .d-pill[data-dtool]').forEach(p => {
        p.addEventListener('click', () => switchDPanel(p.dataset.dtool));
      });

      document.getElementById('dDemoPills').innerHTML = DEMOS.map(d =>
        `<div class="d-pill" data-demo="${esc(d.hash)}">${esc(d.label)}</div>`).join('');
      document.querySelectorAll('#dDemoPills [data-demo]').forEach(b => {
        b.addEventListener('click', () => {
          document.getElementById('dq').value = b.dataset.demo;
          doSearch();
        });
      });

      document.getElementById('dOut').innerHTML = welcomeHTML();

      /* 事件委托：修复"复制 / 地址链接点击无响应"（copyText 已定义但此前未绑定任何监听） */
      const decPage = document.getElementById('pg-decoder');
      if (decPage) {
        decPage.addEventListener('click', async (e) => {
          const cpBtn = e.target.closest('.cp[data-copy]');
          if (cpBtn) {
            const ok = await copyText(cpBtn.getAttribute('data-copy') || '');
            showToast(ok ? dcPt('copied') : dcPt('copyFail'), ok ? 'success' : 'error');
            return;
          }
          const lnk = e.target.closest('.d-lnk[data-addr]');
          if (lnk) {
            const ok = await copyText(lnk.getAttribute('data-addr') || '');
            showToast(ok ? dcPt('addrCopied') : dcPt('copyFail'), ok ? 'success' : 'error');
          }
        });
      }

      /* URL 直达：?tool=decoder&hash=xxx 或 &addr=xxx（读取后清除参数，防止语言切换重渲染时重复查询） */
      try {
        const params = new URLSearchParams(location.search);
        if ((params.get('tool') || '') === 'decoder') {
          const q0 = params.get('hash') || params.get('addr');
          if (q0) {
            document.getElementById('dq').value = q0;
            doSearch();
            history.replaceState(null, '', location.pathname);
          }
        }
      } catch (_) {}
    },
  };
})();
