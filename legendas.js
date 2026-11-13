// Legendas escritas FORA (Grok, ChatGPT…), uma seção por rede — o mesmo
// formato e as mesmas regras do `legendas.py` do app:
//
//     === INSTAGRAM (Reels) ===
//     Texto da legenda, com as linhas em branco que ele quiser.
//
//     === X ===
//     Outro texto.
//
// NADA É DESCARTADO EM SILÊNCIO: rede desconhecida, seção vazia ou repetida,
// rede em que a extensão não publica e legenda acima do limite viram AVISO.
// Arquivo escrito por modelo erra nome, e "importei 4 de 5" sem dizer qual
// sumiu é pior que um erro.

const _SP_CABECALHO = /^\s*={2,}\s*(.+?)\s*={2,}\s*$/;

// Como o modelo escreve o nome → o id da rede. O inglês entra porque modelo
// escreve em inglês sem avisar.
const _SP_APELIDOS = {
  'x': 'x', 'twitter': 'x', 'x twitter': 'x',
  'instagram': 'instagram', 'ig': 'instagram', 'insta': 'instagram',
  'facebook': 'facebook', 'fb': 'facebook', 'face': 'facebook',
  'threads': 'threads',
  'tiktok': 'tiktok', 'tik tok': 'tiktok',
  'youtube': 'youtube', 'yt': 'youtube', 'youtube shorts': 'youtube',
  'kwai': 'kwai',
  'telegram': 'telegram',
};

/** Minúsculo, sem acento e sem pontuação: 'X (Twitter)', 'x' e 'TWITTER'
 * caem todos no mesmo lugar. */
function _spChave(t) {
  return String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim().toLowerCase();
}

/** 'INSTAGRAM (Reels)' → 'instagram'; null se não reconhecer. O parêntese
 * (destino) não importa aqui: a receita de cada rede já diz o que cobre. */
function _spRedeDoCabecalho(titulo) {
  const m = titulo.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const nome = m ? m[1] : titulo;
  // "X (Twitter)": o parêntese É o nome — tenta os dois juntos antes de desistir
  return _SP_APELIDOS[_spChave(nome)] || _SP_APELIDOS[_spChave(titulo)] || null;
}

/** Texto do arquivo → {legendas: {rede: texto}, avisos: [...], secoes: n}.
 * `redesComConta` (opcional) só AVISA da rede que a persona não tem. */
function spImportarLegendas(texto, redesComConta) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
  const blocos = [];
  let atual = null;
  for (const linha of linhas) {
    const m = linha.match(_SP_CABECALHO);
    if (m) { atual = { titulo: m[1], corpo: [] }; blocos.push(atual); }
    else if (atual) atual.corpo.push(linha);
    // antes do primeiro cabeçalho é preâmbulo do modelo ("aqui estão:") — fora
  }
  const legendas = {}, avisos = [];
  for (const b of blocos) {
    const rede = _spRedeDoCabecalho(b.titulo);
    const corpo = b.corpo.join('\n').trim();
    if (!rede) { avisos.push(`não reconheci a rede «${b.titulo.slice(0, 40)}» — essa seção ficou de fora`); continue; }
    if (!RECEITAS[rede]) { avisos.push(`a extensão não publica no ${rede} — a seção ficou de fora`); continue; }
    const nome = RECEITAS[rede].nome;
    if (!corpo) { avisos.push(`a seção do ${nome} veio vazia`); continue; }
    if (legendas[rede] != null) avisos.push(`o ${nome} aparece duas vezes; fiquei com a última`);
    legendas[rede] = corpo;
    if (redesComConta && !redesComConta.includes(rede)) avisos.push(`o arquivo traz ${nome}, mas esta persona não tem conta lá`);
    const max = RECEITAS[rede].legenda_max;
    if (corpo.length > max) avisos.push(`a legenda do ${nome} tem ${corpo.length} caracteres e o limite é ${max} — encurte, ou essa rede não será preparada`);
  }
  if (!blocos.length) avisos.push('não achei nenhum cabeçalho «=== REDE ===» no arquivo');
  return { legendas, avisos, secoes: blocos.length };
}

/** O texto para colar no modelo, para ele devolver no formato certo — com o
 * limite de cada rede, a informação que o modelo não tem e que faz a legenda
 * voltar grande demais. */
function spBriefing(redes) {
  const l = [
    'Escreva a legenda desta publicação para cada rede abaixo.',
    '',
    'Responda SÓ no formato, sem comentários antes ou depois:',
    '',
    '=== NOME DA REDE ===',
    'texto da legenda',
    '',
    'Respeite o limite de caracteres de cada uma:',
    '',
  ];
  for (const id of redes) l.push(`- ${RECEITAS[id].nome}: até ${RECEITAS[id].legenda_max} caracteres`);
  l.push('', 'Assunto: ');
  return l.join('\n');
}
