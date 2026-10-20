/* 检查 paxi-suite 所有脚本的顶层声明是否跨文件冲突（浏览器按序加载同名 const/function 会互相覆盖或报错） */
const fs = require('fs');
const path = require('path');

const SUITE = path.join(__dirname, '..');
const scripts = [
  'shared.js', 'compat.js', 'decoder-core.js',
  'appjs/core.js',
  'appjs/tools/batch-transfer.js', 'appjs/tools/balance-check.js', 'appjs/tools/tx-gas.js',
  'appjs/tools/address-convert.js', 'appjs/tools/validator-compare.js', 'appjs/tools/redelegate.js',
  'appjs/tools/proposal.js', 'appjs/tools/decoder.js', 'appjs/tools/pump.js', 'appjs/tools/burn.js',
  'appjs/tools/nft-launcher.js', 'appjs/tools/my-nfts.js', 'app.js',
  'appjs/tools/claim-rewards.js', 'appjs/tools/gov-vote.js', 'appjs/tools/stake-manage.js',
  'appjs/tools/address-book.js', 'appjs/tools/ibc-query.js', 'appjs/tools/tx-dryrun.js',
  'appjs/tools/allowance.js', 'appjs/tools/swap.js',
];

const decls = new Map();  // name -> file
let conflicts = 0;

for (const f of scripts) {
  const src = fs.readFileSync(path.join(SUITE, f), 'utf8');
  // 顶层声明：行首 const/let/var/function（粗粒度，足够抓合并冲突）
  const re = /^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm;
  for (const m of src.matchAll(re)) {
    const name = m[1];
    // IIFE 内部的声明不会匹配 ^（除非代码格式异常），这里取行首的才算
    if (decls.has(name)) {
      console.log(`  CONFLICT  ${name}  ${decls.get(name)} <-> ${f}`);
      conflicts++;
    } else {
      decls.set(name, f);
    }
  }
}

console.log(`\n顶层声明总数: ${decls.size}`);
console.log(conflicts ? `冲突 ${conflicts} 处 ← 需修复` : '无跨文件声明冲突 ✓');
process.exit(conflicts ? 1 : 0);
