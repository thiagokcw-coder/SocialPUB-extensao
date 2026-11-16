// node tests/test_sessao_mantida.js — spEntrar não sobrescreve a sessão viva da mesma conta.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let jar = [];
let sets = 0;
global.chrome = { cookies: {
  getAll: async ({ domain }) => jar.filter(c => c.domain.replace(/^\./, '').endsWith(domain)),
  set: async d => { sets++; jar = jar.filter(c => c.name !== d.name); const c = { ...d, domain: d.domain || 'www.facebook.com' }; jar.push(c); return c; },
  remove: async ({ name }) => { jar = jar.filter(c => c.name !== name); },
} };
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'cookies.js'), 'utf8'));

(async () => {
  const salva = [{ domain: '.facebook.com', name: 'c_user', value: '123' }, { domain: '.facebook.com', name: 'xs', value: 'velho' }];

  // Mesma conta já logada: mantém (não grava nada; xs novo fica).
  jar = [{ domain: '.facebook.com', name: 'c_user', value: '123', path: '/' }, { domain: '.facebook.com', name: 'xs', value: 'novo', path: '/' }];
  let r = await spEntrar('facebook', salva);
  assert.ok(r.entrou && r.mantida);
  assert.equal(sets, 0);
  assert.equal(jar.find(c => c.name === 'xs').value, 'novo');

  // Outra conta no navegador: troca.
  jar = [{ domain: '.facebook.com', name: 'c_user', value: '999', path: '/' }, { domain: '.facebook.com', name: 'xs', value: 'outro', path: '/' }];
  r = await spEntrar('facebook', salva);
  assert.ok(r.entrou && !r.mantida);
  assert.equal(jar.find(c => c.name === 'c_user').value, '123');

  // Navegador deslogado (sem xs): grava a guardada.
  sets = 0;
  jar = [{ domain: '.facebook.com', name: 'c_user', value: '123', path: '/' }];
  r = await spEntrar('facebook', salva);
  assert.ok(r.entrou && !r.mantida && sets === 2);
  // Mesmo login pessoal (c_user), Página diferente (i_user): NÃO é a mesma conta.
  sets = 0;
  jar = [{ domain: '.facebook.com', name: 'c_user', value: '123', path: '/' }, { domain: '.facebook.com', name: 'xs', value: 'viva', path: '/' },
         { domain: '.facebook.com', name: 'i_user', value: 'paginaA', path: '/' }];
  r = await spEntrar('facebook', [...salva, { domain: '.facebook.com', name: 'i_user', value: 'paginaB' }]);
  assert.ok(r.entrou && !r.mantida && sets === 3);
  assert.equal(jar.find(c => c.name === 'i_user').value, 'paginaB');
  // Mesma Página: mantém.
  r = await spEntrar('facebook', [...salva, { domain: '.facebook.com', name: 'i_user', value: 'paginaB' }]);
  assert.ok(r.mantida);

  // Troca por outra conta guarda a anterior; restaurar devolve a anterior.
  jar = [{ domain: '.facebook.com', name: 'c_user', value: '999', path: '/' }, { domain: '.facebook.com', name: 'xs', value: 'viva', path: '/' }];
  r = await spEntrar('facebook', salva);
  assert.equal(spIdConta('facebook', r.anterior), '999|');
  assert.equal(jar.find(c => c.name === 'xs').value, 'velho');
  await spRestaurarSessao('facebook', r.anterior);
  assert.equal(jar.find(c => c.name === 'c_user').value, '999');
  assert.equal(jar.find(c => c.name === 'xs').value, 'viva');
  console.log('OK: mesma conta mantida, outra conta trocada, navegador deslogado recebe a guardada, sessão anterior restaurada');
})().catch(e => { console.error(e); process.exitCode = 1; });
