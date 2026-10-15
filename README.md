# Tripster

**Your trips in one app: bookings, stays, day maps, weather, live travel alerts and the best places to see.**
Installs on iPhone, Android, Windows and Mac from any modern browser, and works offline.

Live app: **https://sage-of-the-hills.github.io/tripster/** (after the first deploy, see below)

---

## What it does

| | |
|---|---|
| **Home** | Greets you by name, counts down to your next trip and lists every trip saved on the device. |
| **Trip builder** | Pick a country and dates, then choose *well-known highlights* or *off-the-beaten-path* places, optionally along a *famous road trip*. Shows how to get around the country. |
| **Overview** | Bookings still to make (with deadlines), stays, day-by-day summary, weather alerts, live conditions. |
| **Days** | A map for each day, a timed timeline with daylight bars, and the weather at each stop. One tap opens the whole day in Google Maps. |
| **Weather** | Forecasts for every place, hour by hour, with a drone-flying rating (Good / Marginal / No-fly). Alerts for strong gusts, heavy snow or rain, severe cold, freezing rain and storms, and for big forecast changes. |
| **Live conditions** | Official weather warnings (MeteoAlarm, about 38 European countries), Safe Travel alerts and road conditions (Iceland), and a northern-lights outlook for each night. |
| **Explore** | Add any place by search. Every place links to Tripadvisor, Google Maps, Wikivoyage, Lonely Planet, Atlas Obscura, GetYourGuide and Viator, plus nearby sights from Wikipedia. *Discover* adds highlights, off-beat places and road trips. |
| **Bookings** | Every booking, stay, flight and car hire with a To book / Booked / Paid switch, plus a packing checklist. |
| **People and sharing** | Each traveller has a name and email. Share a trip and everyone who signs in with their email sees the same plan and ticks live, with who changed what ("Booked by Aakash · 2 h ago") and a recent-changes list. Home shows *Trips you planned* and *Trips you were part of*: after a trip ends, only the planner keeps the full details; everyone else keeps a record (dates, places, people, final balances). |
| **Money** | A simple Splitwise: add who paid and who it was for, see each person's share, balances and the fewest payments to settle up. Download as a spreadsheet. |
| **Offline** | The whole app and your trips work with no signal. Instructions and links for Google Maps offline areas. |
| **Sharing** | *Share trip link* packs the whole trip, ticks included, into a link that adds it to a friend's Tripster. Trip files can also be shared or backed up. |

Without accounts, trips and ticks live only on the device. Shared trips (optional) use a free Firebase project you control: see [`docs/shared-trips.md`](docs/shared-trips.md). The app otherwise only goes online to fetch weather, search places and read the public travel sources below.

## Deploy it (GitHub Pages, free)

1. Create a new **public** repository called `tripster` on your GitHub account and push this project to it (see *Uploading this project* below).
2. In the repository go to **Settings → Pages**, and under **Build and deployment → Source** choose **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy-pages.yml`) publishes the `app/` folder on every push to `main`. After a minute or two the app is live at `https://<your-username>.github.io/tripster/`.
4. Open that link on each phone and install it:
   - **iPhone:** Safari → Share → *Add to Home Screen*
   - **Android:** browser menu → *Install app*
   - **Computer (Chrome, Edge, Brave):** the install icon in the address bar

To ship a change: edit files under `app/`, raise `VERSION` at the top of `app/sw.js` (e.g. `2.4.0` → `2.4.1`) so installed copies update, and push.

### Optional: shared trips and expenses

To let everyone on a trip see the same bookings, ticks and expenses, set up a free Firebase project (about 10 minutes) and paste its settings into `app/config.json`. Step-by-step guide: [`docs/shared-trips.md`](docs/shared-trips.md). The security rules are in [`firestore.rules`](firestore.rules).

### Optional: official warnings and road conditions

The MeteoAlarm warnings feed and the Icelandic road-conditions feed don't allow browsers on other sites to read them. A tiny free relay fixes that. See [`docs/data-relay.md`](docs/data-relay.md). It takes about 10 minutes on Cloudflare's free plan; then put its address in `app/config.json`.

## Making a trip

Three ways, all on the home page:

1. **Ask an AI assistant.** *Copy prompt* gives a ready-made prompt for Claude, ChatGPT or Gemini; the reply is a trip file to upload or paste.
2. **Upload a trip file** (`*.trip.json`). The format is documented in [`docs/trip-file-format.md`](docs/trip-file-format.md), with an example in [`examples/`](examples/).
3. **Trip builder.** Country, dates, style and road trip; Tripster lays the places out over your days.

## Project layout

```
app/                    the web app (deployed as-is, no build step)
  index.html            page shell
  styles.css            all styling (light and dark)
  app.js                the app
  wx.js                 weather, alerts and drone logic (shared with the service worker)
  sw.js                 service worker: offline cache, background weather checks
  config.json           optional settings (data relay address)
  manifest.webmanifest  install metadata
  data/countries.json   country list for the trip builder
  fonts/ icons/ maps/   self-hosted fonts, app icons, the Iceland base map
  trips/index.json      trips bundled with the app (empty by default)
relay/cloudflare-worker.js   optional data relay
firestore.rules         security rules for shared trips (Firebase)
docs/                   trip file format, data relay setup, AI prompt
examples/               example trip file
tools/                  helper scripts (regenerate the country list)
.github/workflows/      GitHub Pages deployment
```

Run it locally with any static server, for example `cd app && python3 -m http.server 8000`, then open http://localhost:8000. The service worker needs `localhost` or https.

## Data sources

| Source | Used for | Licence or terms |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | Weather forecasts, place search | CC BY 4.0, free non-commercial use |
| [Wikivoyage](https://en.wikivoyage.org) | Destinations, getting around, road-trip itineraries | CC BY-SA 4.0 |
| [Wikidata](https://www.wikidata.org) | Sights, photos, scenic routes, countries | CC0 |
| [Wikipedia](https://en.wikipedia.org) | Nearby sights, route summaries | CC BY-SA 4.0 |
| [Wikimedia Commons](https://commons.wikimedia.org) | Place photos (loaded from Commons) | Per-file licences |
| [NOAA SWPC](https://www.swpc.noaa.gov) | Aurora activity (Kp) forecast | US public domain |
| [Safetravel.is](https://safetravel.is) (ICE-SAR) | Iceland travel alerts | Public alerts, linked to source |
| [MeteoAlarm](https://meteoalarm.org) | Official weather warnings (via relay) | Public warnings, linked to source |
| [Vegagerðin](https://umferdin.is) | Iceland road conditions (via relay) | Open data, linked to source |
| [Firebase](https://firebase.google.com) | Sign-in and shared trips (optional, your own project) | Google Firebase terms |

Tripadvisor has no open data feed, so places link out to it rather than showing its content.

## Licence

App code: MIT (see [`LICENSE`](LICENSE)). Fonts in `app/fonts` are under the SIL Open Font License. Content fetched at runtime keeps its own licence (table above).
