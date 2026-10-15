# Trip file format (`trip-planner/1`)

A trip file is a small JSON file, usually named `<trip-id>.trip.json`. Tripster reads it when you upload or paste it on the home page, or when someone opens a shared trip link. Uploading a file with the same `id` updates that trip.

Full example: [`examples/porto-lisbon-2027.trip.json`](../examples/porto-lisbon-2027.trip.json). The easiest way to make one is the prompt in [`ai-prompt.md`](ai-prompt.md).

## Top level

| Field | Required | Meaning |
|---|---|---|
| `format` | yes | Always `"trip-planner/1"` |
| `id` | yes | Lowercase words with dashes, ending in the year: `porto-lisbon-2027` |
| `title` | yes | Trip name |
| `start`, `end` | yes | `YYYY-MM-DD` |
| `days` | yes | List of days (can be empty) |
| `tagline` | | One line about the trip |
| `region` | | Country name, e.g. `"Portugal"`. Sharpens Explore links, enables Discover and official warnings. |
| `travellers` | | List of names |
| `currency` | | e.g. `"GBP"`, used for costs |
| `daylight` | | `{ "sunrise": "06:35", "sunset": "20:40", "note": "" }`, colours the timeline |
| `basemap` | | Optional map image: `{ "src", "width", "height", "bounds": { "west", "east", "north", "south" } }` in Web Mercator. Without it Tripster draws a grid map. |
| `places` | | Object of places keyed by a short CAPS key |
| `stays`, `transport`, `bookings` | | Lists, see below |
| `checklist`, `notes`, `links` | | Packing list, tips, useful websites |
| `guide` | | `{ "title", "html", "source" }`: saved "Getting around" text (set by the trip builder) |

## places

```json
"places": {
  "LIVRARIA": { "name": "Livraria Lello", "lat": 41.1469, "lon": -8.6149 },
  "COIMBRA":  { "name": "Coimbra", "lat": 40.2033, "lon": -8.4103, "waypoint": true }
}
```
Every place needs real `lat` and `lon`. `waypoint: true` marks towns that only shape a driving route: they get no label and no weather card. Optional `area` (e.g. `"Porto, Portugal"`).

## days

```json
{ "date": "2027-05-02", "title": "Old Porto", "color": "#0B5F73", "stay": "porto-hotel",
  "route": ["HOTEL", "LIVRARIA"],
  "steps": [
    { "time": "09:30", "title": "Hotel", "place": "HOTEL", "next": "Walk 15 min" },
    { "time": "10:00", "title": "Livraria Lello", "place": "LIVRARIA", "booking": "lello", "note": "Arrive early" }
  ] }
```
`steps[].place` points at a place key; `booking` points at a booking or transport id; `next` says how to reach the following step. `route` (up to 10 places) drives the map line and the *Open the day in Google Maps* button; without it the steps are used. `stay` points at a stay id.

## stays, transport, bookings

Each has an `id` and a `status` of `todo`, `booked`, `paid` or `optional`.

- **stays:** `name`, `address`, `place`, `checkIn`, `checkOut` (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`), `host`, `via`, `ref`, `cost` (number), `cancellation`, `notes`
- **transport:** `kind` (`flight`, `car`, `train`, `ferry`, `bus`), `title`, `provider`, `at`, `until`, `pickup`, `dropoff` (place keys), `ref`, `notes`
- **bookings:** `title`, `provider`, `date`, `time`, `people`, `where`, `url`, `cost`, `bookBy` (deadline), `ref`, `notes`

Shared files may also carry `packed` (list of checklist ids already ticked).

## checklist, notes, links

```json
"checklist": [{ "id": "passport", "title": "Passports", "group": "Documents" }],
"notes": [{ "title": "Emergency", "body": "Call 112." }],
"links": [{ "title": "Weather", "url": "https://www.ipma.pt/en/" }]
```
