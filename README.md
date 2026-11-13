# SocialPUB — extensão do Chrome

Prepara a mesma publicação em várias redes: abre o compositor de cada uma,
anexa o vídeo ou a imagem, escreve a legenda, confere o que ficou no editor e
**para antes de publicar**. Quem clica em publicar é você.

| rede | o que cobre | passos |
|---|---|---|
| X | imagem, vídeo, só texto | compositor `x.com/compose/post` |
| Instagram | **só Reel (vídeo)** | Criar → Postar → arquivo → OK do aviso → corte **Original** → Avançar → Avançar → legenda → **colaboradores** |
| TikTok | **só vídeo** | upload no TikTok Studio → espera o vídeo subir → fecha o aviso «Entendi» → apaga o nome do arquivo da legenda → legenda |
| Threads | imagem, vídeo, só texto | Criar → arquivo → legenda |
| Facebook | imagem, vídeo, só texto | `facebook.com/post/create` → arquivo → espera a tela certa → legenda |

Os passos e seletores são os **medidos** no app SocialPUB (`publicador.py`).
O que não foi medido fica de fora: foto e story no Instagram, YouTube, Kwai e
Telegram.

## Instalar

1. Baixe o código: **Code → Download ZIP** no GitHub
   (<https://github.com/thiagokcw-coder/SocialPUB-extensao/archive/refs/heads/main.zip>)
   e descompacte. Ou `git clone https://github.com/thiagokcw-coder/SocialPUB-extensao`.
2. `chrome://extensions` → ligue o **Modo do desenvolvedor**.
3. **Carregar sem compactação** → escolha a pasta descompactada (a que tem o
   `manifest.json`).
4. Use um Chrome em que as contas das redes **já estejam logadas**.

**Atualizar:** baixe de novo, substitua a pasta e clique em ↻ no card da
extensão em `chrome://extensions`.

## Usar

1. Clique no ícone da extensão → abre o painel numa aba.
2. Marque as redes.
3. Cole o **link do vídeo** (o que o Grok gerou) ou escolha um arquivo.
4. Escreva a legenda.
5. Instagram: confira os **colaboradores** (o padrão fica salvo).
6. **Preparar nas redes marcadas.** Uma rede de cada vez, cada uma na sua aba.
   O relatório diz, por rede, o que foi feito e se a legenda conferiu.

Se uma rede parar no meio (uma tela que não foi medida, um @ de colaborador
que não aparece), a aba dela **fica aberta** com o que já foi feito, para você
terminar à mão.

## Como ela escreve e clica

Os editores das redes ignoram tecla e clique simulados por script. Por isso a
extensão usa a API de depuração do Chrome (`chrome.debugger`): teclas e cliques
**reais**, como os de uma pessoa. Enquanto cada rede é preparada, o Chrome
mostra a faixa amarela «uma extensão está depurando este navegador» — é isso.

**Medido no X (13/11/2026):** pelo teclado real (método B) a #hashtag fica
azul, como digitada; pelo comando de texto do navegador (A) fica branca — o
editor não processa. **B é o padrão;** A fica no painel só para comparar.

## Vídeo por link

- O link tem de abrir o **arquivo** (`.mp4`, `.jpg`…), não uma página com o
  vídeo dentro. Página é recusada com o motivo.
- Na primeira vez com um site novo, o Chrome pergunta se a extensão pode
  acessar **aquele** site (só ele).
- Link `blob:` não serve. Acima de ~60 MB o painel avisa.

## Testes

No repositório do SocialPUB: `tests/test_extensao.py` roda o motor inteiro com
cliques e teclas reais contra réplicas do compositor de cada rede (34
verificações), e `tests/test_extensao_link.py` testa o download por link (7).
As réplicas **não** provam o DOM real das redes — isso só o uso diz.
