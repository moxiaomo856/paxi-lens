/**
 * 回归测试：v1 方式社区池拨款提案（DAO 资助申请）
 *
 * 依据：链上已 PASSED 的提案 #13（Paxi CosmWasm Game & Lottery Open-Source Template,
 * 188,000 PAXI）使用的正是 gov v1 方式：
 *   MsgSubmitProposal(v1) { messages: [ MsgCommunityPoolSpend{authority=gov模块账户,
 *   recipient, amount} ], initial_deposit, proposer, metadata, title, summary }
 * 而非 legacy content（CommunityPoolSpendProposal 在 SDK v0.53 已不被 gov 接受）。
 *
 * 验证方法：构造 tx → POST /cosmos/tx/v1beta1/simulate
 *   - 走通到签名校验（"invalid number of signer"）且 gas_used > 5000 ⇒ 编码被正确解析
 *   - 错误 typeUrl 会在 gas≈1159 报 "unable to resolve type URL"（负向对照）
 *
 * 运行：node test/verify-pool-proposal-v1.js
 */
const LCD = process.env.PAXI_LCD || 'https://mainnet-lcd.paxinet.io';

// ---- protobuf 基础编码（与 compat.js 保持一致）----
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
// cosmos.distribution.v1beta1.MsgCommunityPoolSpend
// { string authority = 1; string recipient = 2; repeated Coin amount = 3; }
function msgCommunityPoolSpendEncode(data) {
  const parts = [];
  if (data.authority) parts.push(encodeLenDelim(1, data.authority));
  if (data.recipient) parts.push(encodeLenDelim(2, data.recipient));
  for (const coin of (data.amount || [])) {
    parts.push(encodeLenDelim(3, encodeCoin(coin.denom, coin.amount)));
  }
  return concatBytes(...parts);
}
// cosmos.gov.v1.MsgSubmitProposal
// { repeated Any messages = 1; repeated Coin initial_deposit = 2; string proposer = 3;
//   string metadata = 4; string title = 5; string summary = 6; bool expedited = 7; }
function msgSubmitProposalV1Encode(data) {
  const parts = [];
  for (const m of (data.messages || [])) {
    parts.push(encodeLenDelim(1, anyEncode(m)));
  }
  for (const coin of (data.initial_deposit || [])) {
    parts.push(encodeLenDelim(2, encodeCoin(coin.denom, coin.amount)));
  }
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

async function simulate(label, submitMsg) {
  const bodyBytes = txBodyEncode([submitMsg], 'simulate probe');
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
  console.log('  msg:', msgText.slice(0, 190));
  return { gas, unresolved, signCheck, msgText };
}

// 链上真实数据（提案 #13 黄金样本）
const DENOM = 'upaxi';
const GOV_AUTH = 'paxi10d07y265gmmuvt4z0w9aw880jnsr700je7h2vr';
const RECIPIENT = 'paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg';

function buildSubmit(typeUrl, spendTypeUrl, amountMicro) {
  const spend = {
    typeUrl: spendTypeUrl,
    value: msgCommunityPoolSpendEncode({
      authority: GOV_AUTH,
      recipient: RECIPIENT,
      amount: [{ denom: DENOM, amount: amountMicro }],
    }),
  };
  return {
    typeUrl,
    value: msgSubmitProposalV1Encode({
      messages: [spend],
      initial_deposit: [{ denom: DENOM, amount: '30000000' }], // 30 PAXI（与 #13 一致）
      proposer: RECIPIENT,
      metadata: 'https://github.com/moxiaomo856/paxi-dao-proposal/blob/main/proposal.md',
      title: 'Paxi CosmWasm Game & Lottery Open-Source Template + Invisible-UX Starter (188,000 PAXI)',
      summary: 'Extract validated game and lottery contracts into Paxi first open-source MIT CosmWasm template.',
      expedited: false,
    }),
  };
}

(async () => {
  let failures = 0;

  // 1) 正确 v1 方式（与 #13 同构，金额 188,000 PAXI）
  const good = await simulate('v1 MsgSubmitProposal + MsgCommunityPoolSpend (mirrors passed #13)',
    buildSubmit('/cosmos.gov.v1.MsgSubmitProposal', '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend', '188000000000'));

  // 2) 负向对照：错误 typeUrl
  const bad = await simulate('NEGATIVE control (wrong MsgCommunityPoolSpend typeUrl)',
    buildSubmit('/cosmos.gov.v1.MsgSubmitProposal', '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendXX', '188000000000'));

  // 3) 负向对照：错误 submit typeUrl
  const bad2 = await simulate('NEGATIVE control (wrong MsgSubmitProposal typeUrl)',
    buildSubmit('/cosmos.gov.v1.MsgSubmitProposalXX', '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend', '188000000000'));

  console.log('\n---------------- 判定 ----------------');
  if (!(good.gas > 5000 && good.signCheck && !good.unresolved)) {
    console.log('❌ v1 方式未被链上正确解析'); failures++;
  } else {
    console.log('✅ v1 MsgSubmitProposal + MsgCommunityPoolSpend 编码被链上正确识别（走通至签名校验）');
  }
  if (!(bad.unresolved && bad.gas < 5000)) { console.log('❌ 负向对照1 异常'); failures++; }
  else console.log('✅ 负向对照1 按预期失败（typeUrl 无法解析）');
  if (!(bad2.unresolved && bad2.gas < 5000)) { console.log('❌ 负向对照2 异常'); failures++; }
  else console.log('✅ 负向对照2 按预期失败（typeUrl 无法解析）');

  if (failures) { console.log('\nRESULT: FAIL'); process.exit(1); }
  console.log('\nRESULT: PASS');
})();
