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

/** Onde «Abrir conta» abre cada rede — e onde a publicação começa (16/11:
 * publicar abre a conta do MESMO jeito que o botão, e só então vai para a
 * tela de criar). O Facebook usa o link da Página da persona. */
const SP_URL_CONTA = {
  x: 'https://x.com/', instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/', threads: 'https://www.threads.com/',
  facebook: 'https://www.facebook.com/',
};

/** Endereço da conta desta persona. Facebook: o link da Página DA PERSONA
 * (16/11: estava fixo em /uncensoredbrasil e «Abrir conta» de outra persona
 * caía na Página errada); sem link válido, a página inicial. */
function spUrlConta(rede, persona) {
  if (rede === 'facebook' && persona && persona.facebook_pagina_url) {
    try { return spUrlPaginaFacebook(persona.facebook_pagina_url); } catch (_) { /* link inválido: página inicial */ }
  }
  return SP_URL_CONTA[rede];
}

/** O cookie que diz QUAL conta está logada (o número do usuário). */
const SP_ID_CONTA = { x: 'twid', instagram: 'ds_user_id', tiktok: 'uid_tt', threads: 'ds_user_id', facebook: 'c_user' };

/** O usuário de uma lista de cookies, ou '' se não houver. No Facebook a
 * identidade é o perfil (`c_user`) E a Página em uso (`i_user`): duas personas
 * com o mesmo login pessoal e Páginas diferentes NÃO são a mesma conta (16/11:
 * «Abrir conta» de outra persona manteve a Página antiga). */
function spIdConta(rede, cookies) {
  const valor = n => {
    const c = n && (cookies || []).find(k => k && k.name === n && k.value);
    return c ? String(c.value).replace(/^"|"$/g, '') : '';
  };
  const id = valor(SP_ID_CONTA[rede]);
  if (rede === 'facebook' && id) return id + '|' + valor('i_user');
  return id;
}

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

/** TXT multirrede: JSONs concatenados do Cookie-Editor ou Netscape.
 * Não infere rede pelo nome: sessionid, por exemplo, pertence a várias redes.
 * Erros nunca incluem o texto recebido, pois ele contém credenciais. */
function spLerCookiesTodas(texto) {
  const t = String(texto || '').replace(/^\uFEFF/, '').trim();
  if (!t) throw new Error('o arquivo está vazio');
  let lista = [];
  if (/^[\[{]/.test(t)) {
    let inicio = 0;
    while (inicio < t.length) {
      while (/\s/.test(t[inicio] || '') && inicio < t.length) inicio++;
      if (inicio === t.length) break;
      if (!/[\[{]/.test(t[inicio])) throw new Error('TXT inválido: cole somente as exportações JSON, uma após a outra');
      let profundidade = 0, aspas = false, escape = false, fim = inicio;
      for (; fim < t.length; fim++) {
        const c = t[fim];
        if (aspas) {
          if (escape) escape = false;
          else if (c === '\\') escape = true;
          else if (c === '"') aspas = false;
        } else if (c === '"') aspas = true;
        else if (c === '[' || c === '{') profundidade++;
        else if (c === ']' || c === '}') { if (--profundidade === 0) { fim++; break; } }
      }
      let j;
      try { j = JSON.parse(t.slice(inicio, fim)); }
      catch (_) { throw new Error('JSON inválido no TXT; exporte novamente sem editar os valores'); }
      lista.push(...(Array.isArray(j) ? j : Array.isArray(j?.cookies) ? j.cookies : [j]));
      inicio = fim;
    }
  } else {
    for (const [i, linha] of t.split(/\r?\n/).entries()) {
      if (!linha.trim() || (linha.startsWith('#') && !linha.startsWith('#HttpOnly_'))) continue;
      const campos = linha.replace(/^#HttpOnly_/, '').split('\t');
      if (campos.length !== 7 || !/^(TRUE|FALSE)$/i.test(campos[1]) || !/^(TRUE|FALSE)$/i.test(campos[3]) || !/^\d+$/.test(campos[4])) {
        throw new Error(`linha ${i + 1}: use JSON com domain ou Netscape com colunas separadas por tabulação; cabeçalhos name=value sem domínio devem ser colados no campo de cada rede`);
      }
      lista.push({ domain: campos[0], hostOnly: campos[1].toUpperCase() === 'FALSE', path: campos[2],
        secure: campos[3].toUpperCase() === 'TRUE', expirationDate: Number(campos[4]),
        session: campos[4] === '0', name: campos[5], value: campos[6], httpOnly: linha.startsWith('#HttpOnly_') });
    }
  }
  const grupos = {}, ignorados = { outros: 0, expirados: 0, duplicados: 0 };
  for (const c of lista) {
    if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name || typeof c.value !== 'string'
        || typeof c.domain !== 'string' || !/^\.?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(c.domain)) {
      throw new Error('cookie inválido ou sem domínio: cada cookie precisa de domain, name e value em texto');
    }
    const rede = Object.keys(SP_COOKIES).find(id => _spDoDominio(c.domain, SP_COOKIES[id].dominios));
    if (!rede) { ignorados.outros++; continue; }
    const exp = c.expirationDate ?? c.expires;
    if (exp != null && !Number.isFinite(Number(exp))) throw new Error('validade de cookie inválida no TXT');
    if (!c.session && Number(exp) > 0 && Number(exp) < Date.now() / 1000) { ignorados.expirados++; continue; }
    const cookie = { ...c, domain: c.domain.toLowerCase(), path: c.path || '/' };
    if (exp != null && Number(exp) > 0) cookie.expirationDate = Number(exp);
    else { delete cookie.expirationDate; cookie.session = true; }
    const grupo = grupos[rede] ||= new Map();
    const chave = cookie.domain.replace(/^\./, '') + '|' + cookie.path + '|' + cookie.name;
    if (grupo.has(chave)) {
      if (grupo.get(chave).value !== cookie.value) throw new Error(`cookies conflitantes em ${rede}: use apenas uma conta por rede no TXT`);
      ignorados.duplicados++;
    }
    grupo.set(chave, cookie);
  }
  const redes = {};
  for (const [id, grupo] of Object.entries(grupos)) {
    const cookies = [...grupo.values()];
    const nomes = new Set(cookies.map(c => c.name));
    redes[id] = { cookies, faltando: SP_COOKIES[id].chaves.filter(k => !nomes.has(k)) };
  }
  if (!Object.keys(redes).length) throw new Error('nenhum cookie válido das redes suportadas no TXT (verifique domínios e validade)');
  return { redes, ignorados };
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

/** Troca a sessão da rede no navegador pela da conta.
 *
 * ⚠ GRAVA PRIMEIRO, APAGA DEPOIS. A 0.4.0 apagava a sessão anterior e só então
 * gravava — e quando o Chrome recusou os cookies (faltava permissão para
 * `instagram.com` sem o www, 13/11), a rede ficou DESLOGADA: o Instagram abriu
 * na tela de login e o «Criar» não existia. Agora: grava a conta nova (os
 * cookies de mesmo nome são sobrescritos) e só apaga as SOBRAS da sessão
 * anterior se nada foi recusado. Com recusa, não apaga nada.
 *
 * Um cookie recusado não leva os outros junto: é gravado um a um e NOMEADO. */
async function spEntrar(rede, cookies) {
  const cfg = SP_COOKIES[rede];
  // 16/11: o Facebook abriu a Página DESLOGADO com o navegador logado. A
  // sessão salva estava velha (o Facebook renova o `xs`) e sobrescreveu a
  // que valia. Se o navegador JÁ está na MESMA conta, com os cookies que
  // autenticam, não mexe: a sessão viva é a mais nova.
  const id = spIdConta(rede, cookies);
  if (id) {
    const atuais = [];
    for (const dom of cfg.dominios) atuais.push(...await chrome.cookies.getAll({ domain: dom }));
    const nomes = new Set(atuais.filter(c => c.value).map(c => c.name));
    if (spIdConta(rede, atuais) === id && cfg.chaves.every(k => nomes.has(k))) {
      return { apagados: 0, gravados: 0, recusados: [], entrou: true, mantida: true };
    }
  }
  // Guarda a sessão que estava no navegador: se a guardada não valer (a rede
  // abre pedindo senha), o painel devolve esta — 16/11, a troca por uma sessão
  // velha deixou o Facebook deslogado também para a pessoa.
  let anterior = null;
  try { anterior = (await spCapturarSessao(rede)).cookies; } catch (_) { /* não estava logado */ }
  const recusados = [];
  const novos = new Set();
  let gravados = 0;
  for (const c of cookies) {
    const d = spParaChrome(c, rede);
    try {
      const r = await chrome.cookies.set(d);
      if (r) {
        gravados++;
        novos.add(r.name + '|' + String(r.domain || '').replace(/^\./, '') + '|' + r.path);
      } else {
        recusados.push({ name: c.name, motivo: 'o navegador recusou' });
      }
    } catch (e) {
      recusados.push({ name: c.name, motivo: String(e && e.message ? e.message : e).slice(0, 110) });
    }
  }
  let apagados = 0;
  if (!recusados.length) {
    for (const dom of cfg.dominios) {
      for (const c of await chrome.cookies.getAll({ domain: dom })) {
        const host = c.domain.replace(/^\./, '');
        if (novos.has(c.name + '|' + host + '|' + c.path)) continue;
        await chrome.cookies.remove({ url: (c.secure ? 'https://' : 'http://') + host + c.path, name: c.name, storeId: c.storeId });
        apagados++;
      }
    }
  }
  const nomesRecusados = new Set(recusados.map(r => r.name));
  // A conta só "entrou" se gravou algo e NENHUM cookie que autentica foi recusado.
  return { apagados, gravados, recusados, anterior, entrou: gravados > 0 && !cfg.chaves.some(k => nomesRecusados.has(k)) };
}

/** Devolve ao navegador a sessão capturada antes da troca (`spEntrar().anterior`).
 * Tira a que não valeu e grava a anterior, cookie a cookie. */
async function spRestaurarSessao(rede, cookies) {
  if (!cookies || !cookies.length) return { gravados: 0, recusados: 0 };
  await spSairLocal(rede);
  let gravados = 0, recusados = 0;
  for (const c of cookies) {
    try { (await chrome.cookies.set(spParaChrome(c, rede))) ? gravados++ : recusados++; }
    catch (_) { recusados++; }
  }
  return { gravados, recusados };
}

// ── Entrar pela TELA (sem Cookie-Editor) ─────────────────────────────────
//
// A pessoa entra na rede com usuário e senha, neste navegador, e a extensão
// guarda a sessão que ficou nele. A SENHA não passa pela extensão: ela é
// digitada na página da rede e não fica guardada em lugar nenhum.

/** Página de login de cada rede. */
const SP_LOGIN = {
  x:         'https://x.com/i/flow/login',
  instagram: 'https://www.instagram.com/accounts/login/',
  tiktok:    'https://www.tiktok.com/login',
  threads:   'https://www.threads.com/login',
  facebook:  'https://www.facebook.com/login/',
};

/** Tira do NAVEGADOR a sessão da rede, sem avisar o site — para a página de
 * login aparecer em vez da conta que estava aberta.
 *
 * ⚠ NÃO é «Sair». Clicar em «Sair» na rede encerra a sessão NO SERVIDOR, e a
 * persona que tinha essa sessão guardada perderia a conta. Apagar os cookies
 * daqui só esquece a sessão neste navegador: guardada, ela continua valendo. */
async function spSairLocal(rede) {
  const cfg = SP_COOKIES[rede];
  let n = 0;
  for (const dom of cfg.dominios) {
    for (const c of await chrome.cookies.getAll({ domain: dom })) {
      const host = c.domain.replace(/^\./, '');
      await chrome.cookies.remove({ url: (c.secure ? 'https://' : 'http://') + host + c.path, name: c.name, storeId: c.storeId });
      n++;
    }
  }
  return n;
}

/** A sessão da rede que está NO NAVEGADOR agora, no mesmo formato do que vem
 * do Cookie-Editor (o `spEntrar` grava os dois do mesmo jeito).
 * Sem nenhum cookie que autentica = não está logado: recusa, para não guardar
 * uma «conta» que é só a página de login. */
async function spCapturarSessao(rede) {
  const cfg = SP_COOKIES[rede];
  const vistos = new Set();
  const cookies = [];
  for (const dom of cfg.dominios) {
    for (const c of await chrome.cookies.getAll({ domain: dom })) {
      const k = c.name + '|' + c.domain + '|' + c.path;
      if (vistos.has(k)) continue;
      vistos.add(k);
      const o = { domain: c.domain, name: c.name, value: c.value, path: c.path || '/',
                  secure: !!c.secure, httpOnly: !!c.httpOnly, sameSite: c.sameSite || 'unspecified',
                  hostOnly: !!c.hostOnly, session: !!c.session };
      if (c.expirationDate) o.expirationDate = c.expirationDate;
      cookies.push(o);
    }
  }
  const nomes = new Set(cookies.map(c => c.name));
  const faltando = cfg.chaves.filter(k => !nomes.has(k));
  if (faltando.length === cfg.chaves.length) {
    throw new Error(`este navegador não está logado em ${cfg.dominios[0]} (não há ${cfg.chaves.join(' nem ')}) — clique em «Entrar pela tela», entre na conta e depois salve`);
  }
  return { cookies, faltando };
}
