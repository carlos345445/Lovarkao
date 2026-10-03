Lovark · 1.20.39

Extensão Chrome Manifest V3 para abrir/fechar manualmente um painel HTML
injetado nas páginas do Lovable.

Mantém a abertura/fecho manual da v7 e adiciona o input Lovark.
Painel: 400px | Input: 378px x 80px | Posição: 11px de cada lado, bottom 7px
O ícone da extensão usa a imagem Lovark fornecida. O cabeçalho mostra o selo
verificado fornecido junto ao nome; o selo fica fixo, sem ser arrastável.
Enquanto o painel está aberto, a barra visual de scroll da página fica oculta,
mas o scroll continua ativo.
Cabeçalho: 48px de altura, elementos centralizados verticalmente, mesma cor do painel, com linha inferior insetada de 2px.
O content.js é carregado apenas nas páginas Lovable, mas o painel só é criado
quando recebe o comando do clique no ícone da extensão.
O cabeçalho mantém o avatar circular junto aos textos "Lovark" e "online".
No lado direito aparecem apenas os ícones de notificações e definições,
redesenhados como símbolos preenchidos, sem bordas nem formas de fundo atrás.
Os ícones ficam mais próximos e são apenas visuais, sem funcionalidade nesta
versão. O estado começa como "offline" e passa para "online" em roxo (#b18aff)
em URLs HTTPS de
`lovable.dev/projects/` que contenham um identificador de projeto. O estado é
verificado novamente enquanto o painel está aberto. O selo verificado é não
arrastável.
Em URLs HTTPS de `lovable.dev/projects/{id}`, os parágrafos identificados pelo
padrão visual correspondente mostram `999999 | Lovark`, incluindo a linha de
créditos com a seta ao lado. A alteração só é aplicada enquanto o estado está
"online" e o texto original é restaurado ao ficar "offline". A detecção usa as
classes dos elementos e a relação entre o texto e a seta, sem depender de uma
largura de tela específica.
Ao subir no histórico do chat, aparece um botão circular com borda e seta,
centralizado acima do campo de pergunta; ao acioná-lo, a conversa rola
suavemente até às mensagens mais recentes. O botão usa as cores dos controlos
existentes na extensão; a seta é feita com elementos HTML estilizados por CSS,
sem usar imagem ou SVG.
Área de pergunta: 378px x 80px (altura mínima), bottom 7px, com os controlos de
adicionar, modo, microfone e enviar na base. O seletor de modo alterna entre Construir e Chat,
mostra a descrição de cada opção e pode ser alternado com Alt+P. O microfone
fica à direita, antes do botão de seta,
e o texto de pergunta fica elevado dentro da área.
Os botões circulares têm 24px, o seletor mede 84 × 26px e os controlos do lado
direito mantêm 8px de espaço entre si. O menu de modos tem 250px, alinha-se pela
borda direita do seletor e fica 3px acima dele; títulos e descrições não quebram.
O peso da tipografia do seletor e das opções do menu foi reduzido em 25%.
O botão Enviar fica cinza (#898989) quando o campo está vazio e em #f4f4f3
quando há texto.
Ao abrir o painel, o conteúdo dos sites é redimensionado para deixar espaço ao
Lovark, sem sobreposição; ao fechar, os estilos inline existentes são preservados.
Nos modos Construir e Chat é possível enviar mensagens com Enter ou pelo botão.
Ambos partilham a mesma conversa e o mesmo histórico, sem separar ou ocultar
mensagens ao alternar de modo. Elas aparecem em balões compactos com os três
cantos arredondados e o canto inferior direito reto. Ao passar o cursor, mostram
o ícone de cópia à esquerda do horário, que usa peso 500; ao copiar, o ícone muda
para um visto roxo sem fundo circular. O histórico dura enquanto o painel estiver
aberto. Mensagens com mais de 85
caracteres mostram uma prévia com reticências e "Mostrar mais" dentro do balão,
abaixo do texto; podem ser expandidas e recolhidas. Esta versão não gera respostas
automáticas de IA.
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

Links de GitHub, ChatGPT (`chatgpt.com` ou `chat.openai.com`) e Supabase
(`supabase.com` ou domínios de projeto `*.supabase.co`) mostram cartões de
deteção com os respetivos logos. Cada cartão inclui o nome do serviço e um
botão “Conectar”. Os botões “Conectar” são apenas visuais nesta versão:
não iniciam ligações nem consultam APIs.

Compatibilidade: Chrome e Microsoft Edge baseado em Chromium (Manifest V3).
Para instalar no Edge, extraia o ZIP, abra `edge://extensions`, ative o
“Modo de programador” e escolha “Carregar expandida”, selecionando a pasta
extraída que contém `manifest.json`. Se a opção não aparecer, a instalação de
extensões de outras lojas pode estar bloqueada por uma política do dispositivo.
