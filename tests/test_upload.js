// node tests/test_upload.js — relógio controlado, sem abrir redes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'motor.js'), 'utf8'));

(async () => {
  let now = 0;
  const logs = [];
  const options = {
    agora: () => now, pausa: async ms => { now += ms; }, log: s => logs.push(s),
    ler: async () => ({ percentual: 0, texto: 'Uploading (0%)' }),
    botao: async () => ({ habilitado: false }),
  };
  await assert.rejects(spVigiarUpload(options), /0% por 30s/);
  assert.equal(now, 30000);
  assert.equal(logs.length, 1);

  now = 0; logs.length = 0;
  await spVigiarUpload({ ...options,
    ler: async () => ({ percentual: now < 29000 ? 0 : now < 60000 ? 50 : 100,
      texto: now < 29000 ? 'Uploading (0%)' : now < 60000 ? 'Uploading (50%)' : 'Uploading (100%)' }),
    botao: async () => ({ habilitado: now >= 60000 }),
  });
  assert.equal(now, 60000);
  assert.equal(logs.length, 3);

  now = 0;
  await assert.rejects(spVigiarUpload({ ...options,
    ler: async () => ({ percentual: null, texto: '' }),
  }), /180s/);
  assert.equal(now, 180000);

  now = 0;
  await spVigiarUpload({ ...options, ler: async () => ({percentual: null, texto: ''}),
    botao: async () => ({habilitado: true}) });
  assert.equal(now, 0);
  console.log('OK: 0% por 30s, progresso, prazo de 180s e upload concluído');
})().catch(e => { console.error(e); process.exitCode = 1; });
