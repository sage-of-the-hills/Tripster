# Prompt for an AI assistant

Copy everything in the box below into Claude, ChatGPT or Gemini, fill in the brackets, and save the reply as `<trip-id>.trip.json`. The same prompt is behind the **Copy prompt** button on Tripster's home page.

```text
Plan a trip for me and give me the result as a Tripster trip file.

My trip:
- Destination(s): [e.g. Porto and Lisbon]
- Dates: [start date] to [end date]
- Travellers: [names]
- Interests and pace: [e.g. food, viewpoints, easy walks, no early starts]
- Already booked: [flights, stays, tours with times and references, or "nothing yet"]
- Budget and currency: [e.g. mid-range, GBP]

Reply with ONE JSON file named <trip-id>.trip.json, in exactly this format:

{
  "format": "trip-planner/1",
  "id": "porto-lisbon-2027",
  "title": "Porto and Lisbon",
  "tagline": "Five days of food, tiles and viewpoints.",
  "region": "Portugal",
  "start": "2027-05-01",
  "end": "2027-05-05",
  "travellers": [
    "Sam",
    "Alex"
  ],
  "currency": "GBP",
  "daylight": {
    "sunrise": "06:35",
    "sunset": "20:40"
  },
  "places": {
    "OPO": {
      "name": "Porto airport",
      "lat": 41.2481,
      "lon": -8.6814
    },
    "HOTEL": {
      "name": "Hotel in Ribeira",
      "lat": 41.1407,
      "lon": -8.613
    },
    "LIVRARIA": {
      "name": "Livraria Lello",
      "lat": 41.1469,
      "lon": -8.6149
    },
    "COIMBRA": {
      "name": "Coimbra",
      "lat": 40.2033,
      "lon": -8.4103,
      "waypoint": true
    }
  },
  "stays": [
    {
      "id": "porto-hotel",
      "name": "Hotel in Ribeira",
      "address": "Street, Porto",
      "place": "HOTEL",
      "checkIn": "2027-05-01T15:00",
      "checkOut": "2027-05-03T11:00",
      "host": "",
      "via": "Booking.com",
      "ref": "",
      "cost": 420,
      "cancellation": "Free until 28 Apr",
      "status": "booked",
      "notes": ""
    }
  ],
  "transport": [
    {
      "id": "flight-out",
      "kind": "flight",
      "title": "London to Porto",
      "at": "2027-05-01T09:00",
      "ref": "",
      "status": "booked"
    },
    {
      "id": "car",
      "kind": "car",
      "title": "Hire car",
      "provider": "",
      "at": "2027-05-03T10:00",
      "until": "2027-05-05T10:00",
      "pickup": "HOTEL",
      "dropoff": "OPO",
      "status": "todo"
    }
  ],
  "bookings": [
    {
      "id": "lello",
      "title": "Livraria Lello tickets",
      "provider": "Livraria Lello",
      "date": "2027-05-02",
      "time": "10:00",
      "people": 2,
      "url": "https://www.livrarialello.pt",
      "bookBy": "2027-04-20",
      "cost": "€10 each",
      "status": "todo",
      "notes": ""
    }
  ],
  "days": [
    {
      "date": "2027-05-02",
      "title": "Old Porto",
      "color": "#0B5F73",
      "stay": "porto-hotel",
      "route": [
        "HOTEL",
        "LIVRARIA"
      ],
      "steps": [
        {
          "time": "09:30",
          "title": "Hotel",
          "place": "HOTEL",
          "next": "Walk 15 min"
        },
        {
          "time": "10:00",
          "title": "Livraria Lello",
          "place": "LIVRARIA",
          "booking": "lello",
          "note": "Arrive 10 minutes early"
        }
      ]
    }
  ],
  "checklist": [
    {
      "id": "passport",
      "title": "Passports",
      "group": "Documents"
    }
  ],
  "notes": [
    {
      "title": "Emergency",
      "body": "Call 112."
    }
  ],
  "links": [
    {
      "title": "Weather",
      "url": "https://www.ipma.pt/en/"
    }
  ]
}

Rules:
- "format" is "trip-planner/1". "id" is lowercase words joined by dashes, ending with the year.
- Every place in "places" has real latitude and longitude. Give each a short CAPS key and use that key in days, stays and transport. Mark towns that only shape a driving route with "waypoint": true.
- Dates are YYYY-MM-DD; times are 24-hour HH:MM local time.
- "status" is todo, booked, paid or optional. Use booked or paid only for things I told you are booked.
- Give each day 3 to 8 timed steps. "next" says how to reach the following step, e.g. "Drive 40 min".
- Add "bookBy" dates for anything that sells out, and real booking links in "url".
- Include a packing "checklist", local "notes" (emergency number, driving and safety tips) and useful "links".
```
