const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const closed = [], logs = [];
const ctx = vm.createContext({ setTimeout, clearTimeout, URL, chrome: {
  tabs: { query: async () => [{id:1},{id:2},{id:3}], remove: async id => closed.push(id) },
  storage: {session: {get: async () => ({facebookAbaMotor:1})}}
}});
vm.runInContext(fs.readFileSync('motor.js','utf8'), ctx);
ctx._motorNaAba = async id => id === 2;
(async () => {
  await ctx._motorLimparFacebook(s => logs.push(s));
  assert.deepEqual(closed, [1,2]);
  assert(logs.some(s => s.includes('sem publicar')));
  await assert.rejects(ctx._motorPrazo(new Promise(()=>{}), 'teste', 5), /tempo limite/);
  ctx.chrome.tabs.query = async () => { throw new Error('aba inacessível'); };
  await assert.rejects(ctx._motorLimparFacebook(()=>{}), /aba inacessível/);
  console.log('OK: limpeza descarta abas anteriores, preserva aba limpa e propaga falhas; prazo interrompe espera');
})().catch(e => { console.error(e); process.exitCode = 1; });
