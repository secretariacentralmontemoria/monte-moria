# Centro Monte Moriá — Sistemas (GitHub Pages)

Site estático pronto para o **GitHub Pages**:

```
/                      página inicial (index.html, inicio.css, inicio.js: código QR para instalar; vendor/qrcode.min.js)
├── sistema/           Sistema de Gestão de Membros (V23) — computador da sede
│   ├── index.html
│   ├── css/  js/  vendor/
│   └── data/seed.js   versão pública: SEM dados pessoais (só o logótipo)
├── congregacao/       Finanças e Secretaria da Congregação — telemóvel, funciona sem internet
│   ├── index.html  styles.css  compat.js  instalar.js  app.js  secretaria.js  auth.js
│   ├── manifest.webmanifest  sw.js  logo.png  icons/  vendor/
│   └── GUIA.md        (versão convertida para funcionar a partir do iOS 12)
├── frota/             Frota Ebenézer — gestão das embarcações (instalável, funciona sem internet; não aparece na página inicial)
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

**Passar os dados actuais para a versão publicada** (computador da sede):
1. Na versão local que já usa (ficheiro .html): Base de Dados → **Exportar cópia (.json)**.
2. Na versão publicada (`…/sistema/`): Base de Dados → **Importar backup (substituir)** → escolher esse ficheiro.
3. Guarde o ficheiro .json num local privado. **Nunca o carregue para o GitHub.**

## 4. Segurança — ler antes de publicar

- **Não publique** a versão local `Centro_Monte_Moria_Sistema_Gestao_Membros_V23.html` nem cópias de segurança:
  contêm dados pessoais (membros, disciplina, finanças). Esta pasta já vem sem esses dados.
- O repositório é **público**: qualquer pessoa pode ver o código. As palavras-passe iniciais da aplicação das congregações
  **não estão no código** (só as suas impressões digitais), mas devem ser **mudadas logo** em Definições › Utilizadores.
- No sistema da sede, defina a palavra-passe de administrador na primeira entrada e crie os utilizadores com privilégios.
- A entrada protege o uso diário; quem tiver acesso técnico ao aparelho pode ler o armazenamento do navegador.
  Use aparelhos com bloqueio de ecrã e faça cópias de segurança regularmente.

## 5. Actualizar

Substitua os ficheiros alterados (Upload files) e faça *Commit*. Para os telemóveis receberem a versão nova da aplicação
das congregações, mude o nome da cache em `congregacao/sw.js` (ex.: `mm-congregacao-v5` → `mm-congregacao-v6`)
e abra a aplicação com internet uma vez.
