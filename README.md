# reduxstation.com

Landing page for ReduxStation 13.

Live at https://reduxstation.com. Single static page, Retro PDA window floating over a space parallax background. The status banner polls a JSON endpoint defined in `_data/site.yaml` and degrades to "server status unavailable" when the endpoint is blank or down.

## Stack

- Eleventy 3 (templating)
- Webpack 5 (asset bundling)
- SCSS, vanilla JS
- Caddy on a Linux server (production)

## Local development

Requires **Node 18+** (the CI workflow uses Node 20). Older Node versions will fail at `npm run build` because Eleventy 3 and Webpack 5 dropped support for Node 12/14/16.

```
npm install
npm start
```

Opens at http://localhost:8081 with live reload on `.njk`, `.scss`, `.js`, and `_data/*.yaml` changes.

## Production build

```
npm run build
```

Output goes to `_site/`. The CI workflow does this automatically; you only need to run it locally for testing the deploy.

## Configuration

Almost everything is in `_data/`:

| File                | What it controls                                          |
|---------------------|-----------------------------------------------------------|
| `_data/site.yaml`   | brand name, tagline, **status_endpoint**, BYOND URL       |
| `_data/nav.yaml`    | top-level link buttons (Discord, Wiki, GitHub, ...)       |
| `_data/servers.yaml`| server identifiers + addresses for the status banner      |
| `_data/alerts.yaml` | dismissible banners (info / warning / danger)             |

When the live status JSON endpoint exists, set `status_endpoint` in `_data/site.yaml` and the banner will start showing live player counts. Until then it shows "server status unavailable" and the rest of the page works fine.

## Deploy

**Automatic**: every push to `master` triggers `.github/workflows/deploy.yml`, which builds and rsyncs `_site/` to the server. No manual step.

**Manual** (for staging or hotfixes):

```
REDUX_HOST=deploy-user@reduxstation.com ./deploy.sh
```

See `Caddyfile.example` for the server-side block to add to Caddy.

## Layout

```
website/
  _data/         site/nav/server/alert config
  _includes/     Eleventy layouts (currently unused; index.njk is standalone)
  sass/          parallax + Retro PDA theme
  js/            parallax driver, status poller, dismiss handler
  img/parallax/  8 PNGs lifted from ResurgenceStation/webmap (GPL-3.0)
  utils/         Eleventy shortcodes
  index.njk      the page
```

## License

GPL-3.0 (matches the parent ResurgenceStation project). Parallax PNGs are reused under the same license.

The Retro PDA theme was originally hand-written for logs.owo.fm; we lifted the inline CSS into `sass/pda.scss` and fixed a few wrapping bugs (pre tag, fixed-width window, breadcrumb truncation, flex shrinking).
