// Case studies for the three projects in the Projects section.
// Media comes from tools/prepare-projects.mjs (src/assets/projects/<id>/).
// A step's `at` is where that part starts in the full walkthrough, in seconds.
const files = import.meta.glob('./assets/projects/*/*.{mp4,webp}', { eager: true, query: '?url', import: 'default' });
const m = (id, name) => files[`./assets/projects/${id}/${name}`];
const clip = (id, name) => ({ type: 'clip', src: m(id, `${name}.mp4`), poster: m(id, `${name}.webp`) });
const shot = (id, name, extra = {}) => ({ type: 'img', src: m(id, `${name}.webp`), ...extra });

export const projects = [
  {
    id: 'chief',
    kind: 'AI email and calendar assistant · built with AI',
    title: 'Chief of Staff',
    url: 'chief-of-staff-web-five.vercel.app',
    ratio: '1100 / 516',
    intro: 'An AI chief of staff that reads Gmail and Google Calendar, triages every email, drafts the replies, preps each meeting and briefs you every morning and evening, out loud if you like. I came up with the idea and built it with Claude Code, directing the interface, the brief pipeline, the security and the deployment.',
    tags: ['Node.js', 'Claude API', 'Google OAuth 2.0', 'Gmail and Calendar APIs', 'Upstash Redis', 'GitHub Actions', 'Vercel'],
    links: [{ label: 'Open the live demo', href: 'https://chief-of-staff-web-five.vercel.app' }],
    note: 'The demo needs no sign-in: a sample founder’s day with the real model behind a daily cap.',
    film: { src: m('chief', 'film.mp4'), poster: m('chief', 'film.webp'), length: '1:43', sound: true },
    loop: clip('chief', 'loop'),
    steps: [
      {
        chapter: 'Boot', at: 20.6, title: 'One room, one light source', media: clip('chief', 'boot'),
        text: 'The interface is built around one idea: the orb is the room’s light source. Its colour is the AI’s state (teal idle, violet thinking, blue listening, cyan speaking, green done), and that light falls on every panel from the orb’s direction. On boot, the system checks type in, the orb ignites and the room is revealed outward as Gmail, Calendar, memory and the brief engine connect.',
      },
      {
        chapter: 'Inbox triage', at: 26.5, title: 'Every email gets one action', media: clip('chief', 'triage'),
        text: 'Each email is sorted into <b>Reply, Delegate, Archive or FYI</b> with a one-line reason. Newsletters and receipts are filtered out, calendar conflicts are flagged, a focus block is protected and to-dos are pulled straight out of the messages.',
      },
      {
        chapter: 'Reply drafts', at: 38.6, title: 'Replies already drafted', media: clip('chief', 'drafts'),
        text: 'Every Reply email arrives with a draft in your tone. One click saves it to <b>Gmail Drafts</b>. Nothing is ever sent automatically, so you stay in charge of every word that leaves the inbox.',
      },
      {
        chapter: 'The brief', at: 50.4, title: 'A brief the model cannot make up', media: clip('chief', 'brief'),
        text: 'Run a brief and the orb turns violet while it works. The server fetches inbox metadata, snippets and the calendar, and Claude must answer in a <b>strict JSON schema</b>: triage, drafts, meeting prep, focus block and priorities. The server merges that answer with the real Gmail and Calendar data, so the model <em>cannot invent an email or a meeting</em>. Progress streams to the browser as NDJSON, and the finished brief can be read aloud with a highlighter following along.',
      },
      {
        chapter: 'Ask by voice', at: 70.4, title: 'Ask anything, out loud', media: clip('chief', 'ask'),
        text: 'Type a question or tap the orb and talk: “what’s still open before I log off?” The live mic level drives the orb’s waveform ring, and the answer is spoken back and lit up word by word. Every sound in the app is synthesised in the browser with Web Audio, with no audio files at all.',
      },
      {
        chapter: 'Command palette', at: 86.2, title: 'Every action one keystroke away', media: clip('chief', 'palette'),
        text: '<b>Ctrl/⌘ K</b> opens a command palette for every action, and free text typed there becomes a question. Shortcuts cover the rest: / to ask, V to talk, M and E for the morning and evening briefs.',
      },
      {
        title: 'How it fits together',
        media: { type: 'diagram', name: 'chief', label: 'Diagram: Gmail and Calendar feed Claude, which returns a strict JSON schema; the server merges it with live data and sorts mail into Reply, Delegate, Archive and FYI, then sends a morning and evening brief.' },
        text: 'Vanilla JavaScript modules in the browser talk to one Vercel serverless function, <code>api/router.js</code>. It handles Google OAuth 2.0, the Gmail and Calendar APIs, the Claude API and Upstash Redis for users, briefs and memory. An <b>hourly GitHub Actions job</b> calls a secret-protected <code>/api/cron</code> endpoint, so the morning and evening briefs build in the cloud even when your computer is off.',
      },
      {
        title: 'Locked down by default', media: shot('chief', 'dashboard'),
        text: 'Google refresh tokens are encrypted with <b>AES-256-GCM</b>. Sessions use HMAC-signed HttpOnly cookies, every write needs a CSRF header, the OAuth state is checked and each user has a daily quota. Email and calendar text is treated as untrusted input to harden against prompt injection, and links supplied by the model are protocol-checked before they render. The public demo uses the real model behind per-visitor and global daily caps, with a scripted fallback.',
      },
    ],
  },
  {
    id: 'zenoth',
    kind: 'Voice-first second brain · built with AI',
    title: 'ZENOTH',
    url: '127.0.0.1:8765 · local bridge',
    ratio: '1632 / 912',
    intro: 'A voice-first agentic operating system that runs in the browser. Claude is the brain, a zero-cost router sits in front of it, an Obsidian vault is its long-term memory and background terminals do the heavy work. Every conversation and note is written into the vault, and the relevant notes come back as context for the next answer.',
    tags: ['JavaScript', 'Python', 'FastAPI', 'Claude API', 'WebGL', 'faster-whisper', 'Kokoro', 'Obsidian'],
    links: [],
    note: 'Code available on request.',
    film: { src: m('zenoth', 'film.mp4'), poster: m('zenoth', 'film.webp'), length: '2:17', sound: true },
    loop: clip('zenoth', 'loop'),
    steps: [
      {
        chapter: 'The core', at: 8, title: 'One brain behind every request', media: clip('zenoth', 'core'),
        text: 'Everything you type or say goes to one core. It is drawn as a procedural liquid-chrome head rendered in WebGL, with reflections that follow the cursor, energy seams and a mouth that moves with the voice. It costs about <b>0.8 ms of CPU a frame</b>, and it falls back to canvas 2D where WebGL is not available.',
      },
      {
        chapter: 'Tier 1 · Reflex', at: 18.4, title: 'Tier 1, Reflex: no AI at all', media: clip('zenoth', 'reflex'),
        text: 'Simple requests never touch a model. “What are my priorities?” is answered by rules from the notes already in the vault, in <b>under a millisecond</b> and at no cost.',
      },
      {
        chapter: 'Tier 2 · Pulse', at: 27.2, title: 'Tier 2, Pulse: a fast model', media: clip('zenoth', 'pulse'),
        text: 'Quick questions go to <b>Claude Haiku</b>: about a second and a fraction of a cent. The relevant vault notes and the vault’s <code>CLAUDE.md</code> map are sent along as context, a lightweight form of retrieval-augmented generation.',
      },
      {
        chapter: 'Tier 3 · Forge', at: 35, title: 'Tier 3, Forge: real work in the background', media: clip('zenoth', 'forge'),
        text: 'Real work opens a background <b>Claude Code</b> terminal with web search and web fetch while you keep talking. Each job streams into its own session, and the finished deliverable is saved to the vault’s <code>outputs/</code> folder and linked back.',
      },
      {
        chapter: 'Nexus router', at: 50.6, title: 'Nexus decides who answers', media: clip('zenoth', 'nexus'),
        text: 'The router sorts instead of thinking. Weighted signals and rules classify each request in <b>under 1 ms with no model call</b>. A route tester shows the tier probabilities change with every keystroke, and a routing-economics panel compares what was spent with sending everything to the big model.',
      },
      {
        title: 'The request path',
        media: { type: 'diagram', name: 'zenoth', label: 'Diagram: speech is transcribed by faster-whisper, a rule-based router picks one of three lanes in under 1 ms (rules, Claude Haiku or a background Claude Code session), the result is stored in an Obsidian vault and spoken back by Kokoro.' },
        text: 'A spoken request is transcribed, routed to one of the three lanes, answered, written into the vault and spoken back. Only the lanes that need a model ever call one.',
      },
      {
        chapter: 'The vault', at: 63.4, title: 'Memory that opens in Obsidian', media: clip('zenoth', 'vault'),
        text: 'Every capture, conversation and report lands as plain markdown in a <code>raw/ → wiki/ → outputs/</code> vault. Through the local bridge, ZENOTH and Obsidian stay in sync both ways within about three seconds, and appends happen on disk, so nothing typed in Obsidian is ever overwritten.',
      },
      {
        chapter: 'Protocols', at: 75.6, title: 'Repeat work, written down once', media: clip('zenoth', 'protocols'),
        text: 'A protocol pairs a job with a trigger: a daily or weekly schedule, or an event. Briefs, content and community digests run on their own, typing <code>/</code> lists them, and ZENOTH can scan the last 30 days for work worth turning into a protocol.',
      },
      {
        chapter: 'Local voice', at: 88.5, title: 'Your voice never leaves the machine', media: clip('zenoth', 'voice'),
        text: 'Tap the mic, then pause to send. Speech runs locally through the bridge, with <b>faster-whisper</b> listening and <b>Kokoro</b> speaking, so the audio is never uploaded anywhere.',
      },
      {
        chapter: 'PRIME ⇄ LEGION', at: 100, title: 'One switch, two brains', media: clip('zenoth', 'legion'),
        text: 'One switch moves the brain between PRIME (Claude Code) and LEGION (Codex), and the whole interface follows: the head peels apart into a drone swarm.',
      },
      {
        chapter: 'The bridge', at: 111.5, title: 'Two front doors, one bridge', media: clip('zenoth', 'bridge'),
        text: 'The web app and Obsidian share one bridge, one router and one vault. The bridge is an <b>8-endpoint FastAPI server</b> for vault access, chat, background jobs, speech-to-text and text-to-speech. It binds to 127.0.0.1, needs a token on every endpoint except <code>/health</code>, accepts browser requests only from localhost and GitHub Pages, writes only <code>.md</code> files of up to 512 KB inside the vault and deletes by moving notes to <code>.trash</code>. Both halves are tested on every push: <b>15 web-app tests and 18 bridge tests</b> in GitHub Actions.',
      },
    ],
  },
  {
    id: 'petal',
    kind: 'Offline-first finance tracker (PWA) · built with AI',
    title: 'Petal Finance',
    url: 'pierretankj-crypto.github.io/petal-finance',
    ratio: '1440 / 786',
    intro: 'A calm personal finance tracker that runs entirely in the browser: expenses, budgets, savings goals and net worth, with no sign-up, no server and no tracking. It installs as an app and keeps working offline, in about 3,800 lines of plain HTML, CSS and JavaScript with no framework, library or build step, built with Claude Code.',
    tags: ['JavaScript', 'SVG', 'Service Workers', 'PWA', 'View Transitions API', 'localStorage'],
    links: [
      { label: 'Open the live demo', href: 'https://pierretankj-crypto.github.io/petal-finance/?demo' },
      { label: 'View the source', href: 'https://github.com/pierretankj-crypto/petal-finance' },
    ],
    note: 'The demo loads six months of sample data in a sandbox that lives only in that browser tab.',
    film: { src: m('petal', 'film.mp4'), poster: m('petal', 'film.webp'), length: '1:54', sound: false },
    loop: clip('petal', 'loop'),
    steps: [
      {
        chapter: 'At a glance', at: 4, title: 'Your month at a glance', media: clip('petal', 'glance'),
        text: 'The dashboard is a monthly statement: spent, income, saved and net worth, a category breakdown, recent activity and insights written from your own numbers. On arrival the donut blooms open while the totals count up, and hovering it explores each category.',
      },
      {
        chapter: 'Log an expense', at: 23, title: 'Log an expense in seconds', media: clip('petal', 'expense'),
        text: 'Press N anywhere to add a transaction: amount, category, account and date. Amounts are read the way people type them (<code>12,50</code>, <code>1.234,50</code>, <code>$40</code>), and every value is validated and sanitised before it is stored.',
      },
      {
        chapter: 'Ctrl + K', at: 36.2, title: 'Jump anywhere with Ctrl + K', media: clip('petal', 'palette'),
        text: 'A command palette jumps to any page, runs any action or finds any transaction from the keyboard.',
      },
      {
        chapter: 'Transactions', at: 43, title: 'Search and filter everything', media: clip('petal', 'search'),
        text: 'Search, filter by type, category, account or period, sort, edit, delete with undo and export to CSV. Sortable columns announce their state to screen readers, and all user text is escaped before it renders.',
      },
      {
        chapter: 'Calendar', at: 53, title: 'A heat map of the month', media: clip('petal', 'calendar'),
        text: 'Darker days cost more. Tap any day to see or add what happened, or move between days with the arrow keys.',
      },
      {
        chapter: 'Budgets and goals', at: 62, title: 'Budgets that say what is safe to spend', media: clip('petal', 'goals'),
        text: 'Monthly limits per category show on-track, close and over states, plus a “safe to spend today” figure. Savings goals carry a monthly target and bloom when you reach them.',
      },
      {
        chapter: 'Accounts', at: 74.6, title: 'Accounts and net worth in one place', media: clip('petal', 'accounts'),
        text: 'Bank, cash, savings, investments, credit cards and loans, transfers between them and a six-month net-worth trend.',
      },
      {
        chapter: 'Trends', at: 87, title: 'Where the money goes over time', media: clip('petal', 'trends'),
        text: 'Spending against income over 3, 6 or 12 months, where the money went and which weekdays cost the most, with tooltips and a crosshair that follows the pointer.',
      },
      {
        title: 'A chart engine with no chart library',
        media: { type: 'diagram', name: 'petal', label: 'The four chart types Petal Finance’s engine draws: donut, line, column and bar, beside the Ctrl+K command palette shortcut.' },
        text: 'The donut, line, column and bar charts are custom SVG in <code>js/charts.js</code>, with hover tooltips, crosshairs, monotone curves and animated transitions. When the month changes, numbers glide and chart segments morph from the old values to the new ones. The category palette was checked for colour-blind separation.',
      },
      {
        chapter: 'Light or dark', at: 100.2, title: 'Light or dark, your choice', media: clip('petal', 'theme'),
        text: 'Switching theme reveals the new one outward from where you clicked, and pages crossfade with the View Transitions API. Text meets <b>WCAG AA contrast</b> in both themes, dialogs trap focus, and every effect respects reduced-motion settings.',
      },
      {
        title: 'Private, offline and installable', media: shot('petal', 'mobile', { portrait: true }),
        text: 'There is no backend. Data lives in <code>localStorage</code> with JSON backup and restore, so it never leaves the device. A small service worker caches the app shell (network-first, so updates land right away), and a web manifest makes it installable on iOS, Android and desktop.',
      },
    ],
  },
];
