// node tests/test_abrir_conta_motor.js — publicar abre a conta como «Abrir conta» e depois a tela de criar.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let abas = {}, proximo = 1, criadas = [], navegadas = [];
global.chrome = { tabs: {
  create: async ({ url }) => { const id = proximo++; abas[id] = { id, url, status: 'loading', lidas: 0 }; criadas.push(url); return { id }; },
  get: async id => { const t = abas[id]; if (++t.lidas >= 2) t.status = 'complete'; return { ...t }; },
  update: async (id, { url }) => { Object.assign(abas[id], { url, status: 'loading', lidas: 0 }); navegadas.push(url); return {}; },
} };
global.setTimeout = (cb) => { queueMicrotask(cb); return 0; };
global.clearTimeout = () => {};
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'cookies.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'motor.js'), 'utf8'));

(async () => {
  const logs = [];
  // X: conta em x.com/, depois /compose/post na MESMA aba.
  let id = await _motorAbrirConta(SP_URL_CONTA.x, 'https://x.com/compose/post', s => logs.push(s));
  assert.deepEqual(criadas, ['https://x.com/']);
  assert.deepEqual(navegadas, ['https://x.com/compose/post']);
  assert.equal(abas[id].url, 'https://x.com/compose/post');
  assert.equal(abas[id].status, 'complete');
  assert.ok(logs.some(l => /como «Abrir conta»/.test(l)));

  // Instagram: o endereço da conta já é o de começar — uma aba, sem navegar.
  criadas = []; navegadas = [];
  await _motorAbrirConta(SP_URL_CONTA.instagram, 'https://www.instagram.com/', () => {});
  assert.deepEqual(criadas, ['https://www.instagram.com/']);
  assert.deepEqual(navegadas, []);

  // Sem urlConta (ex.: rede pulada): abre direto, como antes.
  criadas = [];
  await _motorAbrirConta(undefined, 'https://www.threads.com/', () => {});
  assert.deepEqual(criadas, ['https://www.threads.com/']);
  console.log('OK: publicar abre a conta como «Abrir conta» e segue para a tela de criar na mesma aba');
})().catch(e => { console.error(e); process.exitCode = 1; });
