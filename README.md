# Portfolio

A self-hosted portfolio for infrastructure work. Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Flow and Motion. The architecture follows `docs/architecture.md`.

## SLOP WARNING ⚠️

I do not specialise in frontend, this project is vobe-coded and while I do my best to make it as user-friendly as possible, AI code is AI code

## Run it

Requires Node 22.9 or newer and git.

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run dev` runs the sync first, so the projects have data on the first load.

The prototype starts in **mock mode**: the three projects are placeholders, GitHub responses come from `fixtures/github/`, the repositories are seeded from `fixtures/repos/`, and the demos and Grafana panels are simulated. Nothing needs network access.

## Pages

| Path | What it shows |
|---|---|
| `/` | Boot log replay of the last sync, then the project list |
| `/projects` | All projects with languages, CI status and last commit |
| `/projects/<slug>` | Title page with Description, Demo and Code tabs, linkable with `?tab=` |
| `/infrastructure` | Interactive React Flow diagram, defined in `content/infrastructure.yaml` |
| `/observability` | Grafana embed, or a simulated dashboard when no URL is set |

## Adding a project

1. Create `content/projects/<slug>/config.yaml`. The folder name is the slug.
2. Run `npm run sync`.

```yaml
name: My Project
summary: One sentence shown on the list and the title page.
github: your-org/my-project
order: 4
publish_private_code: false   # set true to publish a private repo's code

code:
  exclude:                    # added to the global deny list in lib/code-filter.ts
    - "secrets.yaml"

tabs:                         # order and presence of the buttons
  - type: description
    source: readme            # readme | custom (reads description.md next to config.yaml)
  - type: demo
    kind: shell               # shell | grafana | custom
    url: https://demos.example.com/my-project
  - type: code
```

Config is validated with zod on every sync and page render. Errors name the file and the field.

In mock mode, a new project also needs `fixtures/github/<repo-name>.json` and `fixtures/repos/<slug>/`. Copy an existing one.

## Going live

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|---|---|
| `PORTFOLIO_MODE=live` | Clone real repos and call the GitHub API |
| `PORTFOLIO_HOME` | Where clones and data live, e.g. `/var/portfolio`. Must be writable by the app |
| `GITHUB_TOKEN` | Fine-grained token with read access to contents, metadata and actions |
| `GITHUB_WEBHOOK_SECRET` | The secret configured on each repository's webhook |
| `GIT_CLONE_BASE` | `https://github.com/` by default, or `git@github.com:` with a deploy key |
| `DEMO_ORIGIN`, `GRAFANA_ORIGIN` | Origins allowed in demo URLs and in the `frame-src` CSP |
| `GRAFANA_DASHBOARD_URL` | Dashboard embedded on `/observability` |

Then build and start:

```bash
npm run build   # runs the sync first
npm start
```

For private repos cloned over HTTPS, give git the token through a credential helper rather than putting it in `GIT_CLONE_BASE`.

### Webhooks

On each GitHub repository, add a webhook:

- Payload URL: `https://<your-domain>/api/webhooks/github`
- Content type: `application/json`
- Secret: the value of `GITHUB_WEBHOOK_SECRET`
- Events: **Pushes** and **Workflow runs**

A push to the default branch re-syncs that project (clone, languages, CI, manifest). A completed workflow run refreshes only the CI status. Both invalidate the cached pages for that project. Requests with a bad signature get a 401.

The app must run as a long-lived Node process (`npm start`, a container, or systemd), because syncs write to `PORTFOLIO_HOME` after the webhook response is sent.

## How it is put together

```
app/                      Pages and API routes
  api/webhooks/github     Verified webhook: sync or refresh CI, then revalidate
  api/projects/[slug]/    File contents for the code browser, README images
components/               UI. demo/ holds the live iframe and the mock demos
content/                  Site, project and diagram config (YAML)
lib/
  sync.ts                 syncProject(), shared by the script and the webhook
  manifest.ts             Publishable file list; nothing outside it is ever served
  code-filter.ts          Global deny list (.env, keys, state files, node_modules...)
  markdown.ts             README rendering, sanitizing, relative link rewriting
  github.ts, git.ts       API calls and clone/pull (mocked from fixtures)
scripts/sync-repos.ts     npm run sync
fixtures/                 Mock data, not used in live mode
```

Runtime data lives in `PORTFOLIO_HOME` (default `~/.portfolio`):

```
repos/<slug>/             git clone
data/<slug>.json          languages, CI, commit, visibility, manifest
```

## Things worth knowing

- **Motion respects reduced motion.** The boot sequence plays once per browser session and can be skipped by clicking anywhere in it.
- **Private repos stay private by default.** If GitHub reports a repo as private and `publish_private_code` is not true, the Code tab disappears and the README is not rendered. The sync prints a warning.
- **The demo service is not part of this repo.** In live mode, demo tabs embed the configured URL in a sandboxed iframe, with a timeout and a retry if it doesn't answer.
- **shadcn/ui** is set up through `components.json`. Add more components with `npx shadcn@latest add <name>`.
