# Frota Ebenézer — Gestão das Embarcações (guia rápido)

## Estrutura dos ficheiros
```
frota/
├── index.html              página: aviso de pré-visualização, menu vertical, secções (sem estilos nem scripts embutidos)
├── styles.css              variáveis :root, modo claro/escuro, menu e gaveta no telemóvel, ajustes do iPhone, impressão A4
├── js/compat.js            1.º script (ES5): compatibilidade com iPhones antigos (janelas, ResizeObserver…) e diagnóstico
├── js/nucleo.js            estado, formulários (valores em Kz com vírgula), tabelas, permissões, impressão, partilha
├── js/graficos.js          motor de gráficos e indicadores interactivos (barra de ferramentas, detalhe, editor)
├── js/imagem.js            imagem PNG das folhas desenhada num canvas (funciona no Safari do iPhone)
├── js/auth.js              entrada obrigatória, utilizadores padrão, privilégios por área
├── js/marca.js             personalização (nome, logótipo, cores, letra), menu recolhível, fotografia do utilizador
├── js/barcos.js            Embarcações (datas de implementação) e Colaboradores (aniversários)
├── js/embarcadores.js      Colaboradores › Embarcadores (embarque, desembarque, dias a bordo)
├── js/financas.js          Entradas (valor + manutenção), Saídas, Avançado — salário, Gráficos e comparação
├── js/contas.js            Contas de viagem com cálculo automático e regra de distribuição editável
├── js/salarios.js          Controlo de salários pagos (valores devidos, pagamentos parciais, recibos)
├── js/inventario.js        Viagens: partida × chegada, alertas, observações
├── js/painel.js            Painel personalizável por utilizador
├── js/dados.js             Exportar (.json, Excel, CSV, texto, imprimir, imagem), enviar, compilar, cópias
├── js/instalar.js          MODO DE INSTALAÇÃO: assistente Android/iPhone, botão «Instalar», faixa, link e código QR
├── js/arranque.js          arranque
├── vendor/                 Chart.js, etiquetas de valores (datalabels), SheetJS e gerador de códigos QR — sem internet
├── icons/                  ícones PNG do ecrã principal (iPhone 180 px, Android 192/512 px)
├── manifest.webmanifest, sw.js (modo offline), icon.svg
└── ferramentas/construir.py   gera dist/web (para publicar) e o ficheiro único, compatíveis com iOS 12 ou mais recente
                               (--url https://… grava o endereço público: o ficheiro único passa a mostrar o link de instalação)
```
O código em `js/` é moderno e comentado; `ferramentas/construir.py` (Python 3 + `npm install esbuild`) converte-o
para os iPhones antigos. **Publique sempre o conteúdo de `dist/web`** e envie o ficheiro único de `dist/`.

## Entrar
Utilizadores padrão (maiúsculas e acentos são aceites no nome do utilizador):

| Utilizador | Finanças | Inventário | Embarcações / Colaboradores | Outros |
|---|---|---|---|---|
| ADMIN | editar | editar | editar | utilizadores, regra de salário, compilar, restaurar |
| FINANÇAS | editar | só ver | só ver | exportar e enviar |
| INVENTÁRIO | sem acesso | editar | só ver | exportar e enviar |

As palavras-passe iniciais são entregues pelo administrador e não ficam escritas no código. **Mude-as** em Utilizadores.

## Finanças
- **Entradas**: embarcação, data, descrição, **Valor** (receita) e **Manutenção** (fundo da embarcação). Coluna «Acumulado».
- **Saídas**: «Caixa» desconta só na parte da empresa; «Manutenção» desconta só no fundo de manutenção.
- **Avançado — salário** (regra padrão, editável/eliminável pelo administrador): a empresa retém 60 % das entradas;
  do restante, 60 % para o 1.º representante e 40 % para o 2.º. O que é pago aos representantes sai; o resto fica em caixa.
  Exemplo: 100 000 Kz → empresa 60 000 → restante 40 000 → 1.º 24 000, 2.º 16 000 → caixa 60 000 (menos as saídas de caixa).
- **Gráficos e comparação**: acumulado financeiro, entradas por mês e embarcação, comparação entre dois meses.

## Contas de viagem (cálculo automático)
«+ Nova conta» → valor bruto → despesas (várias linhas) → descontos (Dívida, Adiantamento, Outros — lista editável).
Valor a distribuir = bruto − despesas − descontos. Regra padrão (editável/eliminável pelo administrador):
10 % manutenção da chata + 10 % mestre + 10 % embarcadores; o remanescente 50 % empresa e 50 % tripulação.
Exemplo: 3 000 000 − 500 000 − 100 000 = 2 400 000 → 240 000 × 3 → remanescente 1 680 000 → 840 000 + 840 000.
Cada conta guarda a regra com que foi feita. «Gerar salários» cria os valores a pagar.

## Salários pagos
Valores devidos (manuais ou das contas) com pagamentos parciais (data, valor, método, recibo n.º automático);
estados Pendente / Parcial / Pago / Em atraso; vistas por beneficiário e por mês; recibos imprimíveis ou em imagem.

## Inventário
«+ Nova viagem» → quantidades na **partida** e na **chegada**. Diferenças = **alerta** vermelho (e aviso no ecrã);
contagem em falta também é alerta; itens consumíveis (combustível, água) mostram **consumo** sem alerta.
Observação por item e observações gerais. «Itens do inventário…» acrescenta, renomeia ou remove itens e categorias.

## Embarcações, colaboradores e painel
- **Embarcações**: data de implementação → tempo de actividade calculado (anos, meses); representantes; observações.
- **Colaboradores**: nome, nascimento, morada, contacto, função, cargo, embarcação; alertas de aniversário (30 dias).
- **Embarcadores** (sub-aba de Colaboradores): quem embarcou, em que embarcação, embarque, desembarque, dias a bordo;
  não deixa a mesma pessoa a bordo de duas embarcações nas mesmas datas.
- **Painel**: «+ Gráfico» e «+ Indicador» (dados, medida, agrupamento, filtros, tipo, cor, números, altura);
  em cada gráfico: ⇄ tipo · 123 números · ⬇ imagem · ⛶ ampliar · ✎ editar · ↑↓ mover · 👁 esconder · ✕ remover;
  clicar numa barra mostra os registos. «Personalizar…» mostra/esconde, ordena, edita e repõe.
- **Personalização** (administrador): nome, subtítulo, logótipo, cores e letra. Cada utilizador põe a sua fotografia
  clicando no nome no menu. O menu recolhe-se («) e no telemóvel abre com ☰.

## Dados, envio e compilação
1. Cada aparelho: **Dados e cópias › Pacote para compilar (.json)** → Partilhar (WhatsApp, e-mail, Drive).
2. Administrador: **Compilar › Importar pacotes (.json)** (vários de uma vez) → pré-visualização → Compilar.
   As embarcações reconhecem-se pelo nome; registos repetidos não se duplicam; a versão mais recente substitui a anterior.
3. **Cópia de segurança** semanal (guardar fora do aparelho); **Restaurar** só pelo administrador.

## Valores em Kz
Os campos de valor aceitam a escrita habitual em Angola: **3.000.000**, **3 000 000**, **1 500 000,50** ou **1500,50**
(o teclado do telemóvel mostra os algarismos e a vírgula). «3.000» lê-se como três mil. «3,000» é recusado por ser ambíguo.

## Instalar (modo de instalação — Android e iPhone)
A aplicação instala-se a partir do seu **endereço** (link do GitHub Pages), não do ficheiro `.html`.
Ao abrir o endereço num telemóvel pela primeira vez, aparece sozinho o assistente **«Instalar Frota Ebenézer»**:
- **Android (Chrome, Edge, Samsung Internet):** botão **«Instalar aplicação»** — um toque e fica no ecrã principal e na lista de aplicações.
- **iPhone (Safari):** o assistente mostra os passos — **Partilhar** › **«Adicionar ao ecrã principal»** › **Adicionar**
  (no iOS 26, primeiro os **três pontos ⋯**; deixe ligada «Abrir como app web»). A Apple não deixa instalar por botão.
- **Chrome no iPhone, WhatsApp, Facebook:** o assistente manda abrir o link no Safari (iPhone) ou no Chrome (Android).
Depois de instalada, abre pelo ícone em ecrã inteiro e funciona **sem internet**; o assistente deixa de aparecer.
Se escolher «Continuar no navegador», a instalação continua disponível na ligação do ecrã de entrada, na faixa do topo e no menu
**«Instalar aplicação»**. Com a aplicação instalada, o mesmo item chama-se **«Partilhar a aplicação»**: envia o link
(WhatsApp, SMS, e-mail) ou mostra o **código QR** para outro telemóvel apontar a câmara.

### Cuidados no iPhone
1. O ficheiro `.html` recebido no WhatsApp, no e-mail ou em Ficheiros abre só em **pré-visualização** e não funciona
   (aparece o aviso «A aplicação não está a correr»): envie sempre o **link** ou mostre o **código QR**.
2. **Instale antes de escrever dados**: o iPhone guarda os dados do ícone e os do Safari em separado.
   Se já tiver dados no Safari, faça uma cópia de segurança e restaure-a na aplicação instalada.
3. No Safari sem ícone, o iPhone apaga os dados de sites não visitados há 7 dias; no ícone isso não acontece.
   Mesmo assim, faça a **cópia de segurança semanal**.
4. Funciona a partir do **iOS 12**. Se algo falhar aparece o quadro «A aplicação não arrancou correctamente»:
   tire uma captura de ecrã e envie-a ao administrador. Com navegação privada ou «Bloquear todos os cookies» ligado,
   a aplicação avisa que não consegue guardar dados.
- **Partilhar** abre o WhatsApp, o e-mail ou «Guardar em Ficheiros». Se aparecer a janela «Ficheiro pronto», toque em «Partilhar».
- **PDF**: Imprimir › na pré-visualização, Partilhar › Guardar em Ficheiros.

### Android e computador
O mesmo endereço instala-se no Chrome ou no Edge (botão «Instalar aplicação» ou menu › «Instalar…»).
O ficheiro único `Frota_Ebenezer_offline.html` funciona no Android e no computador, mas não se instala: serve de alternativa sem internet.
