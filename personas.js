// Personas: cada uma com UMA conta por rede (cookies) e os seus colaboradores
// do Instagram. Tudo em chrome.storage.local — no navegador, nunca no código.
//
//   personas: { <id>: { nome, colab, contas: { <rede>: {usuario, cookies, salvo_em} } } }
//   persona_ativa: <id>
//
// A 0.4.0 guardava UMA conta por rede em `contas` (e `colab` solto). Na
// primeira leitura isso vira a "Persona 1", para nada se perder.

const SP_COLAB_PADRAO = '@endireitasul, @anothernewsbr';

function _spNovoId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

async function spCarregarPersonas() {
  const s = await chrome.storage.local.get({ personas: null, persona_ativa: null, contas: null, colab: null });
  let personas = s.personas || {};
  let ativa = s.persona_ativa;
  if (!s.personas && (s.contas && Object.keys(s.contas).length)) {
    const id = _spNovoId();
    personas = { [id]: { nome: 'Persona 1', colab: s.colab || SP_COLAB_PADRAO, contas: s.contas } };
    ativa = id;
    await chrome.storage.local.set({ personas, persona_ativa: ativa });
    await chrome.storage.local.remove(['contas', 'colab']);
  }
  if (!personas[ativa]) ativa = Object.keys(personas)[0] || null;
  return { personas, ativa };
}

async function spSalvarPersonas(personas, ativa) {
  await chrome.storage.local.set({ personas, persona_ativa: ativa });
}

/** Nome repetido confunde a hora de publicar ("qual das duas Vox?"). */
function spValidarNome(personas, nome, ignorarId) {
  const n = String(nome || '').trim();
  if (!n) throw new Error('dê um nome à persona');
  if (n.length > 60) throw new Error('nome longo demais (até 60 caracteres)');
  const igual = Object.entries(personas).find(([id, p]) => id !== ignorarId && p.nome.toLowerCase() === n.toLowerCase());
  if (igual) throw new Error(`já existe uma persona chamada «${igual[1].nome}»`);
  return n;
}

function spCriarPersona(personas, nome) {
  const id = _spNovoId();
  personas[id] = { nome: spValidarNome(personas, nome), colab: '', contas: {} };
  return id;
}
