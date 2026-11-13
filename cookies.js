// Contas por cookies: UMA conta por rede, para logar o navegador sem senha.
//
// Os cookies vêm do Cookie-Editor (exportar → JSON) aberto na página DA REDE,
// logada. Ficam guardados só aqui, em chrome.storage.local (no perfil do
// navegador) — nunca no código, nunca no GitHub. "Entrar" APAGA a sessão que
// estiver no navegador para aquela rede e grava a da conta guardada: uma conta
// por rede, sem misturar.

/** Domínios por rede, e os cookies que de fato autenticam (aviso se faltarem).
 * Os do app (`redes.py`), com UMA diferença: o Threads lá inclui
 * instagram.com, e aqui não — apagar a sessão do Threads deslogaria o
 * Instagram. */
const SP_COOKIES = {
  x:         { dominios: ['x.com', 'twitter.com'], chaves: ['auth_token', 'ct0'] },
  instagram: { dominios: ['instagram.com'], chaves: ['sessionid'] },
  tiktok:    { dominios: ['tiktok.com'], chaves: ['sessionid', 'sid_tt'] },
  threads:   { dominios: ['threads.com', 'threads.net'], chaves: ['sessionid'] },
  facebook:  { dominios: ['facebook.com'], chaves: ['c_user', 'xs'] },
};

function _spDoDominio(dominioCookie, dominios) {
  const d = String(dominioCookie || '').replace(/^\./, '').toLowerCase();
  return dominios.some(x => d === x || d.endsWith('.' + x));
}

/** Texto colado → lista de cookies daquela rede.
 * Aceita o JSON do Cookie-Editor (lista) ou o cabeçalho "a=1; b=2". */
function spLerCookies(texto, rede) {
  const cfg = SP_COOKIES[rede];
  const t = String(texto || '').trim();
  if (!t) throw new Error('cole os cookies primeiro');
  let lista;
  if (t.startsWith('[') || t.startsWith('{')) {
    let j;
    try { j = JSON.parse(t); } catch (e) { throw new Error('o JSON não abriu: ' + e.message); }
    lista = Array.isArray(j) ? j : (Array.isArray(j.cookies) ? j.cookies : [j]);
  } else {
    // cabeçalho: sem domínio → o principal da rede, para o site inteiro
    lista = t.split(';').map(p => p.trim()).filter(p => p.includes('=')).map(p => {
      const i = p.indexOf('=');
      return { name: p.slice(0, i).trim(), value: p.slice(i + 1).trim(), domain: '.' + cfg.dominios[0] };
    });
  }
  const agora = Date.now() / 1000;
  const daRede = lista.filter(c => c && c.name && _spDoDominio(c.domain || ('.' + cfg.dominios[0]), cfg.dominios))
    .filter(c => !(c.expirationDate && c.expirationDate < agora));
  if (!daRede.length) {
    throw new Error(`nenhum cookie de ${cfg.dominios.join(' / ')} no que foi colado — exporte com o Cookie-Editor na página DA REDE, logada`);
  }
  const nomes = new Set(daRede.map(c => c.name));
  return { cookies: daRede, faltando: cfg.chaves.filter(k => !nomes.has(k)) };
}

/** Um cookie do Cookie-Editor → os detalhes do chrome.cookies.set.
 * `__Secure-` exige secure; `__Host-` exige secure, path "/" e SEM domínio
 * (o navegador recusa o que viole — lição do Google no app, 05/11). */
function spParaChrome(c, rede) {
  const cfg = SP_COOKIES[rede];
  const dominio = String(c.domain || ('.' + cfg.dominios[0]));
  const host = dominio.replace(/^\./, '');
  const nome = String(c.name);
  const d = {
    url: 'https://' + host + (c.path || '/'),
    name: nome,
    value: String(c.value == null ? '' : c.value),
    path: c.path || '/',
    secure: c.secure !== false,
    httpOnly: !!c.httpOnly,
  };
  const ss = String(c.sameSite || '').toLowerCase();
  d.sameSite = ss === 'no_restriction' || ss === 'none' ? 'no_restriction'
    : ss === 'strict' ? 'strict' : ss === 'lax' ? 'lax' : 'unspecified';
  if (d.sameSite === 'no_restriction') d.secure = true;
  if (!c.hostOnly && !nome.startsWith('__Host-')) d.domain = dominio.startsWith('.') ? dominio : '.' + dominio;
  if (nome.startsWith('__Secure-')) d.secure = true;
  if (nome.startsWith('__Host-')) { d.secure = true; d.path = '/'; d.url = 'https://' + host + '/'; }
  if (c.expirationDate && !c.session) d.expirationDate = Math.floor(c.expirationDate);
  return d;
}

/** Apaga a sessão da rede no navegador e grava a da conta. Um cookie recusado
 * não leva os outros junto: é gravado um a um e o recusado é NOMEADO. */
async function spEntrar(rede, cookies) {
  const cfg = SP_COOKIES[rede];
  let apagados = 0;
  for (const dom of cfg.dominios) {
    for (const c of await chrome.cookies.getAll({ domain: dom })) {
      const host = c.domain.replace(/^\./, '');
      await chrome.cookies.remove({ url: (c.secure ? 'https://' : 'http://') + host + c.path, name: c.name, storeId: c.storeId });
      apagados++;
    }
  }
  const recusados = [];
  let gravados = 0;
  for (const c of cookies) {
    try {
      const r = await chrome.cookies.set(spParaChrome(c, rede));
      if (r) gravados++; else recusados.push({ name: c.name, motivo: 'o navegador recusou' });
    } catch (e) {
      recusados.push({ name: c.name, motivo: String(e && e.message ? e.message : e).slice(0, 110) });
    }
  }
  return { apagados, gravados, recusados };
}
