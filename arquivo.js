// Trazer a mídia para o painel: do computador OU de um link.
//
// O link existe por causa do Grok: ele GERA o vídeo, e o que sai de lá é um
// endereço, não um arquivo na pasta de alguém. A extensão baixa e anexa.

/** Acima disto o arquivo ainda vai, mas com aviso: ele atravessa até a aba da
 * rede como texto (base64, ~33% maior) dentro da memória do navegador. */
const SP_LIMITE_AVISO_MB = 60;

const SP_TIPOS = {
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};

function spBlobParaBase64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** Tipo pelo cabeçalho; se o servidor não disser, pela extensão do link. */
function spTipoDaMidia(tipoServidor, url) {
  const t = String(tipoServidor || '').split(';')[0].trim().toLowerCase();
  if (SP_TIPOS[t]) return t;
  const ext = (String(url).split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1];
  const porExt = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', jpg: 'image/jpeg',
                   jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  return porExt[(ext || '').toLowerCase()] || '';
}

/** Nome do arquivo: o do link, se tiver um; senão "midia.<ext>". */
function spNomeDaMidia(url, tipo) {
  const ultimo = decodeURIComponent(String(url).split(/[?#]/)[0].split('/').pop() || '');
  if (/\.[a-z0-9]{2,5}$/i.test(ultimo)) return ultimo.slice(0, 120);
  return 'midia.' + (SP_TIPOS[tipo] || 'bin');
}

/** Baixa o link e devolve {nome, tipo, tamanho, b64}. Recusa o que não é
 * imagem nem vídeo — anexar uma página de erro como "vídeo" sairia publicado
 * quebrado sem ninguém ver. */
async function spBaixarLink(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error('o link precisa começar com http:// ou https://');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`o link respondeu ${r.status}`);
  const blob = await r.blob();
  const tipo = spTipoDaMidia(blob.type || r.headers.get('content-type'), url);
  if (!tipo) throw new Error(`o link não trouxe imagem nem vídeo (veio "${blob.type || 'sem tipo'}")`);
  return { nome: spNomeDaMidia(url, tipo), tipo, tamanho: blob.size, b64: await spBlobParaBase64(blob) };
}

/** Arquivo escolhido no computador, no mesmo formato. */
async function spLerArquivo(arquivo) {
  return { nome: arquivo.name, tipo: arquivo.type || spTipoDaMidia('', arquivo.name),
           tamanho: arquivo.size, b64: await spBlobParaBase64(arquivo) };
}

/** O CDP recebe caminhos do disco, não File/base64. Guarda uma cópia no
 * computador DESTE Chrome (também funciona quando ele roda na nuvem).
 * Não apaga a cópia: o site pode continuar lendo-a depois de preparar. */
async function spArquivoNativo(midia) {
  // Cópia já feita (outra rede da mesma leva): confere de novo no chrome.downloads
  // — o arquivo pode ter sido apagado ou ainda estar sendo escrito.
  if (midia.caminho && midia.downloadId != null && chrome.downloads) {
    const [d] = await chrome.downloads.search({ id: midia.downloadId });
    if (d && d.state === 'complete' && d.exists !== false && d.filename === midia.caminho
        && (midia.tamanho == null || d.fileSize === midia.tamanho)) return midia.caminho;
    midia.caminho = null; midia.downloadId = null;   // refaz a cópia
  }
  if (midia.caminho) return midia.caminho;
  if (!chrome.downloads) throw new Error('recarregue a extensão e permita downloads para anexar o arquivo nativo no X');
  const bytes = Uint8Array.from(atob(midia.b64), c => c.charCodeAt(0));
  if (!bytes.length || (midia.tamanho != null && midia.tamanho !== bytes.length)) {
    throw new Error('o tamanho da mídia mudou ao decodificar o base64 — nada foi anexado');
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: midia.tipo }));
  try {
    const nome = String(midia.nome || 'video.mp4').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '') || 'video.mp4';
    const id = await chrome.downloads.download({ url, filename: 'SocialPUB/' + Date.now() + '-' + nome,
      saveAs: false, conflictAction: 'uniquify' });
    const fim = Date.now() + 60000;
    while (Date.now() < fim) {
      const [d] = await chrome.downloads.search({ id });
      if (!d || d.state === 'interrupted') throw new Error('a cópia local da mídia foi interrompida');
      if (d.state === 'complete') {
        const esperado = midia.tamanho != null ? midia.tamanho : bytes.length;
        if (!d.filename || d.fileSize !== esperado || d.fileSize !== bytes.length) {
          throw new Error(`a cópia local da mídia não confere com o arquivo original (${d.fileSize} de ${esperado} bytes)`);
        }
        midia.caminho = d.filename;
        midia.downloadId = id;
        return midia.caminho;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    await chrome.downloads.cancel(id).catch(() => {});
    throw new Error('a cópia local da mídia não terminou em 60s');
  } finally { URL.revokeObjectURL(url); }
}
