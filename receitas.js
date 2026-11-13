// Receitas por rede — os MESMOS seletores do `publicador.py` do SocialPUB.
//
// X: medido em 23/10/2026. ⚠ `fileInput` e
// `tweetTextarea_0` aparecem DUAS vezes na página: o compositor do modal e o
// da linha do tempo atrás dele. Por isso o candidato dentro do diálogo vem
// primeiro, e o texto é CONFERIDO depois — escrever no errado não dá erro.
const RECEITAS = {
  x: {
    nome: 'X',
    url: 'https://x.com/compose/post',
    arquivo: ['[role=dialog] input[data-testid="fileInput"]',
              'input[data-testid="fileInput"]'],
    legenda: ['[role=dialog] div[data-testid="tweetTextarea_0"]',
              'div[data-testid="tweetTextarea_0"]'],
    publicar: ['[role=dialog] button[data-testid="tweetButton"]',
               'button[data-testid="tweetButton"]',
               'button[data-testid="tweetButtonInline"]'],
    // Onde o X mostra a mídia anexada (para conferir que o upload entrou).
    anexos: ['[role=dialog] [data-testid="attachments"]',
             '[data-testid="attachments"]'],
    legenda_max: 280,
  },
};
