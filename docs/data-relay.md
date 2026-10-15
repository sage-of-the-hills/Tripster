# Data relay (optional)

Tripster reads most of its data straight from the source. Two official feeds don't allow that from other websites:

- **Official weather warnings** from MeteoAlarm (the Icelandic Met Office and about 38 other European weather services)
- **Road conditions in Iceland** from Vegagerðin (Icelandic Road Administration)

The relay in [`relay/cloudflare-worker.js`](../relay/cloudflare-worker.js) fetches only those two feeds and passes them on. It stores nothing, needs no keys and refuses every other address. Without it, those two cards in the Weather tab show a link to the source instead.

## Set up (about 10 minutes, free)

1. Sign up free at https://dash.cloudflare.com (no card needed).
2. Go to **Workers & Pages → Create → Create Worker** (start from "Hello World"). Name it `tripster-relay` and click **Deploy**.
3. Click **Edit code**, delete everything, paste in the whole of `relay/cloudflare-worker.js`, and click **Deploy**.
4. Copy the worker's address, e.g. `https://tripster-relay.yourname.workers.dev`. Check it by opening that address with `?src=roads-is` on the end: you should see a long list of Icelandic road sections.
5. Put the address in `app/config.json`:
   ```json
   { "relay": "https://tripster-relay.yourname.workers.dev" }
   ```
6. Commit and push. GitHub Pages redeploys and the Weather tab shows warnings and road conditions.

Cloudflare's menus change now and then. If a button has moved, look for "Workers" and "Create Worker". The free plan allows 100,000 requests a day, far more than Tripster uses.
