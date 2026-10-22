/**
 * 回归测试：CommunityPoolSpendProposal 编码是否被 Paxi 链正确识别
 *
 * 方法：构造 MsgSubmitProposal（content = CommunityPoolSpendProposal）→ POST /cosmos/tx/v1beta1/simulate
 * 判定：simulate 会走到签名校验阶段才失败（"invalid number of signer"），说明 tx 已被完整解析。
 *       若 typeUrl 错误，则在 gas≈1159 就报 "unable to resolve type URL"。
 *       故以 gas_used > 5000 作为"解析成功"判据。
 *
 * 运行：node test/verify-pool-proposal.js
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
function communityPoolSpendProposalEncode(data) {
  const parts = [
    encodeLenDelim(1, data.title || ''),
    encodeLenDelim(2, data.description || ''),
    encodeLenDelim(3, data.recipient || ''),
  ];
  for (const coin of (data.amount || [])) {
    parts.push(encodeLenDelim(4, encodeCoin(coin.denom, coin.amount)));
  }
  return concatBytes(...parts);
}
function msgSubmitProposalEncode(data) {
  const parts = [];
  if (data.content) parts.push(encodeLenDelim(1, anyEncode(data.content)));
  for (const coin of (data.initialDeposit || [])) {
    parts.push(encodeLenDelim(2, encodeCoin(coin.denom, coin.amount)));
  }
  if (data.proposer) parts.push(encodeLenDelim(3, data.proposer));
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

async function simulate(label, contentAny, denom, proposer) {
  const msg = {
    typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
    value: msgSubmitProposalEncode({
      content: contentAny,
      initialDeposit: [{ denom, amount: '1000000' }],
      proposer,
    }),
  };
  const bodyBytes = txBodyEncode([msg], 'simulate probe');
  const authInfoBytes = authInfoEncode({ amount: [{ denom, amount: '0' }], gasLimit: 0 });
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
  const resolved = /unable to resolve type URL/.test(msgText);
  console.log(`\n== ${label} ==`);
  console.log('  HTTP', res.status, '| gas:', gas, '| typeUrl unresolved:', resolved);
  console.log('  msg:', msgText.slice(0, 160));
  return { gas, resolved, msgText };
}

(async () => {
  const denom = 'upaxi';
  const addr = 'paxi1rdarmm997hqwfdgl9wvnpffe28zmex3kfyg7xd';
  let failures = 0;

  // 1) 新增类型：正确 typeUrl + 正确字段布局
  const good = await simulate('CommunityPoolSpendProposal (v1beta1, correct fields)', {
    typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
    value: communityPoolSpendProposalEncode({
      title: 'probe pool spend',
      description: 'probe',
      recipient: addr,
      amount: [{ denom, amount: '150000000000' }], // 150000 PAXI
    }),
  }, denom, addr);

  // 2) 对照组：错误 typeUrl
  const bad = await simulate('NEGATIVE control (wrong typeUrl)', {
    typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposa',
    value: communityPoolSpendProposalEncode({
      title: 'probe', description: 'probe', recipient: addr,
      amount: [{ denom, amount: '150000000000' }],
    }),
  }, denom, addr);

  console.log('\n---------------- 判定 ----------------');
  const ok1 = good.gas > 5000 && !good.resolved;
  const ok2 = bad.resolved && bad.gas < 5000;
  if (!ok1) { console.log('❌ 新类型未被链上正确解析'); failures++; }
  else console.log('✅ CommunityPoolSpendProposal 编码被链上正确识别');
  if (!ok2) { console.log('❌ 对照组异常，探测不可信'); failures++; }
  else console.log('✅ 对照组按预期失败（typeUrl 错误即报 unresolved）');

  if (failures) { console.log('\nRESULT: FAIL'); process.exit(1); }
  console.log('\nRESULT: PASS');
})();
