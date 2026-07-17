# justin06lee-frontend

A [Claude Code](https://claude.com/claude-code) skill that teaches Claude the **justin06lee.dev house
frontend design system** — so it reproduces the look exactly without reading any source repo.

The aesthetic: **dark-only, pure black on white, square corners, thin translucent borders, Poppins type,
restrained Motion, opacity for hierarchy.** It's built on the [`@justin06lee/chrome`](https://chrome.justin06lee.dev)
UI component library and the conventions shared across `justin06lee.dev` and `leet.justin06lee.dev`.

The skill is **opt-in**. It stays out of the way until you ask for this style by name — "style this like
justin06lee.dev", "use my chrome components", "make this match my other projects" — and then it governs
the whole task: every component, colour, and border. Generic React or Tailwind work never triggers it.

## What's inside

```
SKILL.md                  # the rules, exact design tokens, cn()/variant patterns
references/
├── components.md         # full 40+ Chrome component inventory + usage
├── primitives.md         # verbatim source of the core primitives
├── setup.md              # new-project bootstrap (theme.css, fonts, Tailwind v4, CLI)
└── conventions.md        # code style, naming, exports, a11y, Motion idioms
```

## Install

With [bmo](https://github.com/justin06lee/bmo):

```bash
bmo add justin06lee/justin06lee.md
```

Or clone and install from the local folder:

```bash
git clone https://github.com/justin06lee/justin06lee.md
bmo add ./justin06lee.md
```

To scope it to a single project instead of installing it globally, copy the skill into that project:

```bash
mkdir -p your-project/.claude/skills/justin06lee-frontend
cp -R justin06lee.md/{SKILL.md,references} your-project/.claude/skills/justin06lee-frontend/
```

Inspect before installing anything:

```bash
bmo inspect ./justin06lee.md
```

## The component library

The skill documents the components, but they're distributed separately — shadcn-style, so you own the
code after install:

```bash
bunx @justin06lee/chrome@latest init
bunx @justin06lee/chrome@latest add button
```

## License

MIT
