# Centro Monte Moriá — Sistemas (GitHub Pages)

Site estático pronto para o **GitHub Pages**:

```
/                      página inicial (index.html, inicio.css, inicio.js: código QR para instalar; vendor/qrcode.min.js)
├── sistema/           Sistema de Gestão de Membros (V26) — computador da sede (instalável, funciona sem internet)
│   ├── index.html  manifest.webmanifest  sw.js  icons/
│   ├── css/  js/  vendor/   (js/00-boot-v24.js lê a base do navegador e carrega os módulos pela ordem)
│   └── data/seed.js   versão pública: SEM dados pessoais (só o logótipo)
├── congregacao/       Finanças e Secretaria da Congregação — telemóvel, funciona sem internet
│   ├── index.html  styles.css  compat.js  instalar.js  app.js  secretaria.js  auth.js
│   ├── manifest.webmanifest  sw.js  logo.png  icons/  vendor/
│   └── GUIA.md        (versão convertida para funcionar a partir do iOS 12)
├── frota/             Frota Ebenézer — gestão das embarcações (instalável, funciona sem internet; não aparece na página inicial)
├── dpdore/            DPDORE V9.0 — Sistema de Gestão Operacional (instalável; sem dados nem palavra-passe predefinida; não aparece na página inicial)
├── .nojekyll          o GitHub publica os ficheiros tal como estão
└── .gitignore         impede o envio de cópias de segurança e exportações
```

## 1. Publicar (uma vez)

1. Em github.com: **New repository** → nome, por exemplo `monte-moria` → **Public** → *Create repository*.
   (Com conta gratuita, o GitHub Pages só funciona em repositórios públicos.)
2. **Add file → Upload files** → arraste **o conteúdo** desta pasta (index.html, inicio.css, logo.png, as pastas
   `sistema` e `congregacao`, `.nojekyll`, `.gitignore`, README.md) → *Commit changes*.
   Os ficheiros que começam por ponto podem ficar ocultos no seu computador: mostre-os ou crie-os no GitHub
   com **Add file → Create new file**.
3. **Settings → Pages** → *Build and deployment* → **Source: Deploy from a branch** → Branch **main**, pasta **/ (root)** → *Save*.
4. Ao fim de 1 a 2 minutos o site fica em:
   - `https://secretariacentralmontemoria.github.io/monte-moria/` (página inicial)
   - `https://secretariacentralmontemoria.github.io/monte-moria/sistema/` (sistema da sede)
   - `https://secretariacentralmontemoria.github.io/monte-moria/congregacao/` (aplicação das congregações)
   - `https://secretariacentralmontemoria.github.io/monte-moria/frota/` (Frota Ebenézer — enviar o link só a quem a usa)
   - `https://secretariacentralmontemoria.github.io/monte-moria/dpdore/` (DPDORE — enviar o link só a quem o usa)

Repositório: https://github.com/secretariacentralmontemoria/monte-moria (público). Com git: `git add . && git commit -m "Actualização" && git push`.

## 2. Instalar a aplicação das congregações no telemóvel (modo de instalação)

Envie aos utilizadores o **endereço** `…/congregacao/` — **não o ficheiro .html** (no iPhone, o ficheiro aberto a partir do WhatsApp,
do e-mail ou de Ficheiros fica em pré-visualização e não funciona). A página inicial do site mostra um **código QR**:
o telemóvel aponta a câmara e abre a aplicação.

Na primeira abertura num telemóvel aparece sozinho o assistente de instalação:
- **Android:** botão **«Instalar aplicação»** (um toque);
- **iPhone (Safari):** **Partilhar** › **«Adicionar ao ecrã principal»** › Adicionar (no iOS 26, primeiro os três pontos ⋯).

Depois abre-se pelo **ícone**, em ecrã inteiro, e funciona **sem internet**. No iPhone, instale **antes** de escrever dados
(o iPhone guarda os dados do ícone e os do Safari em separado). Funciona a partir do iOS 12; se algo falhar aparece
um quadro de diagnóstico: peça uma captura de ecrã. Entrada obrigatória com utilizador e palavra-passe.

## 3. Onde ficam os dados

O GitHub só guarda **o programa**. Os dados (membros, finanças, Secretaria) ficam **no navegador de cada aparelho**
e nunca são enviados para o GitHub.

Os dados ficam na base de dados interna do navegador (IndexedDB, sem o limite de 5 MB) e, se quiser, também num ficheiro
do computador / OneDrive (Aparência & Configuração › «Onde ficam os dados»).

**Cópia de segurança completa** (Painel › **Cópia de segurança**, ou Aparência & Configuração › «Cópia de segurança completa»):
um único ficheiro com **todos** os dados e **toda** a personalização — membros, registos, finanças, cultos, inventário,
actividades, organigrama, secretaria, lixeira, utilizadores e permissões, logótipo, listas, campos, gráficos, painéis, cores,
abas próprias, registo de actividades, recuperação da palavra-passe, tema e menu. Opcional: incluir os estados anteriores
(aba Eventos) e proteger o ficheiro com palavra-passe (AES-256). O ficheiro leva uma verificação de integridade (SHA-256).

**Restaurar / passar os dados para outro computador ou para a versão publicada:**
1. No computador de origem: **Cópia de segurança** › *Exportar cópia completa*.
2. No destino (`…/sistema/` ou o ficheiro .html): Base de Dados › **Restaurar cópia (substituir)** (ou *Restaurar uma cópia…*)
   → escolher o ficheiro → rever a comparação (o que existe agora e o que vem na cópia) → *Substituir tudo e restaurar*.
3. O estado anterior fica em **Eventos** («Antes de restaurar a cópia de segurança») para poder voltar atrás.
   Aceita também as cópias antigas (*Exportar cópia (.json)* e *Backup completo* das versões V10–V25).
4. Guarde o ficheiro .json num local privado. **Nunca o carregue para o GitHub.**

**Instalar no computador da sede:** abra `…/sistema/` no Chrome ou no Edge › ícone **Instalar** na barra de endereço.
Depois abre como programa e funciona sem internet (com internet carrega sempre a versão publicada mais recente).

## 4. Segurança — ler antes de publicar

- **Não publique** a versão local `Centro_Monte_Moria_Sistema_Gestao_Membros_V26.html` nem cópias de segurança:
  contêm dados pessoais (membros, disciplina, finanças). Esta pasta já vem sem esses dados.
- O repositório é **público**: qualquer pessoa pode ver o código. As palavras-passe iniciais da aplicação das congregações
  **não estão no código** (só as suas impressões digitais), mas devem ser **mudadas logo** em Definições › Utilizadores.
- No sistema da sede, defina a palavra-passe de administrador na primeira entrada e crie os utilizadores com privilégios.
- A entrada protege o uso diário; quem tiver acesso técnico ao aparelho pode ler o armazenamento do navegador.
  Use aparelhos com bloqueio de ecrã e faça cópias de segurança regularmente.

## 5. Actualizar

Substitua os ficheiros alterados (Upload files) e faça *Commit*. Para os telemóveis receberem a versão nova da aplicação
das congregações, mude o nome da cache em `congregacao/sw.js` (ex.: `mm-congregacao-v5` → `mm-congregacao-v6`)
e abra a aplicação com internet uma vez. O sistema da sede (`sistema/`) actualiza-se sozinho quando abre com internet
(o nome da cache em `sistema/sw.js` e os `?v=` em `sistema/index.html` mudam em cada versão).

## 6. DPDORE (pasta `dpdore/`)

- **Instalar:** abrir `…/monte-moria/dpdore/` no Chrome / Edge › ícone **Instalar** (Android: «Instalar aplicação»; iPhone: Partilhar › Adicionar ao ecrã principal).
- **Utilizadores iniciais (em cada aparelho novo):** `admin`, `planeamento` e `survey`. As palavras-passe iniciais são entregues pelo
  administrador — **não estão no código** (só as suas impressões digitais SHA-256). No **primeiro acesso** cada utilizador é obrigado a
  escolher uma palavra-passe nova (a janela não se fecha sem isso); a inicial deixa de funcionar. `planeamento` edita Planeamento,
  Viabilidade e Análise de cobertura; `survey` edita o Controlo de Survey; ambos vêem as restantes abas.
  Depois: Cópias de segurança › **Importar cópia** com a cópia exportada da versão local.
- **Segurança da versão publicada:** sem dados (o `js/data.js` está vazio); política de segurança de conteúdos (CSP: só scripts do próprio site,
  sem ligações a outros servidores além das fontes); sem indexação nos motores de pesquisa; palavras-passe guardadas só como impressão digital (SHA-256);
  bloqueio após 5 tentativas; sessão termina por inactividade; os dados ficam só no navegador de cada aparelho.
- **Nunca** carregue para o GitHub cópias de segurança (`DPDORE_copia_*.json`), exportações Excel nem o ficheiro local `DPDORE_Sistema_Gestao_Operacional_V9_0.html` (contém os dados iniciais).
