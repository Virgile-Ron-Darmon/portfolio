# Portfolio site: architecture recap (revised)

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Infrastructure diagram | React Flow |
| Metrics dashboard | Grafana (iframe embed, required) |
| Code/README source | Local git clone per project, stored outside the app tree |
| GitHub API usage | Actions run status, language percentages, repo visibility check |
| Config | YAML per project |
| Interactive demos | Separate self-hosted demo service, embedded by URL |
| Hosting | Self-hosted |

## 2. Requirements confirmed along the way

- Grafana iframe embed: fixed requirement, not up for debate.
- Interactive infrastructure diagram (React Flow): fixed requirement.
- Code browsing and README rendering: served from a local git clone per project, not fetched live from GitHub per request.
- Language breakdown (percentage per language) shown per project.
- Site content and page structure managed through YAML config files.
- Per-project pages use a fixed pattern: big title, then three buttons (Description, Demo, Code), with order and presence defined explicitly in YAML.
- Clicking a button swaps the panel below without leaving the page. The active tab is reflected in a query param so it can be deep-linked.

## 3. What the GitHub API is used for

Content comes from the local clone. The GitHub API covers only what the clone can't provide:

- **Actions run status:** `GET /repos/{owner}/{repo}/actions/runs`, to show the latest CI run (pass/fail, duration, timestamp, link to full run).
- **Language percentages:** `GET /repos/{owner}/{repo}/languages`, bytes-per-language converted to percentages.
- **Repo visibility:** `GET /repos/{owner}/{repo}`, to check the `private` flag before publishing code (see section 8).

No GitHub calls happen on visitor page loads.

## 4. Directory structure

### Portfolio app

```
portfolio/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx              # title + tab buttons + active panel, reads ?tab=
│   ├── infrastructure/
│   │   └── page.tsx                  # React Flow diagram
│   ├── observability/
│   │   └── page.tsx                  # Grafana embed
│   └── api/
│       ├── webhooks/
│       │   └── github/
│       │       └── route.ts          # verified webhook: sync, then revalidate
│       └── projects/
│           └── [slug]/
│               ├── file/
│               │   └── route.ts      # lazy-loaded source file for the code browser
│               └── asset/
│                   └── [...path]/
│                       └── route.ts  # README images and other assets from the clone
│
├── content/
│   └── projects/
│       ├── infra-platform/           # folder name IS the slug
│       │   └── config.yaml
│       ├── monitoring-stack/
│       │   └── config.yaml
│       └── ci-pipeline-tool/
│           └── config.yaml
│
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── ProjectCard.tsx
│   ├── ProjectTabs.tsx               # client component, syncs tab state to ?tab=
│   ├── LanguageBar.tsx
│   ├── CIStatusBadge.tsx
│   ├── InfraDiagram.tsx              # React Flow wrapper
│   ├── GrafanaEmbed.tsx
│   ├── DemoPanel.tsx                 # iframes the demo service or a Grafana panel
│   ├── CodeBrowser.tsx               # file tree from manifest, contents fetched on demand
│   └── ReadmeRenderer.tsx
│
├── lib/
│   ├── projects.ts                   # getAllProjects(), getProjectBySlug()
│   ├── paths.ts                      # REPOS_DIR, DATA_DIR resolution
│   ├── github.ts                     # languages, actions, visibility API calls
│   ├── git.ts                        # clone/pull logic
│   ├── sync.ts                       # syncProject(slug), shared by script and webhook
│   ├── manifest.ts                   # builds and reads the per-project file manifest
│   ├── code-filter.ts                # global deny list + per-project excludes
│   ├── markdown.ts                   # README parsing, sanitizing, link rewriting
│   ├── webhook.ts                    # HMAC signature verification
│   └── schema.ts                     # zod schema for YAML validation
│
├── scripts/
│   └── sync-repos.ts                 # runs syncProject() for every project
│
└── public/
    └── images/
```

### Runtime data (outside the app tree)

```
/var/portfolio/
├── repos/
│   ├── infra-platform/               # git clone, directory named by slug
│   ├── monitoring-stack/
│   └── ci-pipeline-tool/
└── data/
    ├── infra-platform.json           # languages, CI status, file manifest, visibility
    ├── monitoring-stack.json
    └── ci-pipeline-tool.json
```

### Demo service (separate deployment)

```
demos/                                # own repo or own directory, own process
└── <slug>/                           # one demo per project, served at demos.<domain>/<slug>
```

Notes on this layout:

- Clones live in `REPOS_DIR` (default `/var/portfolio/repos`), never inside the Next.js project. TypeScript, ESLint, Tailwind's content scanner and Next's output file tracing never see them, so no tool excludes are needed.
- Repos are cloned with an explicit target directory (`git clone <url> <slug>`), so the clone is always named by slug regardless of the GitHub repo name.
- Sync results are written to `DATA_DIR` as one JSON file per project. Pages read these files; they never shell out to git or call GitHub.
- Project existence is still defined by `content/projects/<slug>/config.yaml`. Adding a project is still a single folder operation in the app; the sync creates the clone and data file.
- Demo code no longer lives in the portfolio. The project folder holds only config.

## 5. Example `config.yaml`

```yaml
name: Infrastructure Platform
github: your-org/infrastructure
publish_private_code: false        # must be true to publish a private repo's code

code:
  exclude:                         # added to the global deny list
    - "terraform/*.tfvars"
    - "docs/internal/**"

tabs:
  - type: description
    source: readme                 # readme | custom
  - type: demo
    kind: custom                   # shell | grafana | custom
    url: https://demos.example.com/infra-platform
  - type: code
```

Changes from the previous version:

- **No `slug` field.** The folder name is the slug. One less thing to keep in sync.
- **No `demo_enabled`.** A project has a demo if and only if `tabs` contains a `demo` entry. `tabs` is the single source of truth for which buttons appear and in what order.
- **Demo settings live on the demo tab.** `kind` and `url` sit with the tab they configure. For `kind: grafana`, `url` points to a Grafana panel or dashboard; for `shell` and `custom`, it points to the demo service.
- **Zod enforces the rules:** at most one tab of each type, at least one tab, `url` required on demo tabs, `url` must match an allowed origin (the demo service or Grafana host).

## 6. Build/sync flow

### Full sync (build time or manual)

```
scripts/sync-repos.ts
  → read content/projects/*/config.yaml, validate with zod
  → for each project: syncProject(slug)
```

### syncProject(slug)

```
  → acquire per-project lock (no concurrent pulls on the same clone)
  → git clone or pull into REPOS_DIR/<slug>
  → GitHub API: fetch repo visibility
  → if private and publish_private_code is not true: mark code as unpublished
  → GitHub API: fetch language percentages
  → GitHub API: fetch latest Actions run status
  → build file manifest (walk clone, apply deny list, record path, size, type)
  → write DATA_DIR/<slug>.json
  → release lock
```

### Webhook flow

```
POST /api/webhooks/github
  → verify X-Hub-Signature-256 (HMAC SHA-256, constant-time compare); reject on mismatch
  → map repository.full_name to a project via the github field in config
  → respond 202 immediately; continue the work after the response
  → event "push" on the default branch:
       → syncProject(slug)
       → revalidateTag("project:<slug>")
  → event "workflow_run" with action "completed":
       → refresh Actions run status only, update DATA_DIR/<slug>.json
       → revalidateTag("project:<slug>")
  → anything else: ignore
```

Subscribing to `workflow_run` closes the timing gap where a push triggers a sync while CI is still running. The push updates code, README and languages; the completed run updates CI status a few minutes later.

### Runtime (visitor loads a page)

```
  → read DATA_DIR/<slug>.json and the clone (cached, tagged "project:<slug>")
  → no git commands, no GitHub calls
  → Grafana iframe and demo service iframe are the only live dependencies
```

The project page reads `searchParams` for the active tab, so it renders dynamically. That is cheap here because all data comes from local files through a tagged cache, which the webhook invalidates.

## 7. Code browser and README assets

### File manifest

The sync writes a manifest of every publishable file in the clone. It is the gatekeeper for everything served from the clone: a path not in the manifest is never served, which rules out path traversal by construction.

### Deny list

Global defaults in `lib/code-filter.ts`, extended per project via `code.exclude`:

- `.env*`, `*.pem`, `*.key`, `id_rsa*`, `*.tfstate*`, `secrets/**`, `.git/**`
- `node_modules/**`, build output folders
- Binary files (detected by content, not extension), except images allowed as README assets
- Files above a size cap (e.g. 1 MB), listed in the tree but shown as "too large to display"

### Lazy loading

- `CodeBrowser` renders the file tree from the manifest.
- Contents are fetched on demand from `/api/projects/[slug]/file?path=...`, which checks the manifest, reads the file from the clone and returns syntax-highlighted HTML.
- Highlighted output is cached and tagged per project, so repeat views are free and a sync invalidates it.

### README assets

- `markdown.ts` rewrites relative links and image sources in the README:
  - Images become `/api/projects/[slug]/asset/<path>`.
  - Links to files in the repo open the Code tab at that file (`?tab=code&file=<path>`).
  - Absolute URLs are left as they are.
- The asset route checks the manifest, serves only an allowlist of image content types, and sets long cache headers.

## 8. Private repositories

- The sync checks each repo's visibility through the GitHub API.
- If the repo is private and `publish_private_code` is not `true`, the Code tab is hidden and the README is not rendered from the clone. The build logs a warning naming the project.
- Publishing a private repo's code is therefore always a deliberate, per-project choice written in config.
- Cloning private repos uses a read-only deploy key or fine-grained token scoped to those repos, stored outside the app tree.

## 9. Demo service

- Interactive demos (shell, custom pages, anything with a local API) run as a separate self-hosted service on its own origin, e.g. `demos.example.com`.
- The portfolio only embeds them in an iframe via `DemoPanel`. A crashing or compromised demo cannot take down or reach into the portfolio.
- Each demo runs with the least privilege it needs (own container or user, resource limits, no access to the portfolio's data or secrets).
- `kind: grafana` demos skip the service and embed a Grafana panel directly.

## 10. Tab deep-linking

- The active tab is stored in a query param: `/projects/infra-platform?tab=code`.
- The server reads `searchParams.tab`, validates it against the project's `tabs`, and falls back to the first tab. The right panel renders on first load with no flash.
- Clicking a tab calls `router.replace` with the new param (`scroll: false`), so the URL stays shareable without adding history entries.
- The Code tab can also take `file=<path>`, used by README links and for sharing a specific file.

## 11. Grafana embed configuration

Grafana side (`grafana.ini`):

- `[security] allow_embedding = true`
- Prefer Grafana's public (shared) dashboards for the embedded views, so no login or anonymous session is involved.
- If anonymous access is used instead: `[auth.anonymous] enabled = true`, `org_role = Viewer`, pointed at a dedicated org that contains only the dashboards meant to be public. Confirm that the anonymous viewer cannot browse other dashboards, data sources or Explore.
- Set Grafana's CSP so `frame-ancestors` allows only the portfolio origin.

Portfolio side:

- CSP `frame-src` allows only the Grafana origin and the demo service origin.
- `GrafanaEmbed` and `DemoPanel` show a fallback message if the iframe fails to load, since these are the site's only live dependencies.

## 12. Open items / things to decide later

- Demo service stack and sandboxing approach (containers per demo, a single app with routes, etc.).
- How to handle repos that use Git LFS or submodules in the clone and manifest.
- Whether `content/projects/` stays in the portfolio repo or moves to its own config repo with its own webhook.
