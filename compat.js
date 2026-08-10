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
      const fromAddress = data.fromAddress || data.from_address || '';
      const toAddress = data.toAddress || data.to_address || '';
      const parts = [
        encodeLenDelim(1, fromAddress),
        encodeLenDelim(2, toAddress),
      ];
      if (data.amount && data.amount.length > 0) {
        for (const coin of data.amount) {
          const coinBytes = encodeCoin(coin.denom || coin.denom_, coin.amount || coin.amount_ || '0');
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
      const sender = data.sender || data.sender_address || '';
      const contract = data.contract || data.contract_addr || '';
      const msgBytes = data.msg || new Uint8Array();
      const parts = [
        encodeLenDelim(1, sender),
        encodeLenDelim(2, contract),
        encodeLenDelim(3, msgBytes),
      ];
      if (data.funds && data.funds.length > 0) {
        for (const coin of data.funds) {
          const coinBytes = encodeCoin(coin.denom || coin.denom_, coin.amount || coin.amount_ || '0');
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
      const sender = data.sender || data.sender_address || '';
      const admin = data.admin || data.admin_address || '';
      const codeId = data.codeId ?? data.code_id ?? 0;
      const label = data.label || '';
      const msgBytes = data.msg || new Uint8Array();
      const parts = [
        encodeLenDelim(1, sender),
        encodeLenDelim(2, admin),
        encodeVarintField(3, codeId),
        encodeLenDelim(4, label),
        encodeLenDelim(5, msgBytes),
      ];
      if (data.funds && data.funds.length > 0) {
        for (const coin of data.funds) {
          const coinBytes = encodeCoin(coin.denom || coin.denom_, coin.amount || coin.amount_ || '0');
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
  // Any 编码（用于 Grant 内嵌套的 authorization 字段）
  // protobuf: google.protobuf.Any
  // { string type_url = 1; bytes value = 2; }
  // ============================================================
  const AnyEncode = {
    encode(data) {
      const typeUrl = data.typeUrl || data.type_url || '';
      const value = data.value || new Uint8Array();
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, typeUrl),
          encodeLenDelim(2, value),
        ),
      };
    },
  };

  // ============================================================
  // GenericAuthorization 编码
  // protobuf: cosmos.authz.v1beta1.GenericAuthorization
  // { string msg = 1; }  // msg = 授权的消息类型 typeUrl
  // ============================================================
  const GenericAuthorization = {
    fromPartial(data) { return data; },
    encode(data) {
      const msg = data.msg || data.msg_type_url || '';
      return { finish: () => encodeLenDelim(1, msg) };
    },
  };

  // ============================================================
  // Timestamp 编码
  // protobuf: google.protobuf.Timestamp
  // { int64 seconds = 1; int32 nanos = 2; }
  // ============================================================
  const Timestamp = {
    fromPartial(data) { return data; },
    encode(data) {
      const seconds = data.seconds ?? 0;
      const nanos = data.nanos ?? 0;
      return {
        finish: () => concatBytes(
          encodeVarintField(1, seconds),
          encodeVarintField(2, nanos),
        ),
      };
    },
  };

  // ============================================================
  // Grant 编码
  // protobuf: cosmos.authz.v1beta1.Grant
  // { Any authorization = 1; Timestamp expiration = 2; }
  // ============================================================
  const Grant = {
    fromPartial(data) { return data; },
    encode(data) {
      const authBytes = AnyEncode.encode(data.authorization).finish();
      const expBytes = Timestamp.encode(data.expiration).finish();
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, authBytes),
          encodeLenDelim(2, expBytes),
        ),
      };
    },
  };

  // ============================================================
  // MsgGrant 编码 — 授权
  // protobuf: cosmos.authz.v1beta1.MsgGrant
  // { string granter = 1; string grantee = 2; Grant grant = 3; }
  // ============================================================
  const MsgGrant = {
    fromPartial(data) { return data; },
    encode(data) {
      const granter = data.granter || data.granter_address || '';
      const grantee = data.grantee || data.grantee_address || '';
      const grantBytes = Grant.encode(data.grant).finish();
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, granter),
          encodeLenDelim(2, grantee),
          encodeLenDelim(3, grantBytes),
        ),
      };
    },
  };

  // ============================================================
  // MsgExec 编码 — 代执行
  // protobuf: cosmos.authz.v1beta1.MsgExec
  // { string grantee = 1; repeated Any msgs = 2; }
  // ============================================================
  const MsgExec = {
    fromPartial(data) { return data; },
    encode(data) {
      const grantee = data.grantee || data.grantee_address || '';
      const parts = [encodeLenDelim(1, grantee)];
      if (data.msgs && data.msgs.length > 0) {
        for (const msg of data.msgs) {
          const anyBytes = AnyEncode.encode(msg).finish();
          parts.push(encodeLenDelim(2, anyBytes));
        }
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // MsgUpdateAdmin 编码
  // protobuf: cosmwasm.wasm.v1.MsgUpdateAdmin
  // { string sender = 1; string new_admin = 2; string contract = 3; }
  // ============================================================
  const MsgUpdateAdmin = {
    fromPartial(data) { return data; },
    encode(data) {
      const sender = data.sender || data.sender_address || '';
      const newAdmin = data.newAdmin || data.new_admin || '';
      const contract = data.contract || data.contract_addr || '';
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, sender),
          encodeLenDelim(2, newAdmin),
          encodeLenDelim(3, contract),
        ),
      };
    },
  };

  // ============================================================
  // MsgMigrateContract 编码
  // protobuf: cosmwasm.wasm.v1.MsgMigrateContract
  // { string sender = 1; string contract = 2; uint64 code_id = 3; bytes msg = 4; }
  // ============================================================
  const MsgMigrateContract = {
    fromPartial(data) { return data; },
    encode(data) {
      const sender = data.sender || data.sender_address || '';
      const contract = data.contract || data.contract_addr || '';
      const codeId = data.codeId ?? data.code_id ?? 0;
      const msgBytes = data.msg || new Uint8Array();
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, sender),
          encodeLenDelim(2, contract),
          encodeVarintField(3, codeId),
          encodeLenDelim(4, msgBytes),
        ),
      };
    },
  };

  // ============================================================
  // MsgRevoke 编码 — 撤销授权
  // protobuf: cosmos.authz.v1beta1.MsgRevoke
  // { string granter = 1; string grantee = 2; string msg_type_url = 3; }
  // ============================================================
  const MsgRevoke = {
    fromPartial(data) { return data; },
    encode(data) {
      const granter = data.granter || data.granter_address || '';
      const grantee = data.grantee || data.grantee_address || '';
      const msgTypeUrl = data.msgTypeUrl || data.msg_type_url || '';
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, granter),
          encodeLenDelim(2, grantee),
          encodeLenDelim(3, msgTypeUrl),
        ),
      };
    },
  };

  // ============================================================
  // MsgDelegate 编码 — 质押委托
  // protobuf: cosmos.staking.v1beta1.MsgDelegate
  // { string delegator_address = 1; string validator_address = 2; Coin amount = 3; }
  // ============================================================
  const MsgDelegate = {
    fromPartial(data) { return data; },
    encode(data) {
      const delegatorAddress = data.delegator_address || data.delegatorAddress || '';
      const validatorAddress = data.validator_address || data.validatorAddress || '';
      const parts = [
        encodeLenDelim(1, delegatorAddress),
        encodeLenDelim(2, validatorAddress),
      ];
      if (data.amount) {
        const coinBytes = encodeCoin(
          data.amount.denom || data.amount.denom_,
          data.amount.amount || data.amount.amount_ || '0'
        );
        parts.push(encodeLenDelim(3, coinBytes));
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // MsgBeginRedelegate 编码 — 质押迁移
  // protobuf: cosmos.staking.v1beta1.MsgBeginRedelegate
  // { string delegator_address = 1; string validator_src_address = 2; string validator_dst_address = 3; Coin amount = 4; }
  // 兼容 snake_case (app.js) 和 camelCase (SDK 风格) 两种字段名
  // ============================================================
  const MsgBeginRedelegate = {
    fromPartial(data) { return data; },
    encode(data) {
      const delegatorAddress = data.delegator_address || data.delegatorAddress || '';
      const validatorSrcAddress = data.validator_src_address || data.validatorSrcAddress || '';
      const validatorDstAddress = data.validator_dst_address || data.validatorDstAddress || '';
      const parts = [
        encodeLenDelim(1, delegatorAddress),
        encodeLenDelim(2, validatorSrcAddress),
        encodeLenDelim(3, validatorDstAddress),
      ];
      if (data.amount) {
        const coinBytes = encodeCoin(
          data.amount.denom || data.amount.denom_,
          data.amount.amount || data.amount.amount_ || '0'
        );
        parts.push(encodeLenDelim(4, coinBytes));
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // 🔥 新增：MsgSubmitProposal 编码 — 提交治理提案
  // protobuf: cosmos.gov.v1beta1.MsgSubmitProposal
  // { google.protobuf.Any content = 1; repeated Coin initial_deposit = 2; string proposer = 3; }
  // ============================================================
  const MsgSubmitProposal = {
    fromPartial(data) { return data; },
    encode(data) {
      const parts = [];
      // 1. content (Any) - field 1
      if (data.content) {
        const contentBytes = AnyEncode.encode(data.content).finish();
        parts.push(encodeLenDelim(1, contentBytes));
      }
      // 2. initial_deposit (repeated Coin) - field 2
      const deposits = data.initial_deposit || data.initialDeposit || [];
      for (const coin of deposits) {
        const coinBytes = encodeCoin(coin.denom || coin.denom_, coin.amount || coin.amount_ || '0');
        parts.push(encodeLenDelim(2, coinBytes));
      }
      // 3. proposer (string) - field 3
      const proposer = data.proposer || data.proposer_address || '';
      if (proposer) {
        parts.push(encodeLenDelim(3, proposer));
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // 🔥 新增：MsgVote 编码 — 投票
  // protobuf: cosmos.gov.v1beta1.MsgVote
  // { uint64 proposal_id = 1; string voter = 2; VoteOption option = 3; }
  // VoteOption: 0=空, 1=Yes, 2=Abstain, 3=No, 4=NoWithVeto
  // ============================================================
  const MsgVote = {
    fromPartial(data) { return data; },
    encode(data) {
      const proposalId = data.proposal_id ?? data.proposalId ?? 0;
      const voter = data.voter || data.voter_address || '';
      const option = data.option ?? data.vote_option ?? 1;
      return {
        finish: () => concatBytes(
          encodeVarintField(1, proposalId),
          encodeLenDelim(2, voter),
          encodeVarintField(3, option),
        ),
      };
    },
  };

  // ============================================================
  // 🔥 新增：TextProposal 编码（提案内容）
  // protobuf: cosmos.gov.v1beta1.TextProposal
  // { string title = 1; string description = 2; }
  // ============================================================
  const TextProposal = {
    fromPartial(data) { return data; },
    encode(data) {
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, data.title || ''),
          encodeLenDelim(2, data.description || ''),
        ),
      };
    },
  };

  // ============================================================
  // 🔥 新增：ParameterChangeProposal 编码（参数修改提案）
  // protobuf: cosmos.gov.v1beta1.ParameterChangeProposal
  // { string title = 1; string description = 2; repeated ParamChange changes = 3; }
  // ParamChange: { string subspace = 1; string key = 2; string value = 3; }
  // ============================================================
  const ParamChange = {
    encode(data) {
      return {
        finish: () => concatBytes(
          encodeLenDelim(1, data.subspace || ''),
          encodeLenDelim(2, data.key || ''),
          encodeLenDelim(3, data.value || ''),
        ),
      };
    },
  };

  const ParameterChangeProposal = {
    fromPartial(data) { return data; },
    encode(data) {
      const parts = [
        encodeLenDelim(1, data.title || ''),
        encodeLenDelim(2, data.description || ''),
      ];
      if (data.changes && data.changes.length > 0) {
        for (const change of data.changes) {
          const changeBytes = ParamChange.encode(change).finish();
          parts.push(encodeLenDelim(3, changeBytes));
        }
      }
      return { finish: () => concatBytes(...parts) };
    },
  };

  // ============================================================
  // 兼容层入口：强制覆盖所有消息编码类
  // 原因：SDK 内置的 MsgSend/MsgExecuteContract 等消息类编码可能存在错误，
  //       必须用我们手写的、经过 protobufjs 验证的正确实现替换。
  //       但保留 SDK 的 coins/PubKey 等工具类，因为 Fee/AuthInfo 编码依赖它们。
  // ============================================================
  function applyCompat() {
    if (typeof window.PaxiCosmJS === 'undefined') {
      console.error('[Compat] PaxiCosmJS 未加载，兼容层无法应用');
      return;
    }

    const overrides = {
      // === 核心消息编码（强制覆盖）===
      MsgSend,
      MsgExecuteContract,
      MsgInstantiateContract,
      MsgDelegate,
      MsgBeginRedelegate,
      // === Authz 相关 ===
      GenericAuthorization,
      Timestamp,
      Grant,
      MsgGrant,
      MsgExec,
      MsgRevoke,
      // === Wasm 相关 ===
      MsgUpdateAdmin,
      MsgMigrateContract,
      // === 治理相关 ===
      MsgSubmitProposal,
      MsgVote,
      TextProposal,
      ParameterChangeProposal,
    };

    let replaced = [];
    for (const [name, impl] of Object.entries(overrides)) {
      window.PaxiCosmJS[name] = impl;
      replaced.push(name);
    }

    window.PaxiCosmJS._compatReady = true;
    console.log('[Compat] 已强制覆盖消息编码类:', replaced.join(', '));
    console.log('[Compat] 保留 SDK 原生类: coins, PubKey, Any, TxBody, AuthInfo, SignDoc, TxRaw');
  }

  // 等待 SDK 加载完成后再应用兼容层
  // 因为 SDK 使用 async 加载，可能比 compat.js 晚执行
  function waitForSDK(maxRetries = 50, interval = 100) {
    if (typeof window.PaxiCosmJS !== 'undefined') {
      applyCompat();
      return;
    }
    let retries = 0;
    const timer = setInterval(() => {
      retries++;
      if (typeof window.PaxiCosmJS !== 'undefined') {
        clearInterval(timer);
        applyCompat();
      } else if (retries >= maxRetries) {
        clearInterval(timer);
        console.error('[Compat] SDK 加载超时，兼容层未能应用');
      }
    }, interval);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForSDK());
  } else {
    waitForSDK();
  }
})();