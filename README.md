# SocialPUB — extensão de teste (só o X)

Primeiro passo para o SocialPUB virar extensão do Chrome (para rodar no
navegador do Grok). Faz no X o mesmo que a receita medida do app: abre o
compositor, anexa o arquivo, escreve a legenda, **confere** o que ficou no
editor e **para antes de postar**.

A pergunta que este teste responde: **a legenda entra de verdade no editor do X
quando quem escreve é uma extensão?** Os editores das redes ignoram tecla
simulada por script, então há dois métodos para comparar:

- **A · Texto do navegador** — `execCommand('insertText')`. Sem faixa amarela.
- **B · Teclado real** — API de depuração do Chrome (`chrome.debugger`), teclas
  reais como as do Playwright no app. Mostra a faixa amarela "está depurando"
  enquanto escreve.

## Instalar

1. Baixe o código: **Code → Download ZIP** no GitHub
   (<https://github.com/thiagokcw-coder/SocialPUB-extensao/archive/refs/heads/main.zip>)
   e descompacte. Ou `git clone https://github.com/thiagokcw-coder/SocialPUB-extensao`.
2. `chrome://extensions` → ligue o **Modo do desenvolvedor**.
3. **Carregar sem compactação** → escolha a pasta descompactada (a que tem o
   `manifest.json`).
4. Use um Chrome em que a conta do X **já esteja logada**.

**Atualizar:** baixe de novo, substitua a pasta e clique em ↻ no card da
extensão em `chrome://extensions`.

## Testar

1. Clique no ícone da extensão → abre o painel numa aba.
2. Escolha uma imagem, escreva uma legenda com **acentos, uma quebra de linha e
   uma #hashtag**, escolha o método **A** e clique **Preencher no X**.
3. Olhe a aba do X e o **Relatório** no painel.
4. Repita com o método **B**.

Nada é postado: o botão Postar fica com você.

## Resultado (13/11/2026, X)

Os dois métodos puseram o texto e a imagem no compositor. A diferença foi a
**#hashtag**: no **B** ela ficou **azul** (o editor processou como digitação de
uma pessoa); no **A** ficou **branca** — o texto aparece, mas o editor não o
tratou como digitado. **O B virou o padrão.** O A fica só para comparar em outras
redes.

## Vídeo por link (o que o Grok gera)

O painel tem o campo **Link do vídeo ou da imagem**: cole o endereço do que o
Grok gerou, e a extensão baixa e anexa. Na primeira vez com um site novo, o
Chrome pergunta se a extensão pode acessar **aquele** site (só ele, não todos).

- O link tem de abrir o **arquivo** (`.mp4`, `.jpg`…), não uma página com o
  vídeo dentro. Página é recusada com o motivo.
- Link `blob:` (vídeo que só existe dentro de uma aba) não serve.
- Acima de ~60 MB o painel avisa: o arquivo atravessa até a aba da rede pela
  memória do navegador.

## Teste automático

No repositório do SocialPUB, `tests/test_extensao_x.py` roda o mesmo código numa réplica do compositor em
Chrome real (24 verificações, incluindo o download por link). Ele **não** prova o editor de verdade do X — isso
só o teste acima diz.
