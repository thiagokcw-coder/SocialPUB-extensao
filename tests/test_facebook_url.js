// node tests/test_facebook_url.js
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'personas.js'), 'utf8'));

(async () => {
  for (const value of ['', 'inválido', 'https://www.facebook.com/',
    'http://www.facebook.com/pagina', 'https://facebook.com.exemplo.org/pagina',
    'https://example.org/pagina', 'https://user:password@www.facebook.com/pagina',
    'https://www.facebook.com/login', 'https://www.facebook.com/l.php?u=outro',
    'https://www.facebook.com/groups/123']) assert.throws(() => spUrlPaginaFacebook(value));
  assert.equal(spUrlPaginaFacebook(' https://www.facebook.com/pagina.exemplo#info '), 'https://www.facebook.com/pagina.exemplo');
  assert.equal(spUrlPaginaFacebook('https://www.facebook.com/profile.php?id=123'), 'https://www.facebook.com/profile.php?id=123');

  let saved = {};
  global.chrome = {storage: {local: {
    set: async s => { saved = structuredClone(s); },
    get: async defaults => ({...defaults, ...structuredClone(saved)}),
  }}};
  const personas = {};
  const a = spCriarPersona(personas, 'Página A');
  const b = spCriarPersona(personas, 'Página B');
  personas[a].facebook_pagina_url = spUrlPaginaFacebook('https://www.facebook.com/pagina.a');
  personas[b].facebook_pagina_url = spUrlPaginaFacebook('https://www.facebook.com/pagina.b');
  await spSalvarPersonas(personas, b);
  const restored = await spCarregarPersonas();
  assert.equal(restored.ativa, b);
  assert.equal(restored.personas[a].facebook_pagina_url, 'https://www.facebook.com/pagina.a');
  assert.equal(restored.personas[b].facebook_pagina_url, 'https://www.facebook.com/pagina.b');
  console.log('OK: validação de links e persistência isolada por persona');
})().catch(e => { console.error(e); process.exitCode = 1; });
