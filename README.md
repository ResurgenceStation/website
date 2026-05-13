# reduxstation.com

Landing page for ReduxStation 13.

Live at https://reduxstation.com. Single static page, Retro PDA window floating over a space parallax background. The status banner polls a JSON endpoint defined in `_data/site.yaml` and degrades to "server status unavailable" when the endpoint is blank or down.

## Stack

- Eleventy 3 (templating)
- Webpack 5 (asset bundling)
- SCSS, vanilla JS
- Caddy on a Linux server (production)

## Local development

Requires **Node 18+**. Older versions fail at `npm run build` because Eleventy 3 and Webpack 5 dropped Node 12/14/16.

```
npm install
npm start
```

Opens at http://localhost:8081 with live reload on `.njk`, `.scss`, `.js`, and `_data/*.yaml` changes.

## Production build

```
npm run build
```

Output goes to `_site/`. On the server this happens automatically on every push (see Deploy section). You only need to run it locally for previewing.

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

Self-hosted on a Linux server, webhook-driven. Same shape as the game's TGS auto-deploy: GitHub posts to the server on every push, the server pulls, rebuilds, and Caddy keeps serving. **No SSH keys are ever shared with GitHub.** The server holds the repo; GitHub never touches the server filesystem.

### Flow

```
git push origin master
    -> GitHub webhook (HMAC-signed POST)
       -> https://reduxstation.com/hooks/redeploy-website
          -> Caddy proxies to localhost:9000
             -> adnanh/webhook validates the HMAC + checks ref == refs/heads/master
                -> runs scripts/redeploy.sh
                   -> git pull + npm ci + npm run build
                      -> _site/ updated in place; Caddy serves new files
```

Typical end-to-end latency: 20-60 seconds, mostly the build.

### One-time server setup

Run [scripts/install.sh](scripts/install.sh) as root on the server. It installs Node 20, the `webhook` binary, clones this repo to `/srv/reduxstation/website`, sets up a systemd service for the webhook listener, and runs the first build.

```
curl -fsSL https://raw.githubusercontent.com/ResurgenceStation/website/master/scripts/install.sh | sudo bash
```

Then:

1. **Edit `/etc/reduxstation/webhook.conf`** and replace `REPLACE_WITH_LONG_RANDOM_SECRET` with the output of `openssl rand -hex 32`. Restart: `systemctl restart reduxstation-webhook`.
2. **Add a GitHub webhook** at `Settings -> Webhooks -> Add webhook` on the repo:
   - Payload URL: `https://reduxstation.com/hooks/redeploy-website`
   - Content type: `application/json`
   - Secret: the same value you put in `webhook.conf`
   - Events: "Just the push event"
3. **Append the Caddy block** from [Caddyfile.example](Caddyfile.example) to your Caddyfile (`/etc/caddy/Caddyfile`), then `systemctl reload caddy`.
4. **Point DNS** for `reduxstation.com` (and `www.`) at the server. Caddy issues TLS automatically.

That is the entire setup. From then on, every push to master rebuilds the site within a minute. Nothing to remember, nothing to run manually.

### Watching deploys

```
tail -F /var/log/reduxstation-redeploy.log
```

### Manual redeploy

If a deploy fails or you want to force a rebuild without pushing a commit:

```
sudo -u reduxweb /srv/reduxstation/website/scripts/redeploy.sh
```

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
