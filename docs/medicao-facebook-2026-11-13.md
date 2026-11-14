# Medição do compositor do Facebook — 2026-11-13

Base inspecionada: SocialPUB 0.8.14, commit `834c274`.
Teste manual no Chrome local, Facebook em português, sessão de uma página.
MP4 fornecido pelo usuário. Nenhuma publicação foi realizada.

## Fluxo observado com vídeo

1. Abrir a URL da página e clicar em “No que você está pensando?”.
2. “Criar post” mostra o nome da página como autor, editor e “Foto/vídeo”.
3. Selecionar o MP4 pelo seletor nativo. O upload chegou a 100%, com
   “Carregamento concluído”, prévia e botão “Remover anexo do post”.
4. A mensagem “Verificando conteúdo protegido por direitos autorais” passou
   para “Você pode publicar seu reel!”. “Avançar” ficou habilitado.
5. Primeiro “Avançar” abre “Editar reel”, com vídeo reproduzindo na prévia,
   opções de edição e outro “Avançar”.
6. Segundo “Avançar” abre “Configurações do reel”. O campo
   “Descreva seu reel...” continha a legenda de teste
   “Medição técnica do SocialPUB — não publicar.”. A prévia continuava presente.
7. “Postar” estava habilitado. Não foi clicado. A tela permaneceu aberta
   nessa etapa; não foi acionado “Salvar reel como rascunho”.

No ensaio anterior só com texto, “Avançar” abriu diretamente
“Configurações do post”, com prévia e “Postar”. Não houve publicação.

## Consequências para a automação

- A receita Facebook não configura `passos`: faltam os dois avanços do
  fluxo de vídeo observado. O fluxo de texto tem apenas um avanço.
- A receita não configura `anexos`, portanto não participa da guarda
  genérica de ausência de mídia. Encontrar “Avançar” em
  `depois_do_arquivo` não comprova upload concluído.
- A identificação do autor foi visível no compositor inicial. Nas telas
  seguintes ele não apareceu na área de edição observada. A validação
  precisa considerar a transição sem aceitar um perfil desconhecido.
- O motor usa desaparecimento do botão após o clique como sucesso.
  Isso não comprova a criação de um post no feed.

## Limites da evidência

Medição visual e por acessibilidade, usando seleção nativa de arquivo.
Não foi uma execução ponta a ponta da extensão e não valida sua injeção
de arquivo, seus seletores CSS nem o navegador remoto do Grok em inglês.
O seletor de arquivo apareceu fora do diálogo na árvore de acessibilidade;
isso não comprova sua posição no DOM e exige inspeção específica.
Não houve cronômetro de upload, portanto não se registra duração estimada.
O teste comprova prévia, legenda e disponibilidade do botão final; não
comprova publicação efetiva.
