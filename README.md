LovaBurst v8 · 1.20.4

Extensão Chrome Manifest V3 para abrir/fechar manualmente um painel HTML
injetado nas páginas do Lovable.

Mantém a abertura/fecho manual da v7 e adiciona o input Lovark.
Painel: 400px | Input: 378px x 95px | Posição: 11px de cada lado, bottom 7px
O ícone da extensão usa a imagem Lovark fornecida. O cabeçalho mostra o selo
verificado fornecido junto ao nome; o selo fica fixo, sem ser arrastável.
Enquanto o painel está aberto, a barra visual de scroll da página fica oculta,
mas o scroll continua ativo.
Cabeçalho: 48px de altura, elementos centralizados verticalmente, mesma cor do painel, com linha inferior de 1px.
O content.js é carregado apenas nas páginas Lovable, mas o painel só é criado
quando recebe o comando do clique no ícone da extensão.
O cabeçalho inclui um círculo reservado para a foto de perfil e os textos
"Lovark" e "online".
Área de pergunta: 378px x 95px, bottom 7px, com os controlos de adicionar,
microfone e enviar na base. O microfone fica à direita, antes do botão de seta,
e o texto de pergunta fica elevado dentro da área.
O placeholder foi deslocado alguns pixels para baixo.
O texto digitado e o cursor usam a cor de "Lovark"; a seta é menor e mais grossa.
Os elementos do cabeçalho foram ampliados mantendo a altura de 48px.
O campo de pergunta mantém 378px de largura, cresce verticalmente até
10 linhas/parágrafos visíveis e depois mantém a altura máxima com scroll interno.
O crescimento usa prioridade de estilo para não ser bloqueado pelo CSS fixo.
Ao iniciar a gravação, o ícone do microfone transforma-se num X sem círculo e
o botão de enviar transforma-se num visto. As ondas acompanham o nível real do
microfone; ficam praticamente paradas quando não há som. A fala não aparece no
campo enquanto a pessoa grava.

A animação de "Transcrevendo..." percorre o texto da esquerda para a direita e
repete até o reconhecimento terminar.

Ao confirmar, as ondas desaparecem e o campo mostra "Transcrevendo..." enquanto
o Chrome finaliza a sessão de reconhecimento. O texto é inserido apenas depois
do evento de conclusão, com um limite de segurança para evitar que a interface
fique presa caso o navegador não conclua. Cancelar descarta a sessão sem inserir
texto. A extensão não guarda ficheiros de áudio.
Se nenhuma fala for reconhecida, o campo permanece inalterado.
O acesso ao microfone depende da autorização do navegador para lovable.dev.
O reconhecimento de voz usa o idioma português (`pt-PT`).

Compatibilidade: Chrome e Microsoft Edge baseado em Chromium (Manifest V3).
Para instalar no Edge, extraia o ZIP, abra `edge://extensions`, ative o
“Modo de programador” e escolha “Carregar expandida”, selecionando a pasta
extraída que contém `manifest.json`. Se a opção não aparecer, a instalação de
extensões de outras lojas pode estar bloqueada por uma política do dispositivo.