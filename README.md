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
| Facebook | imagem, vídeo, só texto | troca para a **página da persona** → «No que você está pensando?» → arquivo → espera a tela certa → legenda → confere o autor |

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

Em **Contas da persona**, para cada rede, entre pela página de login e salve a
sessão do navegador, ou importe os cookies pelo **Cookie-Editor**. A sessão
fica guardada na persona para entrar de novo quando você preparar a publicação.

**Cadastre uma vez:** nas próximas publicações, a extensão reutiliza a sessão
guardada automaticamente. Para restaurá-la sem publicar, escolha a persona e
clique **Entrar de novo**. **Entrar pela tela** é para cadastrar ou renovar uma
sessão, não para cada troca de conta. Se a rede invalidar a sessão, pode ser
necessário fazer login e verificação novamente.

### Como adicionar uma conta — jeito 1: entrar pela tela

1. No painel, escolha a **persona** e abra **Contas da persona**.
2. Na rede, clique **Entrar pela tela**: a página de login abre numa aba nova
   (a sessão daquela rede que estava no navegador sai daqui — sem «Sair», então
   se ela estiver guardada em outra persona, continua valendo lá).
3. Entre com **usuário e senha** (e o código, se a rede pedir). A senha é
   digitada na página da rede; a extensão não vê nem guarda.
4. Volte ao painel, escreva o @ (só para lembrar) e clique **Salvar a sessão do
   navegador**.

O Threads entra pela conta do Instagram: se ele oferecer «Continuar como @…» de
outra conta, escolha entrar com usuário e senha.

### Como adicionar uma conta — jeito 2: Cookie-Editor

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

⚠ **Nunca clique em «Sair»** numa conta guardada, nem no outro navegador — sair
encerra a sessão guardada. Para usar outra conta cadastrada, escolha a persona e
use **Entrar de novo**, ou prepare a publicação. Se a conta cair (senha trocada, «sair de todos os
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

**Publicar sozinho depois de preparar** começa marcado sempre que o painel é
aberto. Você pode desmarcar para preparar sem publicar naquele uso. Ligado, cada rede é
preparada, conferida e publicada — a mesma regra do app:

- só publica se a **legenda conferiu** (o texto inteiro está no editor);
- quando há mídia e a receita tem seletores de anexos, exige a **prévia no
  compositor** na conferência e verifica de novo antes de publicar. Se faltar,
  para com «a mídia não apareceu no post»;
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
   arquivo ganha a **legenda própria**. A seleção de redes **não muda** — só as
   marcadas são publicadas; o aviso diz quais redes do arquivo estão desmarcadas.

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

**0.8.16 — trocar para a Página antes de criar:** reconhece “Trocar agora” e
os botões de troca no topo/cartão da página. Após clicar uma vez, espera até
30 segundos pelo desaparecimento do banner e pela disponibilidade do
compositor. Se a troca não concluir, para com “não consegui trocar para a
Página …”. O diagnóstico inclui `facebook_banner_troca`. Seletores de criar
e validações de autor/mídia permanecem os mesmos.

`python tests/test_facebook_troca.py` testa os botões em português/inglês,
troca atrasada, banner persistente, botão ausente e sessão já como página em
DOMs locais. Não confirma o comportamento na conta real.

**0.8.15 — etapas do Facebook:** após anexar e escrever, percorre “Criar post”
→ “Editar reel” → “Configurações do reel”, aguardando cada transição. Texto
segue diretamente para “Configurações do post”. Confere mídia e legenda na
tela final e conserva a identidade apenas enquanto o mesmo diálogo e endereço
permanecem; outro autor ou outro compositor bloqueia a publicação. Sem publicar
sozinho, para antes de “Postar”. O desaparecimento do botão após o clique passa
a ser resultado incerto no Facebook, não confirmação de publicação no feed.

`python tests/test_facebook_fluxo.py` verifica nove cenários em réplicas locais:
avanços, preparo sem publicar, ausência/perda de vídeo, troca de autor/diálogo,
legenda perdida e clique final sem confirmação. A medição manual que fundamenta
o fluxo está em `docs/medicao-facebook-2026-11-13.md`; esta versão ainda precisa
de teste ponta a ponta na conta real.

**0.8.14 — Facebook pelo link da página:** nome e link HTTPS são pedidos e
guardados por persona. Ao preparar, a extensão restaura a sessão da conta e
abre diretamente o link salvo, sem passar pelo menu de perfis. Se a página
pedir «Mudar agora», atende e confere o autor no compositor. Link ausente ou
inválido bloqueia o preparo no Facebook. «Abrir Facebook» também usa o link
salvo. `node tests/test_facebook_url.js` valida os links e a persistência;
o teste do autor também confere que o motor abre esse endereço diretamente.

**0.8.13 — autor da página no Facebook:** a conferência aceita o nome no
cabeçalho anterior ao editor, a imagem do autor e o placeholder/aria-label
personalizado («No que você está pensando, …?», «What's on your mind, …?» e
«Em que estás a pensar, …?»), além de «Publicar como/Posting as». Nomes
conflitantes continuam bloqueando a publicação e aparecem no relatório.
`python tests/test_facebook_autor.py` valida esses sinais e as recusas com
réplicas locais, incluindo nomes no feed, na legenda e em outro diálogo.

**0.8.12 — vigia do X sem falso «0%»; criar post como página no Facebook:** o
progresso do X é lido só dentro do anexo; «Ready/Pronto/Concluído» é sucesso;
sem percentual com o anexo na tela é «processando», não 0%; o prazo de 30 s
recomeça a cada mudança de percentual e não vale depois que o envio andou. No
Facebook, o botão de criar casa por *contém* («No que você está pensando»,
«What's on your mind», «Em que estás a pensar») e por aria-label que comece com
esses textos — como página o nome dela entra no meio do texto.

**0.8.11 — X confere pelo compositor; Facebook acha «Conta, seu perfil»:** no
X, a cópia em `Downloads/SocialPUB/` só é entregue com o download «complete» e
o tamanho igual ao da mídia; depois da entrega a conferência é pelo anexo no
compositor (o X esvazia o campo de arquivo ao consumi-lo) — falha só se o anexo
não aparecer em 20 s. No Facebook, o menu do perfil casa também
«Conta, seu perfil» e variações; se ele não aparecer, a extensão abre o
**endereço da página** (campo novo, opcional, na persona), clica «Mudar agora»
se aparecer e usa o compositor da página, ainda conferindo o autor.

**0.8.10 — upload nativo no X e página no Facebook:** no X, o vídeo é salvo
em `Downloads/SocialPUB/` e entregue ao campo de arquivo como arquivo de verdade
(permissão nova: *downloads*); a extensão acompanha o «Uploading (n%)» e para
sem publicar se ficar 30 s em 0% ou não terminar em 180 s. No Facebook, cada
persona tem o campo **Facebook — publicar como página**: a extensão troca para
essa página e confere o autor no compositor antes de escrever e de publicar; se
não confirmar, para sem publicar. Threads reconhece também a interface em
inglês («New thread», «What's new?»).

`node tests/test_upload.js` testa o monitor de upload com relógio controlado.

**0.8.8 — vídeo no X:** espera a janela de postagem abrir e usa apenas os
campos dentro dela, sem recorrer ao compositor da linha do tempo. Depois de
entregar o arquivo, espera até 60 segundos pelo contêiner de anexos e confere
a prévia antes de considerar o post pronto.

`python tests/test_x_midia.py` (Python com Playwright e Chrome instalado) testa
janela atrasada, isolamento do compositor de trás, prévia vazia, perda da mídia
antes de publicar e publicação com/sem mídia. É uma réplica com arquivo de
teste sintético; não comprova o upload de um vídeo no X real.

No repositório do SocialPUB: `tests/test_extensao.py` roda o motor inteiro com
cliques e teclas reais contra réplicas do compositor de cada rede, preparando e
publicando (42 verificações), `tests/test_extensao_link.py` testa o download por link (7) e
`tests/test_extensao_cookies.py` as contas por cookies (18) e
`tests/test_extensao_personas.py` as personas, a legenda por rede e o «Publicar
sozinho» no painel de verdade (32), e `tests/test_extensao_legendas.py` o
arquivo de legendas (27, com o arquivo real gerado pelo Grok).
As réplicas **não** provam o DOM real das redes — isso só o uso diz.
