#!/usr/bin/env node
// ============================================================
// pump-watch.js —— Paxi Pump 发币监控（区块扫描版）
// 背景：Paxi 节点关闭了交易索引（GetTxsEvent 不可用），
//       因此改为增量扫描区块：从上次检查高度扫到最新高度，
//       过滤「MsgSend 转账给平台统一收款地址 + memo 含 fee xx PAXI」的交易，
//       发现后立即通过 Server酱 (sct.ftqq.com) 推送到微信。
//
// 配置：.workbuddy/pump-watch.json  ->  { "sendKey": "SCTxxxx" }
// 状态：.workbuddy/pump-watch-state.json（自动维护：上次高度 + 已推送哈希）
// 运行：node pump-watch.js（可被计划任务/WorkBuddy 定时任务反复调用，间隔越短越实时）
// ============================================================
const fs = require('fs');
const path = require('path');

const LCD = 'https://mainnet-lcd.paxinet.io';
// 收款地址：与 dApp 统一为单一平台收款地址 CONFIG.feeCollector
const FEE_RECEIVERS = new Set([
    "paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg"
]);
// 单次最多扫描的区块数（防止停机太久导致扫描时间过长，超过则跳过中间段）
const MAX_BLOCKS_PER_RUN = 3000;
// 并发抓取区块数（太高会触发节点 503 限流）
const CONCURRENCY = 6;

const BASE = __dirname;
const CONFIG_FILE = path.join(BASE, '.workbuddy', 'pump-watch.json');
const STATE_FILE = path.join(BASE, '.workbuddy', 'pump-watch-state.json');

function loadJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function saveJson(file, obj) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

async function fetchJson(url, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function getLatestHeight() {
    const data = await fetchJson(`${LCD}/cosmos/base/tendermint/v1beta1/blocks/latest`);
    return Number(data.block.header.height);
}

// 判断一个区块里的交易是否为发币服务费交易
function findFeeTxs(blockData) {
    const out = [];
    const bodies = blockData.txs || [];
    const responses = blockData.tx_responses || [];
    responses.forEach((resp, i) => {
        const body = bodies[i] || {};
        const memo = body.memo || '';
        if (!/fee\s+\d+(\.\d+)?\s+PAXI/i.test(memo)) return;
        for (const m of (body.messages || [])) {
            const type = String(m['@type'] || '');
            if (type.includes('MsgSend') && FEE_RECEIVERS.has(m.to_address)) {
                out.push({
                    hash: resp.txhash,
                    memo,
                    to: m.to_address,
                    amount: (m.amount || []).map(a => `${a.amount}${a.denom}`).join(',')
                });
                break;
            }
        }
    });
    return out;
}

// 并发抓取一段高度内的所有区块交易；返回 { found, failedHeights }
async function scanRange(from, to) {
    const found = [];
    const failedHeights = [];
    for (let start = from; start <= to; start += CONCURRENCY) {
        const end = Math.min(start + CONCURRENCY - 1, to);
        const heights = [];
        for (let h = start; h <= end; h++) heights.push(h);
        const results = await Promise.all(heights.map(async h => {
            // 每块最多重试 3 次，间隔递增，尽量扛住节点限流
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const data = await fetchJson(`${LCD}/cosmos/tx/v1beta1/txs/block/${h}`);
                    return { ok: true, txs: findFeeTxs(data).map(t => ({ ...t, height: h })) };
                } catch (e) {
                    if (attempt === 3) return { ok: false, h };
                    await new Promise(r => setTimeout(r, 800 * attempt));
                }
            }
        }));
        results.forEach(r => {
            if (r.ok) found.push(...r.txs);
            else failedHeights.push(r.h);
        });
    }
    return { found, failedHeights };
}

async function main() {
    const cfg = loadJson(CONFIG_FILE, {});
    const sendKey = (cfg.sendKey || '').trim();
    const state = loadJson(STATE_FILE, {});

    const latest = await getLatestHeight();
    console.log(`[链上最新高度] ${latest}`);

    // 首次运行：只记录基线高度，不回溯历史
    if (!state.lastHeight) {
        saveJson(STATE_FILE, { lastHeight: latest, seen: [] });
        console.log(`[首次运行] 已建立基线高度 ${latest}，本次不推送`);
        return;
    }

    let from = state.lastHeight + 1;
    let to = latest;
    if (to < from) { console.log('[结果] 无新区块'); return; }
    if (to - from + 1 > MAX_BLOCKS_PER_RUN) {
        console.error(`[警告] 落后 ${to - from + 1} 块，超过单次上限 ${MAX_BLOCKS_PER_RUN}，跳过中间段从 ${to - MAX_BLOCKS_PER_RUN + 1} 继续`);
        from = to - MAX_BLOCKS_PER_RUN + 1;
    }

    const { found, failedHeights } = await scanRange(from, to);

    // 去重（哈希级）并按高度正序
    const seen = new Set(state.seen || []);
    const fresh = found.filter(t => !seen.has(t.hash));

    for (const tx of fresh) {
        const title = '🚀 有人发币了！Paxi Pump 新订单';
        const desp = [
            `**高度**：${tx.height}`,
            `**收款地址**：${tx.to}`,
            `**服务费**：${tx.amount}`,
            `**交易哈希**：${tx.hash}`,
            `**Memo**：${tx.memo}`
        ].join('\n\n');
        if (!sendKey) {
            console.log(`[未推送·缺SendKey] 高度${tx.height} ${tx.hash} ${tx.amount} memo=${tx.memo}`);
            continue;
        }
        try {
            const r = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, desp })
            });
            const j = await r.json();
            console.log(`[已推送微信] 高度${tx.height} ${tx.hash} -> code=${j.code} ${j.message || ''}`);
        } catch (e) {
            console.error(`[推送失败] ${tx.hash}: ${e.message}`);
        }
        seen.add(tx.hash);
    }

    // 更新状态：seen 只留最近 500 条；
    // 若有区块彻底抓取失败，高度回退到最早的失败块，下一轮自动补扫（哈希去重不会重复推送）
    state.seen = Array.from(seen).slice(-500);
    if (failedHeights.length) {
        const retryFrom = Math.min(...failedHeights) - 1;
        state.lastHeight = Math.max(retryFrom, state.lastHeight);
        console.error(`[注意] ${failedHeights.length} 个区块抓取失败，下次从高度 ${state.lastHeight + 1} 补扫`);
    } else {
        state.lastHeight = to;
    }
    saveJson(STATE_FILE, state);

    console.log(fresh.length
        ? `[结果] 扫描 ${from}-${to}，发现 ${fresh.length} 笔新发币`
        : `[结果] 扫描 ${from}-${to}，无新发币`);
}

main().catch(e => { console.error('[监控异常]', e.message); process.exit(1); });
