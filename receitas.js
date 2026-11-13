// Receitas por rede — os MESMOS passos e seletores do `publicador.py` do
// SocialPUB, traduzidos para o formato que o navegador entende (ver pagina.js:
// string CSS, ou {css, texto|contem|filhoTexto}).
//
// Nenhuma receita clica em publicar. `publicar` serve só para CONFERIR que a
// tela chegou ao ponto de publicar.
//
// `aceita`: o que cada receita cobre. Não é o que a rede aceita — é o que foi
// MEDIDO. O Instagram só tem o fluxo do Reel medido; foto e story ficam de fora
// em vez de clicar Avançar numa tela que ninguém leu.
const RECEITAS = {
  x: {
    nome: 'X',
    url: 'https://x.com/compose/post',
    aceita: ['imagem', 'video', 'texto'],
    legenda_max: 280,
    medido_em: '2026-10-23 (app) · 2026-11-13 (extensão)',
    // ⚠ `fileInput` e `tweetTextarea_0` aparecem DUAS vezes: o compositor do
    // modal e o da linha do tempo atrás. O do diálogo vem primeiro.
    arquivo: ['[role=dialog] input[data-testid="fileInput"]', 'input[data-testid="fileInput"]'],
    legenda: ['[role=dialog] div[data-testid="tweetTextarea_0"]', 'div[data-testid="tweetTextarea_0"]'],
    anexos: ['[role=dialog] [data-testid="attachments"]', '[data-testid="attachments"]'],
    publicar: ['[role=dialog] button[data-testid="tweetButton"]', 'button[data-testid="tweetButton"]',
               'button[data-testid="tweetButtonInline"]'],
  },

  instagram: {
    nome: 'Instagram (Reel)',
    url: 'https://www.instagram.com/',
    aceita: ['video'],
    legenda_max: 2200,
    medido_em: '2026-11-09 (app, Chrome)',
    // «Criar» abre um SUBMENU (Postar · Vídeo ao vivo · Anúncio); só «Postar»
    // leva ao diálogo. Texto EXATO: «Vídeo ao vivo» não pode ser clicado.
    abrir: {
      clicar: ['a:has(svg[aria-label="Novo post"])', { css: 'a', contem: 'Criar' }],
      menu: [{ css: '[role="menuitem"]', texto: 'Postar' }, { css: 'a', texto: 'Postar' },
             { css: 'div[role="button"]', texto: 'Postar' }, { css: 'span', texto: 'Postar' }],
      esperar: ['[role="dialog"][aria-label="Criar novo post"]'],
    },
    arquivo: ['[role="dialog"][aria-label="Criar novo post"] input[type="file"][accept*="video/mp4"]',
              '[role="dialog"][aria-label="Criar novo post"] input[type="file"]'],
    depois_do_arquivo: ['[role="dialog"][aria-label="Cortar"]'],
    espera_arquivo_s: 60,
    passos: [
      // aviso «posts de vídeo são compartilhados como reels» — só às vezes
      { id: 'aviso_reels', opcional: true, clicar: [{ css: '[role="dialog"] button', texto: 'OK' }], esperar_sumir: true },
      // A tela «Cortar» NASCE em 1:1: sem isto o Reel sai quadrado (medido em
      // 09/11). «Original» mantém a proporção do vídeo.
      { id: 'abrir_corte',
        clicar: ['[role="dialog"][aria-label="Cortar"] button:has(svg[aria-label="Selecionar corte"])',
                 '[role="dialog"] button:has(svg[aria-label="Selecionar corte"])',
                 '[role="dialog"] [aria-label="Selecionar corte"]'],
        esperar: [{ css: '[role="dialog"][aria-label="Cortar"] [role="button"]', texto: 'Original' },
                  { css: '[role="dialog"][aria-label="Cortar"] *', texto: 'Original' }] },
      { id: 'corte_original',
        clicar: [{ css: '[role="dialog"][aria-label="Cortar"] [role="button"]', texto: 'Original' },
                 { css: '[role="dialog"][aria-label="Cortar"] *', texto: 'Original' }] },
      { id: 'cortar', clicar: [{ css: '[role="dialog"][aria-label="Cortar"] *', texto: 'Avançar' }],
        esperar: ['[role="dialog"][aria-label="Editar"]'] },
      { id: 'editar', clicar: [{ css: '[role="dialog"][aria-label="Editar"] *', texto: 'Avançar' }],
        esperar: ['div[aria-label="Adicione uma legenda..."]', '[role="dialog"][aria-label="Criar novo post"] div[role="textbox"]'] },
    ],
    legenda: ['div[aria-label="Adicione uma legenda..."]',
              '[role="dialog"][aria-label="Criar novo post"] div[role="textbox"]'],
    // Convite de collab. O CAMPO é medido (09/11); a LISTA de sugestões não —
    // o @ é casado por texto exato e só dentro do diálogo (o feed atrás pode ter
    // post da mesma conta). `{u}` vira o @ na hora.
    colaboradores: {
      campo: ['[role="dialog"][aria-label="Criar novo post"] input[name="creation-collaborator-input"]',
              '[role="dialog"] input[name="creation-collaborator-input"]',
              '[role="dialog"] input[placeholder="Adicionar colaboradores"]'],
      sugestao: [{ css: '[role="dialog"] [role="button"]', filhoTexto: '{u}' },
                 { css: '[role="listbox"] *', texto: '{u}' },
                 { css: '[role="dialog"] *', texto: '{u}' }],
    },
    // Há «Compartilhar» no feed, atrás do diálogo: sem a âncora seria o errado.
    publicar: [{ css: '[role="dialog"][aria-label="Criar novo post"] *', texto: 'Compartilhar' }],
  },

  tiktok: {
    nome: 'TikTok',
    url: 'https://www.tiktok.com/tiktokstudio/upload',
    aceita: ['video'],
    legenda_max: 4000,
    medido_em: '2026-10-23 · 2026-11-10 (app)',
    arquivo: ['div[data-e2e="select_video_container"] input[type=file]', 'input[accept*="video"]'],
    // O botão de publicar só nasce quando o vídeo termina de subir.
    depois_do_arquivo: ['button[data-e2e="post_video_button"]'],
    espera_arquivo_s: 300,
    // Aviso de primeiro uso por cima da tela inteira (10/11).
    dispensar: [{ css: 'button', texto: 'Entendi' }, { css: '[role="button"]', texto: 'Entendi' },
                { css: 'button', texto: 'Got it' }],
    dispensar_espera_s: 4,
    // A legenda vem PRÉ-PREENCHIDA com o nome do arquivo: a escrita limpa antes.
    legenda: ['div.caption-editor [contenteditable="true"]', 'div.caption-editor'],
    publicar: ['button[data-e2e="post_video_button"]'],
  },

  threads: {
    nome: 'Threads',
    url: 'https://www.threads.com/',
    aceita: ['imagem', 'video', 'texto'],
    legenda_max: 500,
    medido_em: '2026-11-04 · 2026-11-10 (app)',
    // «Novo post» pode existir OCULTO no Chrome (10/11): só candidato visível.
    abrir: {
      clicar: [{ css: 'div[role="button"]', texto: 'Criar' }, '[role="button"][aria-label="Novo post"]',
               { css: 'div[role="button"]', texto: 'Novo post' },
               '[aria-label="Corpo da coluna"] div[role="button"][aria-label^="Campo de texto"]'],
      esperar: ['[role="dialog"] div[role="textbox"]'],
    },
    arquivo: ['[role="dialog"] input[type="file"][accept*="image"]', '[role="dialog"] input[type="file"]'],
    legenda: ['[role="dialog"] div[role="textbox"]'],
    publicar: [{ css: '[role="dialog"] div[role="button"]', texto: 'Postar' },
               { css: '[role="dialog"] div[role="button"]', texto: 'Post' }],
  },

  facebook: {
    nome: 'Facebook',
    url: 'https://www.facebook.com/post/create',
    aceita: ['imagem', 'video', 'texto'],
    legenda_max: 63206,
    medido_em: '2026-10-23 (app)',
    arquivo: ['input[type="file"][accept*="image"]', 'input[type="file"]'],
    // Duas telas de chegada: vídeo vira «Criar reel» (Postar), imagem fica no
    // post (Publicar). Escrever durante a troca seria escrever no DOM que sai.
    depois_do_arquivo: ['div[aria-label="Postar"]', { css: 'div[role="button"]', texto: 'Postar' },
                        'div[aria-label="Publicar"]'],
    espera_arquivo_s: 120,
    // Sem data-testid; o aria-label do editor tem o nome da conta. Sobra o papel.
    legenda: ['div[role="textbox"][contenteditable="true"]', 'div[role="textbox"]'],
    publicar: ['div[aria-label="Publicar"]', 'div[aria-label="Post"]', 'div[aria-label="Postar"]',
               { css: 'div[role="button"]', texto: 'Postar' }, { css: 'div[role="button"]', texto: 'Post' }],
  },
};

const ORDEM_REDES = ['x', 'instagram', 'tiktok', 'threads', 'facebook'];
