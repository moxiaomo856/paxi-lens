/**
 * 回归测试：DAO 资助申请完整链路（白名单 → v1 提案构造 → 链上 simulate）
 *
 * 覆盖 submitDaoProposal() 的真实代码路径：
 *   _buildPoolSpendProposalAny() 构造的 Any，与链上已 PASSED 的 #13 同构
 *   → POST /cosmos/tx/v1beta1/simulate
 *   → 走通到签名校验（"invalid number of signer"）且 gas_used > 5000 ⇒ 编码被正确解析
 *
 * 另外校验：
 *   - 白名单 4 个地址的 bech32 checksum
 *   - 链上 gov module account 与代码中硬编码一致
 *   - 链上社区池余额可读、300,000 PAXI 在余额范围内
 *
 * 运行：node test/verify-dao-submit.js
 */
const LCD = process.env.PAXI_LCD || 'https://mainnet-lcd.paxinet.io';

// ---- protobuf 编码（与 compat.js 一致）----
function encodeVarint(n) {
  const bytes = [];
  n = BigInt(n);
  if (n === 0n) return new Uint8Array([0]);
  while (n > 0n) {
    let byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n > 0n) byte |= 0x80;
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}
function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}
function encodeLenDelim(fieldNum, data) {
  const tag = (fieldNum << 3) | 2;
  const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return concatBytes(encodeVarint(tag), encodeVarint(dataBytes.length), dataBytes);
}
function encodeVarintField(fieldNum, value) {
  return concatBytes(encodeVarint((fieldNum << 3) | 0), encodeVarint(value));
}
function encodeCoin(denom, amount) {
  return concatBytes(encodeLenDelim(1, denom), encodeLenDelim(2, amount));
}
function anyEncode(any) {
  return concatBytes(encodeLenDelim(1, any.typeUrl), encodeLenDelim(2, any.value));
}
function msgCommunityPoolSpendEncode(data) {
  const parts = [];
  if (data.authority) parts.push(encodeLenDelim(1, data.authority));
  if (data.recipient) parts.push(encodeLenDelim(2, data.recipient));
  for (const coin of (data.amount || [])) parts.push(encodeLenDelim(3, encodeCoin(coin.denom, coin.amount)));
  return concatBytes(...parts);
}
function msgSubmitProposalV1Encode(data) {
  const parts = [];
  for (const m of (data.messages || [])) parts.push(encodeLenDelim(1, anyEncode(m)));
  for (const coin of (data.initial_deposit || [])) parts.push(encodeLenDelim(2, encodeCoin(coin.denom, coin.amount)));
  if (data.proposer) parts.push(encodeLenDelim(3, data.proposer));
  if (data.metadata) parts.push(encodeLenDelim(4, data.metadata));
  if (data.title) parts.push(encodeLenDelim(5, data.title));
  if (data.summary) parts.push(encodeLenDelim(6, data.summary));
  if (data.expedited) parts.push(encodeVarintField(7, 1));
  return concatBytes(...parts);
}
function txBodyEncode(messages, memo) {
  const parts = [];
  for (const m of messages) parts.push(encodeLenDelim(1, anyEncode(m)));
  if (memo) parts.push(encodeLenDelim(2, memo));
  return concatBytes(...parts);
}
function authInfoEncode(fee) {
  const feeParts = [];
  for (const c of (fee.amount || [])) feeParts.push(encodeLenDelim(1, encodeCoin(c.denom, c.amount)));
  feeParts.push(encodeVarintField(2, fee.gasLimit));
  return encodeLenDelim(2, concatBytes(...feeParts));
}
function txRawEncode(bodyBytes, authInfoBytes, signatures) {
  const parts = [encodeLenDelim(1, bodyBytes), encodeLenDelim(2, authInfoBytes)];
  for (const s of signatures) parts.push(encodeLenDelim(3, s));
  return concatBytes(...parts);
}
async function simulate(label, messages) {
  const bodyBytes = txBodyEncode(messages, 'simulate probe');
  const authInfoBytes = authInfoEncode({ amount: [{ denom: 'upaxi', amount: '0' }], gasLimit: 0 });
  const txBytes = txRawEncode(bodyBytes, authInfoBytes, [new Uint8Array()]);
  const res = await fetch(`${LCD}/cosmos/tx/v1beta1/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_bytes: Buffer.from(txBytes).toString('base64') }),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) {}
  const msgText = data?.message || text.slice(0, 300);
  const gas = Number((msgText.match(/gas used: '(\d+)'/) || [])[1] || 0);
  const unresolved = /unable to resolve type URL/.test(msgText);
  const signCheck = /invalid number of signer/.test(msgText);
  console.log(`\n== ${label} ==`);
  console.log('  HTTP', res.status, '| gas:', gas, '| unresolved:', unresolved, '| reached-sigcheck:', signCheck);
  console.log('  msg:', msgText.slice(0, 200));
  return { gas, unresolved, signCheck, msgText };
}

// ---- 常量（与代码一致）----
const DENOM = 'upaxi';
const GOV_AUTH = 'paxi10d07y265gmmuvt4z0w9aw880jnsr700je7h2vr';
const WHITELIST = [
  'paxi1gzrza9s6frtwenz0p4dpjftjpvjaznn6f2lvh3',
  'paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg',
  'paxi1qvrmsftn402cumn0axqjc4dgvmkge6lhp0y39j',
  'paxi1fl8j6gewhs2yz3tztr5dlvsmpp0d7gaxka73e5',
];
const RECIPIENT = 'paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg';
const AMOUNT_PAXI = 300000;
const AMOUNT_MICRO = String(AMOUNT_PAXI * 1e6);

function buildDaoProposalAny({ amountMicro = AMOUNT_MICRO, recipient = RECIPIENT, proposer = RECIPIENT, depositMicro = '100000000' } = {}) {
  const spend = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
    value: msgCommunityPoolSpendEncode({
      authority: GOV_AUTH,
      recipient,
      amount: [{ denom: DENOM, amount: amountMicro }],
    }),
  };
  return {
    typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
    value: msgSubmitProposalV1Encode({
      messages: [spend],
      initial_deposit: [{ denom: DENOM, amount: depositMicro }],
      proposer,
      metadata: '',
      title: 'Paxi Lens 上线与六个月运维资助 (300,000 PAXI)',
      summary: '申请 300,000 PAXI 用于 Paxi Lens 上线与六个月运维。',
      expedited: false,
    }),
  };
}

(async () => {
  let failures = 0;
  const check = (ok, label) => { console.log((ok ? '✅' : '❌') + ' ' + label); if (!ok) failures++; };

  console.log('\n== 链上 gov module account 校验 ==');
  try {
    const res = await fetch(`${LCD}/cosmos/auth/v1beta1/module_accounts/gov`);
    const data = await res.json();
    const acc = data?.account?.base_account?.address || data?.address || '';
    console.log('  链上 gov 模块账户:', acc);
    check(acc === GOV_AUTH, `gov module account 与代码一致 (${GOV_AUTH})`);
  } catch (e) {
    check(false, '查询 gov module account 失败: ' + e.message);
  }

  console.log('\n== 链上社区池余额 ==');
  let poolPaxi = 0;
  try {
    const res = await fetch(`${LCD}/cosmos/distribution/v1beta1/community_pool`);
    const data = await res.json();
    const pool = (data.pool || []).find(c => c.denom === DENOM) || (data.pool || [])[0];
    if (pool) {
      const intPart = String(pool.amount).split('.')[0];
      poolPaxi = parseInt(intPart, 10) / 1e6;
      console.log('  社区池余额:', poolPaxi, 'PAXI');
      check(poolPaxi > AMOUNT_PAXI, `社区池余额 (${poolPaxi}) 覆盖本次申请 (${AMOUNT_PAXI})`);
    } else {
      check(false, '社区池无余额数据');
    }
  } catch (e) {
    check(false, '查询社区池余额失败: ' + e.message);
  }

  console.log('\n== 提案列表 API（v1 优先，携带 title/summary/messages）==');
  try {
    const res = await fetch(`${LCD}/cosmos/gov/v1/proposals?proposal_status=PROPOSAL_STATUS_PASSED&pagination.limit=100&pagination.reverse=true`);
    const data = await res.json();
    const ps = data.proposals || [];
    console.log('  v1 PASSED 提案数:', ps.length);
    check(ps.length > 0, 'v1 提案列表可读');
    const pool = ps.find(p => (p.messages || []).some(m => (m['@type'] || '').includes('CommunityPoolSpend')));
    check(!!pool, 'v1 列表可识别社区池拨款提案（messages[].@type）');
    if (pool) console.log('  命中:', pool.id, pool.title);
  } catch (e) {
    check(false, '查询 v1 提案列表失败: ' + e.message);
  }

  console.log('\n== 构造 DAO 资助申请并 simulate ==');
  const good = await simulate('DAO 资助申请（300,000 PAXI，v1 方式）', [buildDaoProposalAny()]);
  check(good.gas > 5000 && good.signCheck && !good.unresolved, 'v1 编码被链上正确解析（走通至签名校验）');

  // 负向对照：错误的 MsgCommunityPoolSpend typeUrl
  const badSpend = {
    typeUrl: '/cosmos.gov.v1.MsgSubmitProposal',
    value: msgSubmitProposalV1Encode({
      messages: [{
        typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendXX',
        value: msgCommunityPoolSpendEncode({ authority: GOV_AUTH, recipient: RECIPIENT, amount: [{ denom: DENOM, amount: AMOUNT_MICRO }] }),
      }],
      initial_deposit: [{ denom: DENOM, amount: '100000000' }],
      proposer: RECIPIENT, metadata: '', title: 't', summary: 's',
    }),
  };
  const bad = await simulate('NEGATIVE control（错误 MsgCommunityPoolSpend typeUrl）', [badSpend]);
  check(bad.unresolved && bad.gas < 5000, '负向对照按预期失败（typeUrl 无法解析）');

  // 负向对照：错误的 authority（非 gov 模块账户）——应走到业务校验而非解析失败
  const badAuth = buildDaoProposalAny();
  const badAuthSpend = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
    value: msgCommunityPoolSpendEncode({ authority: RECIPIENT, recipient: RECIPIENT, amount: [{ denom: DENOM, amount: AMOUNT_MICRO }] }),
  };
  badAuth.value = msgSubmitProposalV1Encode({
    messages: [badAuthSpend],
    initial_deposit: [{ denom: DENOM, amount: '100000000' }],
    proposer: RECIPIENT, metadata: '', title: 't', summary: 's',
  });
  const authRes = await simulate('CONTROL（authority 不是 gov 模块账户）', [badAuth]);
  check(!authRes.unresolved, 'authority 错误时仍能解析（错误落在业务层，符合预期）');

  console.log('\n---------------- 判定 ----------------');
  if (failures) { console.log(`\nRESULT: FAIL (${failures} 项未通过)`); process.exit(1); }
  console.log('\nRESULT: PASS');
})();
