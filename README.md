# SocialPUB — extensão do Chrome

Prepara a mesma publicação em várias redes: abre o compositor de cada uma,
anexa o vídeo ou a imagem, escreve a legenda, confere o que ficou no editor e
**publica** — ou para antes do botão final, se «Publicar sozinho» estiver
desligado.

| rede | o que cobre | passos |
|---|---|---|
| X | imagem, vídeo, só texto | compositor `x.com/compose/post` |
| Instagram | **só Reel (vídeo)** | Criar → Postar → arquivo → OK do aviso → corte **Original** → Avançar → Avançar → legenda → **colaboradores** |
| TikTok | **só vídeo** | upload no TikTok Studio → espera o vídeo subir → fecha o aviso «Entendi» → apaga o nome do arquivo da legenda → legenda |
| Threads | imagem, vídeo, só texto | Criar → arquivo → legenda |
| Facebook | imagem, vídeo, só texto | `facebook.com/post/create` → arquivo → espera a tela certa → legenda |

Os passos e seletores são os **medidos** no app SocialPUB (`publicador.py`).
Instagram e Threads reconhecem a interface em **português do Brasil, de Portugal
e inglês** — o mesmo site muda os nomes dos botões conforme o idioma do
navegador.
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

## Personas e contas

Uma **persona** é uma página com as suas redes (por exemplo, duas páginas, cada
uma com o seu Instagram, X, TikTok…). No topo do painel, **Persona — quem
publica**: crie, renomeie, exclua e escolha a persona.

Em **Contas da persona**, para cada rede, cole os cookies exportados pelo
**Cookie-Editor** (na página da rede, logada; exportar como JSON) e clique
**Salvar e entrar**. A extensão apaga a sessão que estiver no navegador para
aquela rede e grava a da conta — o navegador fica logado sem senha.

### Como adicionar uma conta (Cookie-Editor)

1. No navegador onde você **já está logado** na conta, instale o
   [**Cookie-Editor**](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) (Chrome Web Store, grátis).
2. Abra a rede **logada na conta certa** (`instagram.com`, `x.com`, `tiktok.com`,
   `threads.com` ou `facebook.com`). Cada rede tem a sua exportação.
3. Ícone do Cookie-Editor → **Export** → **JSON** (vai para a área de
   transferência).
4. No painel do SocialPUB: escolha a **persona**, abra **Contas da persona**, cole
   no campo da rede, escreva o @ (só para lembrar) e clique **Salvar e entrar**.
5. Confira o «✓ … cookie(s) gravado(s)» e clique em **Abrir** para ver a rede
   logada. Se avisar que faltaram cookies, exporte de novo com a página logada.

⚠ Depois de exportar, **não clique em «Sair»** nessa conta no outro navegador —
sair encerra a sessão copiada. Se a conta cair (senha trocada, «sair de todos os
dispositivos»), exporte e cole de novo.

**Ao preparar,** a extensão troca a sessão de cada rede para a conta da persona
escolhida antes de abrir o compositor. Rede em que a persona **não tem conta é
pulada** — preparar com a sessão que estivesse no navegador publicaria na página
da outra persona. Os **colaboradores do Instagram** também são por persona.

- **Entrar de novo** regrava a conta guardada (se a sessão cair do navegador).
- **Esquecer** apaga a conta da extensão (a sessão no navegador continua).
- Avisa se faltarem os cookies que autenticam (`auth_token`/`ct0` no X,
  `sessionid` no Instagram, `c_user`/`xs` no Facebook…).
- O Threads troca só a sessão do Threads — não desloga o Instagram.
- A conta nova é gravada **antes** de qualquer coisa ser apagada. Se o Chrome
  recusar os cookies que autenticam, a sessão anterior fica como estava e a rede
  **não é preparada** (em vez de abrir deslogada e falhar lá na frente).
- ⚠ Os cookies ficam guardados **só nesta extensão, neste navegador**, e dão
  acesso total às contas. Nunca vão para o GitHub. Não compartilhe o perfil do
  navegador.

## Publicar sozinho

Com **Publicar sozinho depois de preparar** ligado (fica guardado), cada rede é
preparada, conferida e publicada — a mesma regra do app:

- só publica se a **legenda conferiu** (o texto inteiro está no editor);
- **espera o botão habilitar** (até 3 min — enquanto o vídeo sobe ele fica
  desabilitado), fecha avisos por cima e clica;
- TikTok: responde «Continuar publicando?» com **Publicar agora**;
- diz **PUBLICADO** só quando o botão de publicar **sai da tela**. Se o clique
  sai e o botão continua lá, o resumo manda **conferir na aba antes de publicar
  de novo** — publicar duas vezes é o risco aqui.

Desligado, a extensão para antes do botão final e quem publica é você.

## Legenda por rede

Cada rede tem o seu limite: **X 280 · Threads 500 · Instagram 2.200 · TikTok
4.000 · Facebook 63.206** caracteres. Embaixo da **Legenda comum**, cada rede
marcada mostra o contador dela (`usados / limite`, em vermelho quando passa).
Marque **Legenda própria** para escrever um texto só daquela rede (abre já com a
comum, para editar). Própria **vazia** vai vazia — é a forma de publicar numa
rede sem legenda.

Rede cuja legenda passe do limite **não é preparada**, e o relatório diz o
tamanho e o limite. Nada é cortado sozinho.

### Legendas escritas fora (Grok, ChatGPT…)

Em **📝 Trazer legendas escritas fora**:

1. **Copiar briefing** — o texto para colar no modelo, com o formato e o limite
   de cada rede marcada. Escreva o assunto no fim.
2. O modelo devolve uma seção por rede:

   ```
   === X ===
   texto do X

   === INSTAGRAM (Reels) ===
   texto do Instagram
   ```
3. Escolha o arquivo **.txt** (ou cole o texto) e **Aplicar**: cada rede do
   arquivo ganha a **legenda própria** e é **marcada**.

Aceita os nomes como o modelo escreve («X (Twitter)», «Tik Tok», «IG»…).
Rede desconhecida, seção vazia ou repetida, rede sem conta na persona, rede em
que a extensão não publica e legenda acima do limite viram **aviso na tela** —
nada some em silêncio. É o mesmo formato do app.

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

**Medido no X (13/11/2026):** pelo teclado real a #hashtag fica azul, como
digitada; pelo comando de texto do navegador (`execCommand`) ficava branca — o
editor não processava. Por isso a extensão só escreve pelo teclado real.

## Quando uma rede para no meio: o diagnóstico

A aba da rede fica aberta e o relatório mostra o que a extensão viu na tela
(endereço, idioma, tamanho da janela, se parece tela de login). No resumo,
**📋 Copiar diagnóstico** copia a leitura completa — os diálogos abertos e os
botões e links visíveis com os seus nomes. É com isso que a receita é corrigida:
medir, não adivinhar. O diagnóstico **nunca** traz valor de campo, cookie ou
senha.

## Vídeo por link

- O link tem de abrir o **arquivo** (`.mp4`, `.jpg`…), não uma página com o
  vídeo dentro. Página é recusada com o motivo.
- Na primeira vez com um site novo, o Chrome pergunta se a extensão pode
  acessar **aquele** site (só ele).
- Link `blob:` não serve. Acima de ~60 MB o painel avisa.

## Testes

No repositório do SocialPUB: `tests/test_extensao.py` roda o motor inteiro com
cliques e teclas reais contra réplicas do compositor de cada rede, preparando e
publicando (42 verificações), `tests/test_extensao_link.py` testa o download por link (7) e
`tests/test_extensao_cookies.py` as contas por cookies (18) e
`tests/test_extensao_personas.py` as personas, a legenda por rede e o «Publicar
sozinho» no painel de verdade (32), e `tests/test_extensao_legendas.py` o
arquivo de legendas (27, com o arquivo real gerado pelo Grok).
As réplicas **não** provam o DOM real das redes — isso só o uso diz.
