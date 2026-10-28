#!/usr/bin/env node
// ============================================================
// pump-watch-server.js —— Paxi Pump 发币监控（云端常驻版）
// 作为单端口 HTTP 服务常驻运行：进程一直活着，内部每 10 分钟
// 自动扫描一次 Paxi 链，发现有人用 pump 发币即推微信（Server酱）。
// 不依赖本机开关机，部署到云端即可 7x24 运行。
//
// 配置 sendKey（二选一）：
//   1) 环境变量 PUMP_WATCH_SENDKEY=SCTxxxx
//   2) 部署后执行一次：curl -X POST <网址>/config -H 'Content-Type: application/json' -d '{"sendKey":"SCTxxxx"}'
// 状态（上次高度 + 已推送哈希 + sendKey）持久化在 pump-state.json
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const LCD = 'https://mainnet-lcd.paxinet.io';
// 收款地址：与 dApp 统一为单一平台收款地址 CONFIG.feeCollector
const FEE_RECEIVERS = new Set([
    "paxi1ga6x5ljj547ax436sfc5kw6fn3vfdwqtn0kpwg"
]);
const MAX_BLOCKS_PER_RUN = 3000;   // 单次最多扫描的区块数（停机太久时跳过中间段）
const CONCURRENCY = 6;             // 并发抓取区块数（太高会触发节点 503 限流）
const SCAN_INTERVAL_MS = (Number(process.env.PUMP_WATCH_INTERVAL) || 5) * 60 * 1000; // 默认每 5 分钟扫一次（可用环境变量 PUMP_WATCH_INTERVAL 覆盖，单位：分钟）

const STATE_FILE = process.env.PUMP_WATCH_STATE || path.join(__dirname, 'pump-state.json');

function loadState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return {}; }
}
function saveState(s) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
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

let lastScan = { at: 0, scanned: '0-0', found: 0, pushed: 0, error: null };

async function runScan() {
    const state = loadState();
    const sendKey = (state.sendKey || process.env.PUMP_WATCH_SENDKEY || '').trim();
    const result = { scanned: '0-0', found: 0, pushed: 0, error: null };
    try {
        const latest = await getLatestHeight();
        // 首次运行：只记录基线高度，不回溯历史
        if (!state.lastHeight) {
            saveState({ ...state, lastHeight: latest, seen: [] });
            console.log(`[首次运行] 已建立基线高度 ${latest}，本次不推送`);
            lastScan = { at: Date.now(), scanned: `${latest}-${latest}`, found: 0, pushed: 0, error: 'baseline' };
            return lastScan;
        }

        let from = state.lastHeight + 1;
        let to = latest;
        if (to < from) {
            console.log('[结果] 无新区块');
            lastScan = { at: Date.now(), scanned: `${from}-${to}`, found: 0, pushed: 0, error: null };
            return lastScan;
        }
        if (to - from + 1 > MAX_BLOCKS_PER_RUN) {
            console.error(`[警告] 落后 ${to - from + 1} 块，超过单次上限 ${MAX_BLOCKS_PER_RUN}，跳过中间段从 ${to - MAX_BLOCKS_PER_RUN + 1} 继续`);
            from = to - MAX_BLOCKS_PER_RUN + 1;
        }

        const { found, failedHeights } = await scanRange(from, to);
        const seen = new Set(state.seen || []);
        const fresh = found.filter(t => !seen.has(t.hash));

        let pushed = 0;
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
                console.log(`[未推送·缺SendKey] 高度${tx.height} ${tx.hash} ${tx.amount}`);
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
                pushed++;
            } catch (e) {
                console.error(`[推送失败] ${tx.hash}: ${e.message}`);
            }
            seen.add(tx.hash);
        }

        state.seen = Array.from(seen).slice(-500);
        if (failedHeights.length) {
            const retryFrom = Math.min(...failedHeights) - 1;
            state.lastHeight = Math.max(retryFrom, state.lastHeight);
            console.error(`[注意] ${failedHeights.length} 个区块抓取失败，下次从高度 ${state.lastHeight + 1} 补扫`);
        } else {
            state.lastHeight = to;
        }
        saveState(state);
        console.log(fresh.length
            ? `[结果] 扫描 ${from}-${to}，发现 ${fresh.length} 笔新发币，推送 ${pushed} 条`
            : `[结果] 扫描 ${from}-${to}，无新发币`);
        result.scanned = `${from}-${to}`;
        result.found = fresh.length;
        result.pushed = pushed;
    } catch (e) {
        console.error('[扫描异常]', e.message);
        result.error = e.message;
    }
    lastScan = { at: Date.now(), ...result };
    return lastScan;
}

// ---------------- HTTP 服务 ----------------
const PORT = process.env.PORT || 3000;

function sendJson(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];
    try {
        if (req.method === 'GET' && url === '/health') {
            return sendJson(res, 200, { ok: true });
        }
        if (req.method === 'GET' && url === '/') {
            const state = loadState();
            const hasKey = !!(state.sendKey || process.env.PUMP_WATCH_SENDKEY);
            return sendJson(res, 200, {
                service: 'Paxi Pump 发币监控',
                status: 'running',
                uptimeSec: Math.floor(process.uptime()),
                sendKeySet: hasKey,
                lastScan,
                nextScanInSec: Math.max(0, SCAN_INTERVAL_MS - (Date.now() - lastScan.at)) / 1000
            });
        }
        if (req.method === 'POST' && url === '/config') {
            const body = await readBody(req);
            let parsed;
            try { parsed = JSON.parse(body); } catch (_) { return sendJson(res, 400, { error: 'invalid json' }); }
            const key = String(parsed.sendKey || '').trim();
            if (!/^SCT/.test(key)) return sendJson(res, 400, { error: 'sendKey 必须以 SCT 开头' });
            const state = loadState();
            state.sendKey = key;
            saveState(state);
            return sendJson(res, 200, { ok: true, sendKeySet: true });
        }
        if (req.method === 'POST' && url === '/scan') {
            const r = await runScan();
            return sendJson(res, 200, r);
        }
        return sendJson(res, 404, { error: 'not found' });
    } catch (e) {
        return sendJson(res, 500, { error: e.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PumpWatch] listening on 0.0.0.0:${PORT}，每 ${SCAN_INTERVAL_MS / 60000} 分钟自动扫描一次`);
    runScan().catch(e => console.error('[首次扫描异常]', e.message));
    setInterval(() => runScan().catch(e => console.error('[定时扫描异常]', e.message)), SCAN_INTERVAL_MS);
});
