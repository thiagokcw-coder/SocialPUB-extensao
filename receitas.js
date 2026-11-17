// Receitas por rede — os MESMOS passos e seletores do `publicador.py` do
// SocialPUB, traduzidos para o formato que o navegador entende (ver pagina.js:
// string CSS, ou {css, texto|contem|filhoTexto}).
//
// `publicar` é o botão final. O motor só clica nele com «Publicar sozinho»
// ligado no painel — e só depois de a legenda conferir. Sem isso, ele serve
// para CONFERIR que a tela chegou ao ponto de publicar.
//
// `confirmar`: pergunta que a rede abre DEPOIS do clique em publicar (TikTok:
// «Continuar publicando?» com a verificação de conteúdo ainda rodando —
// decisão do usuário, 10/11: responder «Publicar agora»).
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
    // O compositor da linha do tempo também tem estes campos. Espere o
    // diálogo abrir e nunca use os campos que ficam atrás dele.
    // `reserva`: no navegador do Grok (16/11, inglês, Linux) a URL
    // /compose/post abriu a linha do tempo SEM o diálogo. Só se o diálogo não
    // aparecer em 20s, clica o «Post» da barra lateral, que abre o mesmo diálogo.
    abrir: { esperar: ['[role=dialog] div[data-testid="tweetTextarea_0"]'],
             reserva: ['a[data-testid="SideNav_NewTweet_Button"]', 'a[href="/compose/post"][aria-label="Post"]',
                       'a[href="/compose/post"][aria-label="Postar"]', 'a[href="/compose/post"]'] },
    arquivo: ['[role=dialog] input[data-testid="fileInput"]'],
    arquivo_nativo: true,
    upload: ['[role=dialog] [data-testid="attachments"]'],
    legenda: ['[role=dialog] div[data-testid="tweetTextarea_0"]'],
    anexos: ['[role=dialog] [data-testid="attachments"]'],
    depois_do_arquivo: ['[role=dialog] [data-testid="attachments"]'],
    espera_arquivo_s: 60,
    publicar: ['[role=dialog] button[data-testid="tweetButton"]'],
  },

  instagram: {
    nome: 'Instagram (Reel)',
    url: 'https://www.instagram.com/',
    aceita: ['video'],
    legenda_max: 2200,
    medido_em: '2026-11-09 (app, Chrome pt-BR) · 2026-11-13 (extensão, navegador do Grok em pt-PT)',
    // ⚠ O IDIOMA MUDA OS NOMES. No Chrome do app o Instagram veio em pt-BR
    // («Novo post», «Criar»); no navegador do Grok veio em pt-PT, MEDIDO pelo
    // diagnóstico de 13/11: o ícone é «Nova publicação», a barra lateral só
    // tem ícones (sem a palavra «Criar») e o resto é «Gosto», «Partilhar»,
    // «Seguinte». Por isso cada nome vai em pt-BR · pt-PT · inglês, e onde dá
    // a âncora NÃO depende de idioma (o diálogo é o que tem o campo de arquivo;
    // a legenda é o textbox do diálogo).
    //
    // MEDIDO em pt-PT: só o ícone «Nova publicação». As telas seguintes em
    // pt-PT («Recortar», «Seguinte», «Escreve uma legenda...», «Partilhar») são
    // ESPERADAS, não medidas: se parar, o diagnóstico diz o nome certo.
    abrir: {
      // Avisos por cima da tela ANTES de criar (16/11: «Ativar notificações»
      // no Instagram). Só a recusa — nunca «Ativar».
      avisos: ['Agora não', 'Not Now', 'Not now', 'Agora não, obrigado', 'Dispensar', 'Dismiss']
        .map(t => ({ css: '[role="dialog"] button, [role="dialog"] [role="button"]', texto: t })),
      clicar: ['a:has(svg[aria-label="Novo post"])', 'a:has(svg[aria-label="Nova publicação"])',
               'a:has(svg[aria-label="New post"])', { css: 'a', contem: 'Criar' }, { css: 'a', contem: 'Create' }],
      // «Criar» abre um SUBMENU (pt-BR: Postar · Vídeo ao vivo · Anúncio); só a
      // primeira opção leva ao diálogo. Texto EXATO: a transmissão ao vivo é
      // vizinha e não pode ser clicada.
      menu: ['Postar', 'Publicação', 'Publicar', 'Post'].flatMap(t => [
        { css: '[role="menuitem"]', texto: t }, { css: 'a', texto: t },
        { css: 'div[role="button"]', texto: t }, { css: 'span', texto: t }]),
      esperar: ['[role="dialog"][aria-label="Criar novo post"]', '[role="dialog"][aria-label="Criar nova publicação"]',
                '[role="dialog"][aria-label="Create new post"]', '[role="dialog"]:has(input[type="file"])'],
    },
    arquivo: ['[role="dialog"] input[type="file"][accept*="video/mp4"]', '[role="dialog"] input[type="file"]'],
    // a tela de corte: a que tem o botão de escolher o corte
    depois_do_arquivo: ['[role="dialog"]:has(svg[aria-label="Selecionar corte"])', '[role="dialog"]:has(svg[aria-label="Selecionar recorte"])',
                        '[role="dialog"]:has(svg[aria-label="Select crop"])', '[role="dialog"][aria-label="Cortar"]',
                        '[role="dialog"][aria-label="Recortar"]', '[role="dialog"][aria-label="Crop"]'],
    espera_arquivo_s: 60,
    passos: [
      // aviso «posts de vídeo são compartilhados como reels» — só às vezes
      { id: 'aviso_reels', opcional: true, clicar: [{ css: '[role="dialog"] button', texto: 'OK' }], esperar_sumir: true },
      // A tela de corte NASCE em 1:1: sem isto o Reel sai quadrado (medido em
      // 09/11). «Original» mantém a proporção do vídeo.
      { id: 'abrir_corte',
        clicar: ['[role="dialog"] button:has(svg[aria-label="Selecionar corte"])', '[role="dialog"] button:has(svg[aria-label="Selecionar recorte"])',
                 '[role="dialog"] button:has(svg[aria-label="Select crop"])', '[role="dialog"] [aria-label="Selecionar corte"]'],
        esperar: [{ css: '[role="dialog"] [role="button"]', texto: 'Original' }, { css: '[role="dialog"] *', texto: 'Original' }] },
      { id: 'corte_original',
        clicar: [{ css: '[role="dialog"] [role="button"]', texto: 'Original' }, { css: '[role="dialog"] *', texto: 'Original' }] },
      { id: 'cortar', clicar: ['Avançar', 'Seguinte', 'Next'].map(t => ({ css: '[role="dialog"] *', texto: t })),
        esperar: ['[role="dialog"][aria-label="Editar"]', '[role="dialog"][aria-label="Edit"]'] },
      { id: 'editar', clicar: ['Avançar', 'Seguinte', 'Next'].map(t => ({ css: '[role="dialog"] *', texto: t })),
        esperar: ['div[aria-label="Adicione uma legenda..."]', 'div[aria-label="Escreve uma legenda..."]',
                  'div[aria-label="Write a caption..."]', 'div[aria-label="Add a caption..."]', '[role="dialog"] div[role="textbox"][contenteditable="true"]'] },
    ],
    legenda: ['div[aria-label="Adicione uma legenda..."]', 'div[aria-label="Escreve uma legenda..."]',
              'div[aria-label="Write a caption..."]', 'div[aria-label="Add a caption..."]', '[role="dialog"] div[role="textbox"][contenteditable="true"]',
              '[role="dialog"] div[role="textbox"]'],
    // Convite de collab. O CAMPO é medido (09/11) e o `name` não depende de
    // idioma; a LISTA de sugestões não foi medida — o @ é casado por texto
    // exato e só dentro do diálogo (o feed atrás pode ter post da mesma conta).
    // `{u}` vira o @ na hora.
    colaboradores: {
      campo: ['[role="dialog"] input[name="creation-collaborator-input"]',
              '[role="dialog"] input[placeholder="Adicionar colaboradores"]',
              '[role="dialog"] input[placeholder="Add collaborators"]'],
      sugestao: [{ css: '[role="dialog"] [role="button"]', filhoTexto: '{u}' },
                 { css: '[role="listbox"] *', texto: '{u}' },
                 { css: '[role="dialog"] *', texto: '{u}' }],
    },
    // Há «Partilhar»/«Compartilhar» no feed, atrás do diálogo (ícone sem texto):
    // só dentro do diálogo, por texto exato.
    publicar: ['Compartilhar', 'Partilhar', 'Share'].map(t => ({ css: '[role="dialog"] *', texto: t })),
    // 16/11 (0.8.37, Grok): «Share» sumiu, o motor disse PUBLICADO e o reel
    // nunca chegou ao perfil. O sumiço do botão não basta: só é PUBLICADO
    // com a mensagem do próprio Instagram. «Sharing» ainda é envio.
    publicado: ['Your reel has been shared', 'Your post has been shared', 'Reel shared', 'Post shared',
                'Seu reel foi compartilhado', 'Seu post foi compartilhado', 'Sua publicação foi compartilhada',
                'Reel compartilhado', 'Post compartilhado', 'Publicação compartilhada',
                'O teu reel foi partilhado', 'A tua publicação foi partilhada', 'Reel partilhado', 'Publicação partilhada']
      .map(t => ({ css: '[role="dialog"] *', contem: t }))
      .concat(['[role="dialog"] img[alt="Animated checkmark"]', '[role="dialog"] img[alt="Marca de seleção animada"]']),
    enviando: ['Sharing', 'Compartilhando', 'A partilhar'].map(t => ({ css: '[role="dialog"] *', contem: t })),
    falhou_publicar: ["couldn't be shared", 'could not be shared', 'Não foi possível compartilhar', 'Não foi possível partilhar']
      .map(t => ({ css: '[role="dialog"] *', contem: t })),
    publicado_espera_s: 180,
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
    // O seletor de hashtag do TikTok ENGOLIU hashtags inseridas em bloco
    // (10/11, no app): aqui elas vão letra a letra. Só aqui.
    hashtag_por_tecla: true,
    publicar: ['button[data-e2e="post_video_button"]'],
    // Texto exato e preferindo dentro do diálogo: a mesma tela tem o rádio
    // «Agora» em "Quando publicar".
    confirmar: [{ css: '[role="dialog"] button', texto: 'Publicar agora' }, { css: 'button', texto: 'Publicar agora' },
                { css: '[role="button"]', texto: 'Publicar agora' }, { css: 'button', texto: 'Post now' }],
    confirmar_espera_s: 5,
  },

  threads: {
    nome: 'Threads',
    url: 'https://www.threads.com/',
    aceita: ['imagem', 'video', 'texto'],
    legenda_max: 500,
    medido_em: '2026-11-04 · 2026-11-10 (app)',
    // «Novo post» pode existir OCULTO no Chrome (10/11): só candidato visível.
    abrir: {
      clicar: [
        ...['Criar', 'Create', 'Novo post', 'Nova publicação', 'New thread', 'New post'].flatMap(t => [
          `[role="button"][aria-label="${t}"]`, `button[aria-label="${t}"]`,
          `[role="button"]:has(svg[aria-label="${t}"])`, `a:has(svg[aria-label="${t}"])`,
          { css: 'button, [role="button"]', texto: t }]),
        ...['Campo de texto', 'Empty text field', 'Text field'].map(t => `[role="button"][aria-label^="${t}"]`),
        { css: 'button, [role="button"]', texto: "What's new?" }],
      esperar: ['[role="dialog"] [role="textbox"]', '[role="dialog"] [contenteditable="true"]'],
    },
    arquivo: ['[role="dialog"] input[type="file"][accept*="image"]', '[role="dialog"] input[type="file"]'],
    legenda: ['[role="dialog"] [role="textbox"]', '[role="dialog"] [contenteditable="true"]',
              '[role="dialog"] textarea[placeholder="What\'s new?"]'],
    // pt-BR «Postar»; no navegador do Grok (pt-PT, 13/11, foto do usuário) o
    // botão é «Publicar» — a leva esperou 180s por um «Postar» que não existia.
    publicar: ['Postar', 'Publicar', 'Post'].map(t => ({ css: '[role="dialog"] [role="button"], [role="dialog"] button', texto: t })),
  },

  facebook: {
    nome: 'Facebook',
    url: 'https://www.facebook.com/',
    aceita: ['imagem', 'video', 'texto'],
    legenda_max: 63206,
    medido_em: '2026-11-13 (Chrome local, pt-BR; vídeo até Postar, sem publicar)',
    fluxo_facebook: true,
    avancar: ['Avançar', 'Next', 'Seguinte'].map(nome => ({ css: '[role="dialog"] [role="button"], [role="dialog"] button', nome, dialogoTopo: true })),
    anexos: ['[role="dialog"] video', '[role="dialog"] [aria-label="Remover anexo do post"]', '[role="dialog"] [aria-label="Remove attachment"]', '[role="dialog"] [aria-label="Remove post attachment"]'],
    perfil: {
      // 13/11 (pt-BR): o botão real é aria-label «Conta, seu perfil». Prefixo e
      // trecho, no banner primeiro e depois em qualquer lugar da tela.
      menu: ['[aria-label="Conta, seu perfil"]', '[aria-label^="Conta"]', '[aria-label*="seu perfil"]',
             '[aria-label*="Seu perfil"]', '[aria-label*="Your profile"]', '[aria-label="Account"]',
             '[aria-label*="O teu perfil"]'].flatMap(a => [
        `[role="banner"] [role="button"]${a}`, `[role="banner"] button${a}`]).concat(
        ['[aria-label="Conta, seu perfil"]', '[aria-label^="Conta"]', '[aria-label*="seu perfil"]', '[aria-label*="Your profile"]']
          .flatMap(a => [`[role="button"]${a}`, `button${a}`])),
      // Plano B: abrir a página direto. Quem administra e está como perfil
      // pessoal vê «Mudar agora»/«Switch now» para agir como ela.
      alternar: ['Trocar agora', 'Mudar agora', 'Alternar agora', 'Switch now', 'Switch Now', 'Mudar', 'Alternar', 'Switch']
        .map(t => ({ css: '[role="button"], button', texto: t })),
      todos: ['See all profiles', 'Ver todos os perfis'].map(t => ({ css: '[role="menu"] [role="button"], [role="menuitem"], [role="dialog"] [role="button"], [role="dialog"] button', texto: t })),
      pagina: [{ css: '[role="dialog"] [role="button"], [role="dialog"] [role="radio"], [role="menu"] [role="menuitem"]', texto: '{u}' },
               { css: '[role="dialog"] [role="button"], [role="dialog"] [role="radio"], [role="menu"] [role="menuitem"]', filhoTexto: '{u}' }],
    },
    abrir: {
      // Avisos por cima da tela ANTES de criar (16/11: «Ativar notificações»
      // no Instagram). Só a recusa — nunca «Ativar».
      avisos: ['Agora não', 'Not Now', 'Not now', 'Agora não, obrigado', 'Dispensar', 'Dismiss']
        .map(t => ({ css: '[role="dialog"] button, [role="dialog"] [role="button"]', texto: t })),
      // Como página (13/11) o botão é «No que você está pensando, Uncensored
      // Brasil?» — o nome entra no meio, então casa por CONTÉM sem o «?», e
      // também por aria-label que COMECE com o texto.
      clicar: [
        ...["What's on your mind", 'No que você está pensando', 'Em que estás a pensar'].flatMap(t => [
          `[role="main"] [role="button"][aria-label^="${t}"]`, `[role="button"][aria-label^="${t}"]`,
          { css: '[role="main"] [role="button"], [role="main"] button', contem: t },
          { css: '[role="button"], button', contem: t }]),
        ...['Create post', 'Criar publicação', 'Criar post', 'Escreva algo', 'Write something'].map(t => ({ css: '[role="main"] [role="button"], [role="main"] button', contem: t }))],
      esperar: ['[role="dialog"] [role="textbox"]', '[role="dialog"] [contenteditable="true"]'],
    },
    arquivo: ['[role="dialog"] input[type="file"][accept*="video"]', '[role="dialog"] input[type="file"][accept*="image"]', '[role="dialog"] input[type="file"]'],
    // Encontrar Avançar não prova que o arquivo entrou. Primeiro exigimos
    // prévia/remoção; o motor percorre as telas após escrever a legenda.
    depois_do_arquivo: ['[role="dialog"] video', '[role="dialog"] [aria-label="Remover anexo do post"]', '[role="dialog"] [aria-label="Remove attachment"]', '[role="dialog"] [aria-label="Remove post attachment"]'],
    espera_arquivo_s: 120,
    // Editor inicial e descrição do reel; o rótulo pode não conter o autor.
    legenda: ['[role="dialog"] [role="textbox"][contenteditable="true"]', '[role="dialog"] [role="textbox"]', '[role="dialog"] textarea'],
    descricao_reel: ['Descreva seu reel', 'Descreva o teu reel', 'Describe your reel', 'Escreva uma descrição', 'Write a description'].flatMap(t => [
      `[role="dialog"] [aria-label^="${t}"]`, `[role="dialog"] textarea[placeholder^="${t}"]`, `[role="dialog"] [contenteditable="true"][data-placeholder^="${t}"]`]),
    // Ofertas que o Facebook abre DEPOIS de «Postar» e seguram a publicação
    // (16/11: «Fale diretamente com as pessoas» — botão «Ligar agora», com
    // «Agora não» · «Adicionar botão»). Só a recusa; nunca aceitar a oferta.
    recusar_depois: ['Agora não', 'Not now', 'Agora não, obrigado', 'Ignorar', 'Skip']
      .map(t => ({ css: '[role="dialog"] [role="button"], [role="dialog"] button', texto: t })),
    publicar: ['Publicar', 'Post', 'Postar', 'Publish', 'Compartilhar agora', 'Share now', 'Partilhar', 'Partilhar agora', 'Share'].flatMap(t => [
      `[role="dialog"] [role="button"][aria-label="${t}"]`,
      { css: '[role="dialog"] [role="button"], [role="dialog"] button', texto: t }]),
  },
};

const ORDEM_REDES = ['x', 'instagram', 'tiktok', 'threads', 'facebook'];
