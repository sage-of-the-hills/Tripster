# Shared trips (Firebase setup)

With this set up, everyone on a trip signs in with their email and sees the same trip: booking ticks ("Booked by Aakash · 2 h ago"), plan changes, expenses and a list of recent changes. It all works offline too and syncs when the phone is back online.

It uses Firebase, Google's free app database (the free "Spark" plan is plenty for a group of friends). Setup takes about 10 minutes, once.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. **Create a project** → name it `tripster` → you can switch Google Analytics **off** → **Create project**.

## 2. Turn on email sign-in

1. In the left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → switch on the first toggle (Email/Password) → **Save**.
3. **Settings** tab → **Authorized domains** → **Add domain** → add `sage-of-the-hills.github.io` (and your Render address too if you use it, e.g. `tripster-xxxx.onrender.com`).

## 3. Create the database

1. Left menu: **Build → Firestore Database → Create database**.
2. Choose a location near you, e.g. `europe-west2 (London)`. This can't be changed later.
3. Start in **production mode** → **Create**.
4. Open the **Rules** tab, delete what's there, paste in the whole of [`firestore.rules`](../firestore.rules) from this project, and click **Publish**.

The rules mean a trip can only be read or changed by the email addresses listed on it, and only people who confirmed their email can sign in.

## 4. Connect the app

1. Click the gear icon next to **Project Overview** → **Project settings**.
2. Under **Your apps**, click the **web icon `</>`** → app nickname `Tripster` → **Register app** (no hosting needed).
3. Firebase shows a block of code with `firebaseConfig`. Copy four values from it into `app/config.json`:

```json
{
  "relay": "",
  "firebase": {
    "apiKey": "AIza...",
    "authDomain": "tripster-xxxx.firebaseapp.com",
    "projectId": "tripster-xxxx",
    "appId": "1:123456789:web:abc123"
  }
}
```

These values are safe to publish: they only identify the project. Access is controlled by the sign-in and the rules from step 3.

4. Commit the change. The site redeploys in a minute.

## 5. Use it

1. Open Tripster → **Account** on the home page → **Create account** with your email and a password → open the confirmation email → back in the app tap **I've confirmed it**.
2. Open the trip → **Overview → People → Edit**: add everyone's name and email (people without email, like children, can still be in expenses) → **Save people** → **Share with the group**.
3. Send everyone the app link. Each person creates an account **with the same email you entered**, confirms it, and the trip appears on their home screen.

Who can do what:
- Everyone on the trip can tick bookings, change the plan, and add, edit or delete expenses.
- Only the person who shared the trip (the owner) can add or remove people.
- Packing-list ticks stay personal to each phone.
