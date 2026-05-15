# Estudie

**Produtividade no seu ritmo, sem overhead.** O **Estudie** é um timer de foco e pausa que roda inteiro no **navegador**: perfis estilo Pomodoro, anel de progresso, tarefa opcional na tela, ruído **rosa** e trilhas **MP3 locais**, sem backend e sem passo de build.

---

## Destaques

| | |
|--|--|
| **Privacidade** | Preferências e tarefa ficam no navegador; nada é enviado para um servidor seu. |
| **Som flexível** | Rosa sintética (Web Audio API) ou música a partir da pasta `audio/`. |
| **Vários ritmos** | Pomodoro clássico, deep work, manutenção e blocos curtos — minutos editáveis. |
| **Acessível e prático** | Atalho **Espaço** para play/pause; vibração ao terminar o bloco (quando o dispositivo permite). |
| **Hardening** | CSP e outras políticas no `index.html` + arquivo **`_headers`** para hospedagem estática (ex.: Netlify; no **GitHub Pages** só valem as políticas em `<meta>`, não o `_headers`). |

---

## Funcionalidades

| Área | Descrição |
|------|-----------|
| **Perfis** | Pomodoro (25/5), Deep work (45/15), Manutenção (50/10), Low effort (20/10), com minutos editáveis. |
| **Timer** | Anel de progresso, modos Foco / Pausa, Iniciar · Pausar · Continuar, Zerar, **+5 min** no bloco. |
| **Tarefa** | Campo opcional; texto salvo no `localStorage` e visível no anel em modo foco. |
| **Som** | Ruído rosa e música via `<audio>` a partir de `audio/`; pré-carregamento ao mudar a trilha; volume compartilhado. |
| **Atalho** | **Espaço** — play/pause do timer (não atua dentro de `input`, `textarea` ou `select`). |


---

## Autoria

**Maria Fernanda Lira** — Desenvolvedora Jr.

- **E-mail:** [mariafernandalira072022@gmail.com](mailto:mariafernandalira072022@gmail.com)
- **GitHub:** [@maliraa07](https://github.com/maliraa07)

---

## Stack

HTML5 · CSS3 · JavaScript (vanilla) · Web Audio API · `localStorage` · Google Fonts (DM Sans)

---

## Estrutura de pastas

```
Projeto_Estudie/
├── index.html          # UI, textos, políticas de segurança no <head>, #devCredit
├── _headers            # Cabeçalhos HTTP (Netlify); referência para outros hosts
├── css/
│   └── styles.css
├── js/
│   └── app.js          # timer, som, MUSIC_TRACKS, localStorage
├── audio/              # MP3 locais (nomes alinhados com app.js)
│   ├── ATRIBUICAO.txt  # créditos das trilhas Kevin MacLeod (se você usar esses arquivos)
│   └── *.mp3
└── README.md
```

---

## Trilhas em `audio/`

O menu lê a lista **`MUSIC_TRACKS`** em `js/app.js`. Por padrão, espera estes arquivos. Cada `url` deve ser um caminho relativo em **`audio/…`**, terminar em **`.mp3`**, e **não** conter `..` nem `http(s)://` (o código recusa outros padrões antes de atribuir ao `<audio>`).

| Arquivo | Nome no menu |
|---------|----------------|
| `audio/calma.mp3` | Calma |
| `audio/foco.mp3` | Foco |
| `audio/leve.mp3` | Leve |
| `audio/ambiente.mp3` | Ambiente |
| `audio/estudo.mp3` | Estudo |


### Trilhas Kevin MacLeod (exemplo incluído)

Se o repositório trouxer os MP3 baixados do [Incompetech](https://incompetech.com/), consulte **`audio/ATRIBUICAO.txt`** e as regras de licença no site do autor (atribuição / uso comercial, etc.).


---

## Segurança e hospedagem

O `index.html` inclui **Content-Security-Policy** (CSP), **Referrer-Policy**, **Permissions-Policy** e **X-Content-Type-Options** via `<meta>` para reduzir XSS, injeção de conteúdo e vazamento de referrer em ambientes só com arquivos estáticos.

Na **hospedagem com HTTPS** (recomendado), repita os mesmos cabeçalhos no servidor ou na CDN para não depender só do HTML: na **Netlify** você pode usar o arquivo **`_headers`** na raiz do repositório (já incluído). No **GitHub Pages**, valem as políticas em `<meta>` no `index.html`; o `_headers` não é aplicado pelo Pages. Em outros hosts, copie os valores do `_headers` ou do `<meta http-equiv="Content-Security-Policy" …>` para a configuração equivalente (Apache `Header set`, Nginx `add_header`, Cloudflare “Transform Rules”, etc.).

**Limitações honestas:** um site estático sem backend não substitui a segurança do seu repositório ou da conta de deploy. O que essas camadas fazem é endurecer o **navegador** do visitante, reforçar **HTTPS** e desativar embutir a página em `iframe` externo (`frame-ancestors 'none'`). Use **2FA** e permissões mínimas onde o código é publicado.

---

## Licença do código

O **código** do app é independente das **licenças das músicas** em `audio/`, que continuam por conta do autor ou da fonte de onde você obteve os arquivos.
