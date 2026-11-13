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
  // 13/11: 0% → 33% → sem percentual com anexo («processando») → «Ready».
  now = 0; logs.length = 0;
  await spVigiarUpload({ ...options,
    ler: async () => now < 20000 ? { percentual: 0, texto: 'Uploading (0%)', anexo: true }
      : now < 25000 ? { percentual: 33, texto: 'Uploading (33%)', anexo: true }
      : now < 90000 ? { percentual: null, texto: '', anexo: true }
      : { percentual: null, texto: 'video.mp4: Ready', anexo: true, pronto: true },
  });
  assert.equal(now, 90000);
  assert.ok(logs.some(l => /Ready/.test(l)));

  // Depois de andar, voltar a ler 0% não é «parado em 0%».
  now = 0;
  await spVigiarUpload({ ...options,
    ler: async () => now < 5000 ? { percentual: 33, texto: 'Uploading (33%)', anexo: true }
      : now < 70000 ? { percentual: 0, texto: 'Uploading (0%)', anexo: true }
      : { percentual: null, texto: 'video.mp4: Ready', anexo: true, pronto: true },
  }).catch(e => assert.fail('falso negativo: ' + e.message));

  // O relógio dos 30s recomeça quando o percentual muda.
  now = 0;
  await spVigiarUpload({ ...options,
    ler: async () => now < 25000 ? { percentual: 0, texto: 'Uploading (0%)', anexo: true }
      : now < 50000 ? { percentual: 1, texto: 'Uploading (1%)', anexo: true }
      : { percentual: 100, texto: 'Uploading (100%)', anexo: true },
    botao: async () => ({ habilitado: now >= 50000 }),
  });
  assert.equal(now, 50000);

  // «Uploading» sumiu, anexo presente e botão habilitado: sucesso.
  now = 0;
  await spVigiarUpload({ ...options,
    ler: async () => now < 3000 ? { percentual: 50, texto: 'Uploading (50%)', anexo: true } : { percentual: null, texto: '', anexo: true },
    botao: async () => ({ habilitado: now >= 3000 }),
  });
  assert.equal(now, 3000);
  console.log('OK: 0% por 30s, progresso, prazo de 180s, upload concluído, «Ready» e relógio que zera');
})().catch(e => { console.error(e); process.exitCode = 1; });
