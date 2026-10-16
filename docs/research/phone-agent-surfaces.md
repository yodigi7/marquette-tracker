# Phone surfaces for the agent on this machine

**Where this lives and why.** This is a research note, not a design doc and not a decision of
record. It lives at `docs/research/phone-agent-surfaces.md` because the repo had no convention for
research notes when it was written, so a new `docs/research/` directory was created rather than
pretending one of the existing directories (`docs/adr/`, `docs/agents/`) was the right home.
**ADR-shaped conclusions from this note do not belong here** — they belong in `docs/adr/` when they
are actually decided. If this note has served its purpose it can be deleted; nothing imports it.

**Ticket:** [#73](https://github.com/yodigi7/marquette-tracker/issues/73), child of map
[#68](https://github.com/yodigi7/marquette-tracker/issues/68).
**Question:** for each candidate surface, what actually works against the OpenCode build on _this_
machine — not what the upstream project claims.

Everything below is either **observed on this machine** (I ran it) or **read from a primary source**
(the project's own source, or the vendor's own docs). Anything I could only find _claimed_ is marked
as such.

---

## 0. Two corrections to the brief this ticket was written from

Both of these changed the answer, so they come first.

### 0.1 The running server is **v2.0.29**, not v2.0.16

There are two OpenCode installs on this machine:

| Path                                                        | Version    | Role                                                                              |
| ----------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `~/.opencode/bin/opencode`                                  | **2.0.16** | Standalone CLI. Not what is serving anything.                                     |
| `~/.config/ai.opencode.desktop/cli/2.0.29-x64/opencode-cli` | **2.0.29** | **This is the running background service**, launched by the OpenCode desktop app. |

Observed:

```
$ ~/.opencode/bin/opencode --version
opencode v2.0.16

$ curl -s -u "$AUTH" http://127.0.0.1:49374/api/info
{"version":"2.0.29","pid":11987,"urls":["http://127.0.0.1:49374"],...}

$ cat /proc/11987/cgroup
/user.slice/user-1000.slice/user@1000.service/app.slice/app-ai.opencode.desktop-11298.scope
```

So the 2.0.16 CLI's `pair` is talking _to_ a 2.0.29 server and then formatting the link the **old**
way. Everything in §2 follows from this.

### 0.2 The background service has no persistent unit and will not survive a reboot

The scope above is **transient** and belongs to the OpenCode desktop app:

```
$ systemctl --user status app-ai.opencode.desktop-11298.scope
     Loaded: loaded (/run/user/1000/systemd/transient/...; transient)
  Transient: yes
  Active: active (running) since Wed 2026-10-14 09:43:47 CDT; 1 day 14h ago
```

`~/.config/systemd/user/` is empty, `~/.config/autostart/` is empty, and there are no matching
system units. **Consequence:** the server dies when the desktop app quits, and after a host reboot
nothing brings it back. This is a prerequisite for every remote surface below — see §5.

---

## 1. The agent's own web interface in mobile Safari

**The UI exists and is served by the same background service. Confirmed.**

```
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:49374/
200                                    # no credentials needed for the shell
```

Two things follow from that 200:

- The SPA shell (7,277 bytes) is served **unauthenticated**. Auth is handled client-side, so a phone
  can load the page over plain HTTP and authenticate afterwards.
- The **API** is _not_ unauthenticated: `GET /openapi.json` returns **401** with
  `{"_tag":"UnauthorizedError","message":"Authentication required"}`. So the fence is real.

**It is a PWA.** `/site.webmanifest` → `"display": "standalone"`, icons at 192/512 plus maskable,
`"start_url": "/"`, `"id": "/"`. iOS "Add to Home Screen" gives a standalone app, not a browser tab.

**Live streaming is SSE, confirmed live:**

```
$ curl -sN -u "$AUTH" http://127.0.0.1:49374/api/event -D -
HTTP/1.1 200 OK
cache-control: no-cache, no-transform
x-accel-buffering: no
content-type: text/event-stream

data: {"type":"server.connected","data":{}}
: heartbeat
```

### What breaks on iOS Safari

**Not measured on a real iPhone** — no iOS device was available. But the shipping web app's own
user-facing strings answer this precisely, because the app was built to handle exactly these cases
(`_assets/language-*.js`):

| String key                        | Shipped text                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `server.connect.camera.native`    | _"This page cannot use the camera over HTTP. Paste the pairing link above."_                       |
| `server.connect.scan.failed`      | _"This browser could not read the QR code. Enter your connection details manually."_               |
| `server.connect.mixedContent`     | _"Could not connect to this HTTP server from an HTTPS page. Use an HTTPS server address instead."_ |
| `server.connect.link.unreachable` | _"Could not reach {{url}}. Check that this device can reach the server, then try again."_          |
| `server.connect.link.expired`     | _"This pairing link expired or was already used. Run opencode pair to get a new one."_             |

**The answer to "does HTTPS/localhost block phone pairing over a network":** it blocks the
**camera-based QR scan only**, and the app says so out loud and tells you to paste the link instead.
`opencode pair` prints the link as text, so pasting works over plain HTTP with no TLS at all.
Pinning this down:

- **QR scan in the browser** needs `getUserMedia` → secure context → **HTTPS or localhost. Will not
  work** from `http://192.168.x.x:49374`.
- **Pasting the link** has no such requirement. This is the path that matters.
- The bundled scanner is `qr-scanner@1.4.2`, and the connect screen imports both the scanner and a
  text input — so manual entry is a first-class fallback, not an afterthought.
- `/sw.js` (199 KB) is registered by the app, but **service workers also require a secure context**,
  so over plain HTTP on a LAN IP the registration silently fails. Cosmetic, not fatal.

**Also present:** a "Connecting over SSH…" connect mode in the app, and `?auth_token=` query-param
support (the app reads it, then immediately strips it from the URL via `history.replaceState`).

---

## 2. Pairing against the installed build — **the version gap matters, but not the way expected**

### 2.1 What each CLI emits (both observed on this machine)

```
$ ~/.opencode/bin/opencode pair                    # v2.0.16
  Link      http://127.0.0.1:49374/connect#eyJ1c2VybmFtZSI6Im9wZW5jb2RlIiwicGFzc3dvcmQiOiJ5bzFzMXo...

$ .../2.0.29-x64/opencode-cli pair                 # v2.0.29
  Open a link to connect. Links work once and expire in 5 minutes.
  http://127.0.0.1:49374/auth/connect/OyHqgGt-I2IemJ1CTsZ6Pw
```

The v2.0.16 format is not a token. Reading the compiled `pair` source out of the v2.0.16 binary:

```js
t = `${new URL("/connect", e.urls[0])}#${m(JSON.stringify({ username: e.username, password: s }))}`;
// m() = btoa(...) with + -> - and / -> _
```

and decoding the live fragment:

```json
{ "username": "opencode", "password": "yo1s1z3oqR8rvDUrdOgv65LmmxAfy-wfrJOLV3_zg3w" }
```

So the legacy link puts **the entire, permanent server password** in the URL fragment. The fragment
is never sent to the server (browsers do not transmit it), so it is not exposed in request logs — but
it _is_ sitting in terminal scrollback, shell history and the clipboard. The current format is a
one-time code instead. That alone is the upgrade argument.

### 2.2 But the **server** already supports the new flow

The running 2.0.29 server's own OpenAPI spec contains both halves:

- `POST /api/pair` — _"Create a short-lived, single-use code for a `/auth/connect/:code` pairing
  link."_ → `200 {"code":"...","expires_in":300}`
- `GET /auth/connect/{code}` — _"Redeem a pairing code. Browsers receive a session cookie and a
  redirect to the web app; requests that accept JSON receive a session token to use as the
  password."_ → both are `security: []`, i.e. deliberately unauthenticated.

**Proved end to end, no upgrade required:**

```
$ curl -s -X POST -u "$AUTH" http://127.0.0.1:49374/api/pair
{"code":"O8TZX-CKb5T-iUuAn7ya1g","expires_in":300}

$ curl -si -H "Accept: text/html" http://127.0.0.1:49374/auth/connect/O8TZX-...
HTTP/1.1 302 Found
location: /
set-cookie: opencode_session_49374=1794719383.wrJqoCkxgXPPKjryiDAT4dLwRGkjpERcebr2BtLENqw;
            Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax

$ curl -s -b jar.txt http://127.0.0.1:49374/api/info        # cookie only, NO basic auth
{"version":"2.0.29","pid":11987,...}          → 200

$ curl -s -o /dev/null -w "%{http_code}" -H "Accept: text/html" .../auth/connect/O8TZX-...  # replay
401                                             → single use, confirmed
```

So: **one-time code, 5-minute expiry, 30-day HttpOnly session cookie.** This matches the official
docs verbatim (`https://opencode.ai/v2/docs/cli/web`: _"Opening a link in a browser signs it in with a
session cookie and loads the web ui… Sessions last 30 days; changing the server password signs every
session out."_).

### 2.3 The legacy link is **dead** against this server

This is the part that matters operationally. The 2.0.29 web bundle's entire route table is:

```js
[
  { path: `/` },
  { path: `/settings` },
  { path: `/server/:serverKey/session/:id` },
  { path: `/new-session` },
];
```

There is **no `/connect` route**. And the app ships an explicit rejection message for it:

> `server.connect.link.legacy`: _"This pairing code is from an older version of OpenCode. Update
> OpenCode on the server, then run opencode pair again."_

**Definitive answer to the ticket's question:** the 2.0.16 CLI's link **cannot** be redeemed by a
browser on another device, against this server. Not because of iOS, and not because the server lacks
the feature — because the current web app has no route for it and deliberately reports it as legacy.
Anyone following the 2.0.16 binary's instructions will hit a dead end. Use the 2.0.29 CLI, or
`POST /api/pair` by hand.

---

## 3. The Telegram bot — `@grinev/opencode-telegram-bot`

Checked against **source**, not the README. 1,256 stars, MIT, npm `@grinev/opencode-telegram-bot`,
last pushed 2026-10-15.

**Does it support v2?** Yes, first-class. `src/opencode/v2/client.ts` imports `@opencode/client` and
`@opencode-ai/sdk/v2`. Default URL for v2 is `http://127.0.0.1:49374` — the exact address in use here.
Password is required and sent as HTTP Basic:

```ts
// src/opencode/client.ts
return `Basic ${Buffer.from(credentials).toString("base64")}`;
```

**Does it attach, or spawn its own agent?** **It attaches.** The client is built once, pointed at a
base URL, and every feature call goes over HTTP to the already-running server — including the event
stream:

```ts
// src/opencode/v2/client.ts:358
for await (const event of client.event.subscribe({ ... }))
```

That is the same SSE `/api/event` endpoint verified in §1. `/opencode_start`, `/opencode_stop` and
`OPENCODE_AUTO_RESTART_ENABLED` exist, but they are **optional conveniences** — the README's own v2
instruction is "just point the bot to it". So the one-project fence is not undermined by a second
agent runtime appearing.

**Authentication — fail-closed, two layers.** `src/bot/middleware/auth.ts`:

```ts
if (userId && userId === config.telegram.allowedUserId) {
  await next();
} else if (userId && userId === ctx.me.id) {
  /* ignore own updates */
} else {
  /* silently ignore unauthorized users */
}
```

An unauthorised ID never reaches a handler. Behind that sits the OpenCode server password.

**Can it be confined to one project/directory?** **Partly — and this is the one real gap.**

- `/open` (the directory browser) **is** fenced. `OPEN_BROWSER_ROOTS` (default `~`) is enforced by
  `isWithinAllowedRootSafe()` in `src/app/services/file-browser-service.ts`, which calls `realpath()`
  before comparing, so symlinks do not escape the root. Point it at the repo and `/open` is confined.
- `/projects` is **not**. `PROJECTS_EXCLUDED_PATHS` in `src/app/services/project-service.ts` filters
  by _exact worktree key_ — it is a **deny-list**:

  ```ts
  const filteredProjects =
    excludedKeys.size > 0
      ? visibleProjects.filter((p) => !excludedKeys.has(worktreeKey(p.worktree)))
      : visibleProjects;
  ```

  Fail-open. Any project not explicitly excluded is visible and selectable, and there is **no
  allow-list option**. A strict one-project fence needs an upstream change, not just config.

**Approve/deny:** yes — `src/bot/callbacks/permission-callback-handler.ts` renders inline
`once` / `always` / `reject` buttons. On v2 a reject settles every pending request in the session.

**Cost:** $0. MIT, npm-installable, the Telegram Bot API is free. Requires Node 22.14+.

**Not verified by running it** — installing it was out of scope. Its own support matrix says Linux is
_"tested on Ubuntu 24.04 LTS"_; this machine is Fedora 44.

---

## 4. Push: ntfy from iOS

**Free-tier limits on ntfy.sh** (from the project's own docs, Limitations table):

| Limit               | ntfy.sh                      |
| ------------------- | ---------------------------- |
| Messages / day      | **250**                      |
| Message length      | **4,096 bytes**              |
| Attachments         | 2 MB each, 20 MB per visitor |
| Bandwidth           | 200 MB / day per visitor     |
| Concurrent requests | 60, refilling 1 per 5s       |
| Subscriptions       | 30 per visitor               |
| Phone calls         | not allowed                  |

All comfortable for "the agent needs a decision".

**Action buttons on iOS — yes, but narrower than Android.** From the iOS app's own source
(`binwiederhier/ntfy-ios`):

```swift
// ntfy/Utils/Actions.swift
private let supportedActions = ["view", "http"]
```

`broadcast` and `copy` are filtered out — those are Android-only. So the action vocabulary on iPhone
is _open a URL_ or _fire an HTTP request_.

**Can an approve/deny be carried from a lock screen? Yes.** `ntfy/Utils/NotificationContent.swift`:

```swift
UNNotificationAction(identifier: $0.id, title: $0.label, options: [.foreground])
```

Two caveats, both confirmed in source:

1. **`.foreground` means the tap foregrounds the ntfy app.** It then runs
   `ActionExecutor.execute(action)` from `AppDelegate.swift`. Not a silent background action, but a
   lock-screen tap does deliver.
2. **The request comes from the phone, not from your machine.** `ActionExecutor.http()` issues a
   `URLSession` request (default method **POST**, custom headers and body supported) to whatever URL
   the action names. **So a tap can only reach the agent if the phone can already reach it** — via
   Tailscale, or the server on `0.0.0.0` plus LAN. With no reachability at all, an ntfy tap can do
   nothing but open a URL. _This is the key structural point: ntfy is push-out only and supplies no
   inbound path._

Also worth knowing: on ntfy.sh the iOS app goes through Firebase (`AppDelegate` handles an `fcmToken`),
so it inherits FCM latency. There is **no iOS equivalent of Android's "instant delivery" foreground
service** — on Android that gap is closed, on iOS it is not.

---

## 5. Reachability on free tiers

### Tailscale — $0, and the tunnel will not break SSE

From Tailscale's own pricing page, **Personal: "$0 Free forever"**, unlimited user devices, up to 6
users, and the Basics column (secure peer-to-peer, split tunnelling **& MagicDNS**, ACLs, peer
relays, Funnel) carries no plan restriction. Two devices is far inside that. Not installed here.

- **SSE survives the tunnel — reasoned, not measured.** A Tailscale tunnel is a point-to-point
  WireGuard path with **no HTTP proxy in the middle**, so there is nothing to buffer a stream. The
  server's `x-accel-buffering: no` is an nginx-specific hint and is irrelevant to a raw tunnel.
  Contrast with §6, where a proxy in the middle _is_ the problem. Not run, because installing
  Tailscale was out of scope.
- **iOS backgrounding is solved — by the app, on purpose.** Tailscale's VPN On Demand docs describe
  per-interface rules including **Always**, and: _"The Tailscale client automatically configures a
  broad VPN On Demand policy while Tailscale is enabled to ensure that the VPN remains active in the
  event of a system restart, auto-update, crash or other event."_ One real limitation: only one VPN
  app with On Demand can be active at a time.
- **MagicDNS** would let the phone use `http://<machine-name>:49374` rather than a raw IP.
- **But Tailscale alone does not make the current server reachable.** The server still listens on
  loopback only (`opencode service get hostname` → empty), so someone would have to run
  `opencode service set hostname 0.0.0.0`. **This ticket was explicitly told not to do that**, so
  Tailscale is not a working configuration today — it is a $0 option pending one deliberate change.

### OpenTunnel — public, TLS-terminated locally, authenticated only by the server password

`opencode pair --remote` ([`anomalyco/opentunnel`](https://github.com/anomalyco/opentunnel), MIT).
Its README, verbatim:

> _"OpenTunnel is a blind TLS tunnel. Each client receives a unique `<id>.opentunnel.xyz` hostname and
> **terminates TLS locally**, so the server never holds the certificate private key or sees HTTP
> plaintext."_

- **It publishes the server to the public internet** at `https://<route>.<id>.opentunnel.xyz`. This is
  the single biggest difference from Tailscale: nothing about it is private-by-default.
- **The URL is not authentication.** Again verbatim: _"Route names never appear in public certificate
  logs, so the URL can't be guessed, but **anyone you share it with can reach the service: it is not
  authentication**."_ The only real credential is OpenCode's server password. OpenCode's own prompt
  says the same: _"Traffic is end-to-end encrypted, and access requires your server password."_
- Backed by Fly.io + PlanetScale MySQL + ZeroSSL ACME with DNS-01. Requires installing the opentunnel
  CLI — not done here.

### Reboot — the real blocker, and it is local

Neither of the above fixes §0.2. Tailscale's `tailscaled` would come back after a reboot; **the
OpenCode server would not**, because it lives in a transient scope owned by the desktop app with no
unit and no autostart entry. Until that changes, every remote surface in this note is only alive while
the OpenCode desktop app is open.

### One free option that is not on the map at all

**`ssh -L 49374:127.0.0.1:49374 <host>`** — the official docs and the 2.0.29 CLI both suggest it,
and the web app has a "Connecting over SSH…" connect mode. Zero cost, zero public exposure, keeps the
server on loopback, and works from any phone SSH client. Given the §0.2 problem it is arguably the
best-shaped first move, and it should be on the candidate list.

---

## 6. Ruled out, and two corrections

| Option                               | Verdict                                          | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Quick Tunnel**          | **RULED OUT — confirmed**                        | Cloudflare's own docs, Limitations: _"Quick Tunnels do not support Server-Sent Events (SSE)."_ and _"Each Quick Tunnel supports up to 200 in-flight requests."_ OpenCode's live stream **is** SSE (`text/event-stream`, verified). Out.                                                                                                                                                                                                                                                                          |
| **ngrok free**                       | **$0, SSE-capable, but with two real frictions** | ngrok docs: endpoints have no timeout; **1 GB/month egress**, 20,000 requests/month, 3 endpoints, 1 user, **one fixed dev domain** (no random URLs on free), and an **interstitial "Visit" page in front of all HTML browser traffic on the free tier** (cookie-suppressed for 7 days after one tap; removable via `ngrok-skip-browser-warning` header or non-standard User-Agent). The 1 GB egress cliff is the real risk for a long-lived agent stream.                                                        |
| **Pushover**                         | **CORRECTION — the premise is wrong**            | It is **$4.99 USD one-time per platform**, and *"There are **no subscription fees** for individuals using Pushover"*, with 10,000 messages/month free. So it is **not** a recurring cost — but it still fails a strict **$0** rule. (Teams is $5/user/month, irrelevant for one person.)                                                                                                                                                                                                                         |
| **GitHub Actions on a private repo** | **Ruled out on architecture, not cost**          | GitHub docs: GitHub Free includes **2,000 minutes/month**, 500 MB artifacts, 10 GB cache on private repos, and _"If your account does not have a valid payment method on file, usage is blocked once you use up your quota"_ — it fails closed rather than quietly costing money. Not a cost problem at this scale. It is ruled out because a GitHub-hosted runner **is a cloud runner** and cannot reach `127.0.0.1:49374` on this desktop. The constraint that decides it is "the agent runs on this machine". |

---

## 7. What this changes about the candidate list

Ranked by what the evidence actually supports, not by what the READMEs claim:

1. **SSH port forwarding** — not previously on the list. $0, no exposure, loopback stays loopback,
   survives §0.2 as long as something restarts the server.
2. **OpenCode's own web UI over Tailscale** — $0, the UI is real and streaming works. Needs two
   deliberate changes: a reboot-survivable server, and `hostname 0.0.0.0`.
3. **Telegram bot** — $0, attaches (so the fence question is live but not fatal), fail-closed
   allowlist, and it is the only candidate with **first-class approve/deny**. Blocked on an
   allow-list for `/projects` that upstream does not have.
4. **ntfy** — $0 and good, but **push-only**. It is a complement to one of the above, never a
   replacement for inbound reachability.
5. **OpenTunnel** — $0 and works, but publishes an authenticated-by-password server to the public
   internet. A deliberate step up in exposure, not a default.

## 8. Suggested new tickets

Recorded here for the map, **not** created:

1. **Make the OpenCode background service survive a reboot.** Today it is a transient scope owned by
   the desktop app; no unit, no autostart. Blocks every remote surface.
2. **Retire or upgrade `~/.opencode/bin/opencode` (v2.0.16).** It still emits legacy
   `/connect#<base64-password>` links that the current web app rejects by name, so following its
   instructions leads to a dead end. The running server is already 2.0.29 and needs no upgrade.
3. **A one-project allow-list for the Telegram bot.** `PROJECTS_EXCLUDED_PATHS` is a deny-list;
   `/projects` is not confined. Either upstream gains an allow-list or we accept the gap.
