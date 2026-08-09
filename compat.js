/**
 * PaxiCosmJS 兼容层
 *
 * 问题：Paxi 官方 SDK (paxi-cosmjs.umd.js) 仅包含 Cosmos tx 模块
 *（TxBody/AuthInfo/SignDoc/TxRaw/Any/Coin），缺少 bank/wasm 模块的消息类
 *（MsgSend/MsgExecuteContract/MsgInstantiateContract/PubKey/coins）。
 *
 * 本文件在 SDK 加载后检测缺失的类，用手写 protobuf 编码器补充，
 * 确保代码在 SDK 缺失关键类时仍能正常运行。
 *
 * 编码已通过 protobufjs 官方库逐字节验证。
 */
(function () {
  'use strict';

  // ============================================================
  // protobuf 基础编码函数
  // ============================================================

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

  /** 编码 length-delimited 字段 (wire type 2) */
  function encodeLenDelim(fieldNum, data) {
    const tag = (fieldNum << 3) | 2;
    const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return concatBytes(encodeVarint(tag), encodeVarint(dataBytes.length), dataBytes);
  }

  /** 编码 varint 字段 (wire type 0) */
  function encodeVarintField(fieldNum, value) {
    const tag = (fieldNum << 3) | 0;
    return concatBytes(encodeVarint(tag), encodeVarint(value));
  }

  /** 拼接多个 Uint8Array */
  function concatBytes(...arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  // ============================================================
  // Coin 编码
  // ============================================================
  function encodeCoin(denom, amount) {
    return concatBytes(encodeLenDelim(1, denom), encodeLenDelim(2, amount));
  }

  // ============================================================
  // coins 辅助函数（替代 PaxiCosmJS.coins）
  // ============================================================
  function coins(amount, denom) {
    return [{ denom, amount: String(amount) }];
  }

  // ============================================================
  // MsgSend 编码
  // protobuf: cosmos.bank.v1beta1.MsgSend
  // { string from_address = 1; string to_address = 2; repeated Coin amount = 3; }
  // ============================================================
  const MsgSend = {
    fromPartial(data) { return data; },
    encode(data) {
      const parts = [
        encodeLenDelim(1, data.fromAddress),
        encodeLenDelim(2, data.toAddress),
      ];
      // amount 是 repeated Coin
      if (data.amount && data.amount.length > 0) {
        for (const coin of data.amount) {
          const coinBytes = encodeCoin(coin.denom, coin.amount);
          parts.push(encodeLenDelim(3, coinBytes));
        }
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // MsgExecuteContract 编码
  // protobuf: cosmwasm.wasm.v1.MsgExecuteContract
  // { string sender = 1; string contract = 2; bytes msg = 3; repeated Coin funds = 5; }
  // 注意：funds 是 field 5（field 4 被保留）
  // ============================================================
  const MsgExecuteContract = {
    fromPartial(data) { return data; },
    encode(data) {
      const parts = [
        encodeLenDelim(1, data.sender),
        encodeLenDelim(2, data.contract),
        encodeLenDelim(3, data.msg || new Uint8Array()),
      ];
      if (data.funds && data.funds.length > 0) {
        for (const coin of data.funds) {
          const coinBytes = encodeCoin(coin.denom, coin.amount);
          parts.push(encodeLenDelim(5, coinBytes));
        }
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // MsgInstantiateContract 编码
  // protobuf: cosmwasm.wasm.v1.MsgInstantiateContract
  // { string sender = 1; string admin = 2; uint64 code_id = 3; string label = 4; bytes msg = 5; repeated Coin funds = 6; }
  // ============================================================
  const MsgInstantiateContract = {
    fromPartial(data) { return data; },
    encode(data) {
      const parts = [
        encodeLenDelim(1, data.sender),
        encodeLenDelim(2, data.admin || ''),
        encodeVarintField(3, data.codeId || 0),
        encodeLenDelim(4, data.label || ''),
        encodeLenDelim(5, data.msg || new Uint8Array()),
      ];
      if (data.funds && data.funds.length > 0) {
        for (const coin of data.funds) {
          const coinBytes = encodeCoin(coin.denom, coin.amount);
          parts.push(encodeLenDelim(6, coinBytes));
        }
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // PubKey 编码 (secp256k1)
  // protobuf: cosmos.crypto.secp256k1.PubKey
  // { bytes key = 1; }
  // ============================================================
  const PubKey = {
    encode(data) {
      return { finish: () => encodeLenDelim(1, data.key) };
    },
  };

  // ============================================================
  // 兼容层入口：检测并补充缺失的类
  // ============================================================
  function applyCompat() {
    if (typeof window.PaxiCosmJS === 'undefined') {
      console.error('[Compat] PaxiCosmJS 未加载，兼容层无法应用');
      return;
    }

    const supplement = {
      MsgSend,
      MsgExecuteContract,
      MsgInstantiateContract,
      PubKey,
      coins,
    };

    let added = [];
    for (const [name, impl] of Object.entries(supplement)) {
      if (typeof window.PaxiCosmJS[name] === 'undefined') {
        window.PaxiCosmJS[name] = impl;
        added.push(name);
      }
    }

    if (added.length > 0) {
      console.log('[Compat] 已补充缺失的类:', added.join(', '));
    } else {
      console.log('[Compat] PaxiCosmJS SDK 完整，无需补充');
    }
  }

  // 在 DOM 加载后执行（确保 SDK 已加载）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCompat);
  } else {
    applyCompat();
  }
})();
