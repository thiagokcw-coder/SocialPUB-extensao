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

### Importar todas as redes em um TXT

Em **Contas da persona → Importar cookies de todas as redes por TXT**, selecione
um arquivo e clique em **Importar TXT para esta persona**. Cole no TXT as
exportações JSON do Cookie-Editor, uma após a outra, sem títulos entre elas.
Também aceita uma lista JSON única, um objeto com `cookies` ou o formato
Netscape (colunas separadas por tabulação, incluindo `#HttpOnly_`). Limite: 5 MB.

A extensão identifica X/Twitter, Instagram, TikTok, Threads e Facebook pelo
`domain`. Cada cookie JSON precisa de `domain`, `name` e `value`. Cabeçalhos
como `sessionid=…` sem domínio continuam disponíveis no campo individual de
cada rede; não permitem reconhecimento automático.

A importação substitui as contas das redes encontradas na persona selecionada,
preserva as outras e informa cookies expirados, repetidos, de outros domínios
e chaves de autenticação ausentes. Use apenas uma conta por rede no arquivo;
cookies com mesmo domínio, caminho e nome, mas valores diferentes, bloqueiam
a importação. O TXT é lido localmente. Para aplicar a sessão ao navegador,
clique em **Entrar de novo** ou prepare a publicação.

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

**0.8.32 — Facebook: troca de tela lenta depois de Avançar:** no navegador do
Grok (16/11) o diálogo passou alguns segundos sem título nem autor entre
«Criar post» e a tela do reel, e o fluxo parava com «Facebook não está como a
página». Agora, depois de Avançar, essa leitura vazia é «em transição»: espera
até 20 s a próxima tela, sem clicar de novo, e então confere autor e etapa de
verdade. Autor DIFERENTE continua bloqueando na hora. Se a tela não for
reconhecida, o erro mostra os títulos que estavam nela.

**0.8.31 — aba oculta no navegador do Grok:** o diagnóstico da 0.8.30 mostrou o
diálogo do X «inexistente» mesmo depois do clique em «Post» e a tela de legenda
do Instagram sem terminar de abrir — sinais de aba tratada como oculta, com as
animações congeladas. Ao conectar, a extensão traz a aba para a frente
(`Page.bringToFront`) e emula foco; o relatório mostra «aba: visible/hidden ·
foco». Só com a aba oculta, a opacidade deixa de contar para «visível». O
Instagram em inglês ganhou «Add a caption...». `python tests/test_aba_oculta.py`.

**0.8.30 — navegador do Grok (inglês, Linux):** pelo diagnóstico de 16/11, o
Instagram travava 60 s numa leitura porque o `requestAnimationFrame` não
dispara em aba que o navegador dá como oculta — agora a espera tem limite de
150 ms. No X, a URL `/compose/post` abriu a linha do tempo sem o diálogo: só se
o diálogo não aparecer em 20 s, a extensão clica o «Post» da barra lateral e
espera de novo. No Chrome em que o diálogo abre, nada muda.
`python tests/test_localizar_oculta.py` e o caso novo em
`tests/test_x_midia.py` cobrem os dois.

**0.8.29 — recusar a oferta que o Facebook abre depois de Postar:** depois do
clique em «Postar» apareceu «Fale diretamente com as pessoas» (botão «Ligar
agora») e a publicação ficou parada. A extensão responde «Agora não» (nunca
«Adicionar botão»), até 3 vezes, e volta a esperar a confirmação.

**0.8.28 — prévia do reel aceita na tela final do Facebook:** em «Configurações
do reel» o vídeo tocava e mesmo assim parava em «a mídia não apareceu no
post»: o navegador dava o `<video>` como invisível. Agora conta o vídeo
carregado com área na tela e, nas telas do reel, o controle «Pausar/Reproduzir
vídeo» do player no diálogo. Vídeo fora de um diálogo continua não valendo.

**0.8.27 — confirmar a Página pela foto do avatar:** em pt-BR o botão
«Conta, seu perfil» traz a imagem com o rótulo genérico «Seu perfil», sem o
nome. Nesse caso a Página é confirmada pela FOTO: o arquivo do avatar da conta
tem de ser o mesmo da foto de perfil da Página («Ações da foto do perfil»). Se
não bater, o erro mostra os dois arquivos. `python
tests/test_facebook_conta_foto.py` cobre o caso.

**0.8.26 — devolver a sessão do navegador quando a guardada não vale:** antes
de trocar a sessão da rede pela da persona, a extensão guarda a que estava no
navegador; se a rede abrir pedindo e-mail e senha, devolve essa sessão, em vez
de deixar o navegador deslogado. Renove a da persona com «Salvar sessão atual».

**0.8.25 — não deslogar o Facebook com sessão velha:** se o navegador já está
na MESMA conta da persona (mesmo `c_user`/`ds_user_id`/`twid`/`uid_tt`, com os
cookies que autenticam), a extensão mantém a sessão aberta em vez de gravar a
guardada por cima — e atualiza a guardada com a viva. Se a Página ainda abrir
pedindo e-mail e senha, o Facebook para com essa causa. `node
tests/test_sessao_mantida.js` cobre os três casos.

**0.8.24 — contas com interface simplificada:** uma ação principal, **Abrir
conta**, aplica a sessão salva e abre a rede. Cadastro, renovação, cookies e
remoção ficam recolhidos em **Gerenciar conta** (ou **Adicionar conta**).
Removidos os botões redundantes de abrir a rede e entrar de novo. **Salvar
cookies** apenas guarda a sessão; **Abrir conta** a aplica ao navegador.

**0.8.23 — abrir conta já logada:** cada rede tem um botão que aplica os
cookies salvos da persona e abre a rede em uma nova aba, sem usar a tela de
login. Fica desabilitado quando não há conta salva. Se algum cookie for
recusado, não abre a aba. Facebook abre Uncensored Brasil. Sessões expiradas
podem exigir renovação na rede.

**0.8.22 — cookies de todas as redes por TXT:** importação na persona ativa,
com reconhecimento por domínio, JSONs concatenados ou Netscape e relatório por rede.

**0.8.21 — Facebook sempre como Uncensored Brasil:** o motor abre
`https://www.facebook.com/uncensoredbrasil`, independentemente do destino da
persona. Antes, fecha a aba anterior do motor e abas do Facebook com compositor
aberto (descarta rascunhos sem publicar). Exige o nome da Página no avatar do
controle de conta do cabeçalho antes de abrir o compositor e nas conferências
anteriores à publicação; avatar sem identificação acessível também bloqueia.
Registra limpeza e troca de perfil. Carregamento, leituras e comandos de
depuração têm prazo; navegação após confirmar a identidade interrompe com erro
explícito e exige reiniciar pela Página, sem repetir publicação automaticamente.

**0.8.20 — prévia na transição do reel:** a medição real mostrou que o primeiro
Avançar funcionava e o motor parava por ausência de mídia em “Editar reel”,
apesar da prévia reproduzir. Agora espera até 5s pela prévia intermediária;
se a mídia já foi confirmada antes no mesmo fluxo, permite apenas avançar à
revisão. Na etapa final exige uma nova detecção da mídia dentro do diálogo,
esperando até 15s; sem ela não publica, mesmo com publicação automática ligada.
Vídeos no feed ou em outro diálogo não servem de prova. O diagnóstico registra
contagens, dimensões, estado de carregamento e visibilidade, sem URLs de mídia.

Testes locais cobrem prévia tardia, ausência só na etapa intermediária e vídeo
fora do diálogo com publicação automática ligada. A causa DOM exata do falso
negativo observado ainda não foi confirmada; esta versão acrescenta a medição
necessária e não considera o upload/publicação real validados.

**0.8.19 — Avançar no reel:** não consulta o autor em “Editar reel” / “Criar
reel”; mantém a identidade vinculada ao compositor inicial e confere novamente
na etapa final. Avançar considera texto ou aria-label, apenas botões visíveis
no diálogo superior (z-index, depois ordem no DOM). Se não houver transição em
5 segundos, registra texto, aria-label, retângulo e coordenadas do clique,
mede novamente e tenta uma única vez no centro. Outra falha encerra o fluxo
com a etapa e motivo exatos. Tempos por etapa permanecem no log.

Testes locais cobrem ausência de leitura de autor nas telas intermediárias,
botão oculto/diálogo anterior, aria-label sem texto, segunda tentativa bem
sucedida e bloqueio depois de duas tentativas sem transição.

**0.8.18 — reel direto após anexar:** se o vídeo já abre “Editar reel” ou
“Criar reel”, avança antes de escrever e usa o campo “Descreva seu reel...” /
“Describe your reel...”. Reconhece a etapa final também pela descrição e pelo
botão de publicação; inclui “Compartilhar agora” / “Share now”. O post normal
conserva seu caminho. Identidade e mídia continuam sendo conferidas no mesmo
diálogo, com tempos por etapa e descrição conferida antes do clique final.
Não interage com o popup do Tradutor; os alvos são campos/botões do diálogo.

Após o clique, espera o diálogo verificado fechar sem outro diálogo aberto,
ou um novo aviso explícito de publicação/processamento. Processamento é
registrado como envio aceito, não como publicação concluída. Sem evidência,
o resultado continua incerto, sem repetir o clique. Testes locais cobrem o
reel direto, descrição, fechamento, avisos novos/antigos e post normal; falta
validar esta versão ponta a ponta na conta real.

**0.8.17 — autor sem audiência/IA:** a identificação ignora rótulos de UI,
controles de privacidade e comboboxes; dentro de botões, apenas a imagem do
avatar pode identificar o autor. Nome de outro perfil continua bloqueando.
A leitura do autor é imediata, sem espera por prazo. O log registra o tempo
de cada etapa do Facebook, de cada checagem do autor e o total do motor,
inclusive quando ocorre falha. Os testes incluem o caso nome + “Público” +
“Rótulo de IA desativado”, controles com ícones e autores conflitantes.

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
