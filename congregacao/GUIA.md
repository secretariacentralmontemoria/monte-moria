# Finanças da Congregação — guia rápido (Centro Monte Moriá)

## 1. Instalar no telemóvel (modo de instalação — Android e iPhone)
A aplicação instala-se a partir do seu **endereço** (ex.: `https://secretariacentralmontemoria.github.io/monte-moria/congregacao/`),
não do ficheiro `.html`. Envie o link ou mostre o **código QR** (página inicial do site, ou Definições ›
«Aplicação no telemóvel» › «Mostrar código QR»: o outro telemóvel aponta a câmara e abre o link).
Na primeira abertura num telemóvel aparece sozinho o assistente **«Instalar Finanças da Congregação»**:
- **Android (Chrome, Edge, Samsung Internet):** botão **«Instalar aplicação»** — um toque.
- **iPhone (Safari):** **Partilhar** › **«Adicionar ao ecrã principal»** › **Adicionar** (no iOS 26, primeiro os **três pontos ⋯**;
  deixe ligada «Abrir como app web»). A Apple não deixa instalar por botão: o assistente mostra os passos.
- **Chrome no iPhone, WhatsApp, Facebook:** o assistente manda abrir o link no Safari (iPhone) ou no Chrome (Android).
Depois abre-se pelo **ícone**, em ecrã inteiro, e funciona **sem internet**. Até instalar, a instalação está sempre à mão:
ligação no ecrã de entrada, faixa no topo, botão ⤓ no cabeçalho e cartão em Definições.

**Cuidados no iPhone:**
1. O ficheiro `.html` recebido no WhatsApp, no e-mail ou em Ficheiros abre só em **pré-visualização** e não funciona
   (aparece o aviso «A aplicação não está a correr»).
2. **Instale antes de escrever dados**: o iPhone guarda os dados do ícone e os do Safari em separado. No Safari sem ícone,
   os dados de sites não visitados há 7 dias podem ser apagados; no ícone isso não acontece.
3. Funciona a partir do **iOS 12**. Se algo falhar aparece o quadro «A aplicação não arrancou correctamente»: tire uma
   captura de ecrã e envie-a à tesouraria central. Com navegação privada ou «Bloquear todos os cookies» ligado,
   a aplicação avisa que não consegue guardar dados.

**Computador ou Android sem instalar:** o ficheiro único `Financas_Congregacao_MonteMoria_offline.html` abre no Chrome, no Edge
ou no Firefox e funciona sem internet, mas não se instala.

## 2. Entrada obrigatória e utilizadores padrão
A aplicação abre sempre no ecrã **Entrar**. Utilizadores criados automaticamente:

Utilizadores iniciais: **admin** (tudo), **SECRETARIA** (edita a Secretaria, vê as Finanças) e **FINANCAS** (edita as Finanças,
vê a Secretaria). As palavras-passe iniciais são entregues pelo administrador e **não estão escritas neste repositório**.

O nome do utilizador pode ser escrito em maiúsculas ou minúsculas; a palavra-passe respeita maiúsculas.
**O administrador deve mudar as três palavras-passe** em Definições › Utilizadores (aparece o aviso «palavra-passe padrão»).
**Definições › Nomes**: o utilizador SECRETARIA muda o nome do secretário; FINANCAS muda o do tesoureiro; ambos mudam
a congregação e o líder. Estes nomes aparecem nas assinaturas do relatório e da Informação. ⏻ termina a sessão.

## 3. Todos os dias / semanas
**Lançamentos** → Data, Tipo (Entrada/Despesa), Categoria, Descrição, Valor → «Guardar lançamento».
Repasses ao Centro registam-se como **Despesa** nas categorias **«50% para o Centro»** e **«Missões (envio ao Centro)»**.
**Valores:** escreva como é costume: **150.000**, **150 000**, **1 500,50** ou **1500,50** (o teclado do telemóvel mostra os
algarismos e a vírgula). «3.000» lê-se como três mil; «3,000» é recusado por ser ambíguo.

## 3b. Folha do relatório e impressão
A folha segue o modelo do Centro: Entrada do mês, Total parcial, Total de entradas do mês, Total de entradas mais saldo anterior,
Despesas, Subtotal, secções (Manutenção, Alimentação…), Total de despesas e Saldo a transitar.
**Avançado (admin)**: mudar os rótulos das linhas e mover/renomear categorias (linha ou secção com subtotal).
**Imprimir…**: A4 retrato alinhado por omissão; escolher também a lista de lançamentos ou a Informação da Secretaria e outro papel.

## 4. Cópia de segurança (backup) — pelo menos 1× por semana
**Definições › Fazer cópia de segurança** → guarde o ficheiro `Copia_….json` no Drive, e-mail ou computador.
Para recuperar (telemóvel novo ou dados apagados): **Restaurar cópia** → escolher o ficheiro.
A cópia NÃO é o envio para a sede: serve só para não perder dados.

## 5. Fim do mês — enviar para a tesouraria central
1. **Relatório**: confira saldo anterior, entradas, despesas e saldo a transitar.
2. **Enviar** → escolha o formato:
   - **Pacote para o sistema (.json)** — recomendado: importa-se sem erros e a sede vê «✔ integridade verificada»;
   - **Excel (.xlsx)** ou **CSV (;)** — também se importam (sem verificação de integridade);
   - **Resumo em texto** — para WhatsApp/SMS, só informativo.
3. No telemóvel abre-se **Partilhar**: escolha WhatsApp, e-mail, Drive… (em computadores o ficheiro vai para Transferências).
   No iPhone, se aparecer a janela «Ficheiro pronto», toque em «Partilhar».
   Marque «Enviar todos os meses» para reenviar um histórico completo.

## 6. Secretaria da congregação
**Secretaria** → «+ Nova informação» → preencha Assunto, Destinatário, Saudação e Fecho → «+ Acrescentar» em cada categoria
(Pena disciplinar, Exonerações, Nomeações, Casamentos…) → as categorias ficam ordenadas por criticidade →
as **secções sem itens não aparecem na folha** (a opção «Mostrar na folha as secções sem itens» volta a mostrá-las) e, ao **imprimir** ou exportar para **Word**, pode escolher «Ocultar as secções em branco» — as secções preenchidas mantêm sempre a ordem dos assuntos (ex.: só aparece «Pena disciplinar» se tiver itens) → o envio à sede leva só as secções preenchidas →
«Ocultar campos» deixa só a folha →
«Imprimir / PDF», «Word (.doc)» ou **«Enviar à sede (.json)»**. Na sede: **Secretaria › Importar das congregações**.

## 6b. Membros, Ficha e Inventário (como no sistema da sede)
**Membros** → «+ Novo membro»: dados pessoais, contactos, endereço, filiação, dados eclesiásticos, observação e fotografia
(reduzida automaticamente para poupar espaço). Pesquisa por nome, BI, telefone ou nº do cartão; filtros por situação, género,
departamento e faixa etária. **Importar** aceita Excel, CSV e JSON — incluindo a cópia do sistema da sede: escolha a igreja
(ex.: CONG_MONTE SINAI) e só entram os membros que ainda não existem (mesmo BI, ou mesmo nome e data de nascimento).
«Eliminados» repõe membros apagados por engano.
**Ficha** → escolha o membro (ou escreva o nome) → **Imprimir / PDF (A4)**: a mesma ficha individual do sistema da sede, com as
assinaturas do secretário e do líder.
**Inventário** → «+ Novo item»: item, categoria, quantidade, estado (Bom, Razoável, Mau, Danificado), localização, data de
aquisição e valor unitário; exportar em Excel/CSV e imprimir.
**Enviar à sede**: no separador Membros (ou em Enviar) → «Base de dados dos membros (.json)». Na sede: Base de Dados ›
**«+ Base de Dados Extra»** → escolher o ficheiro (os membros já registados são ignorados).
**Quem pode:** o perfil SECRETARIA edita os membros e fichas e vê o inventário; FINANCAS edita o inventário e vê os membros;
o administrador muda isto em Definições › Utilizadores («Membros e fichas» e «Inventário»).
Os membros e o inventário entram na **cópia de segurança**.

## 7. Opções avançadas (administrador, com PIN)
**Definições › Abrir opções avançadas** → defina um PIN (4–8 algarismos) → personalize títulos dos separadores e dos campos,
cabeçalho, títulos do relatório, assinaturas (Tesoureiro e Líder), cores, letra, posições dos campos e do relatório, categorias.
As categorias da Secretaria (criar, editar, criticidade, ordem) também pedem o PIN.

## 8. Na sede — anexar e compilar (sistema principal)
**Finanças › Congregações › Importar ficheiro da congregação** → escolher o ficheiro recebido →
ver a **pré-visualização** (meses, nº de lançamentos, totais, integridade, «novo / substitui / já importado») → **Importar**.
- A mesma versão não entra duas vezes; uma versão nova do mesmo mês substitui a anterior.
- A tabela mostra o consolidado e as congregações **em falta** no mês.
- **Lançar repasses no Centro** cria no relatório do Centro as entradas «50 % provenientes das congregações» e «Missões»
  (sem duplicar). **Exportar compilação (Excel)** junta todas as congregações num livro.

## 9. Ficheiros (técnico)
```
index.html            página (aviso de pré-visualização, separadores, formulários) — sem estilos nem scripts embutidos
styles.css            modo claro/escuro, telemóvel, ajustes do iPhone, impressão A4
compat.js             1.º script (ES5): compatibilidade com iPhones antigos (janelas, Blob…) e quadro de diagnóstico
instalar.js           modo de instalação: assistente Android/iPhone, botão «Instalar», faixa, link e código QR
app.js                lançamentos, relatório, envio, cópias de segurança, opções avançadas, partilha
secretaria.js         Informação da Secretaria
auth.js               entrada obrigatória, utilizadores e privilégios
manifest.webmanifest, sw.js (modo offline), logo.png, icons/ (ícones do ecrã principal), vendor/ (SheetJS e códigos QR)
```
Esta pasta já é a versão convertida para funcionar a partir do iOS 12 (gerada a partir do código-fonte comentado).
