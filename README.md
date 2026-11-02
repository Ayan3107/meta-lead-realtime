# Real-Time Meta Lead Dashboard

A proof of concept that receives Meta Lead Ads webhook events, retrieves lead details through the Meta Graph API, and pushes new leads to an already-open React Native app using Socket.IO.

## Architecture

Meta Lead Ads → Express Backend → Meta Graph API → Socket.IO → React Native App

The mobile app receives the existing lead list on connection and new leads in real time.

## Features

- Meta Page webhook verification and `leadgen` event handling.
- Lead retrieval using the Meta Graph API.
- Real-time updates using Socket.IO.
- Initial lead synchronization when the mobile app connects.
- REST endpoint for retrieving stored leads.
- Manual test endpoint for verifying real-time updates.

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO, Meta Graph API, dotenv.
- **Mobile:** React Native, Expo, TypeScript, Socket.IO Client.

## Project Structure

```text
meta-lead-realtime/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── mobile/
│   ├── src/app/index.tsx
│   ├── package.json
│   └── app.json
├── .gitignore
└── README.md
```

## Setup

### 1. Backend

Open a terminal in the `backend` directory:

```bash
npm install
```

Create a `.env` file using `.env.example` as a template and fill in your own Meta Page ID, Page Access Token, webhook verification token, and debug key.

Start the backend:

```bash
npm run dev
```

The backend runs on port `3000`.

### 2. Mobile app

Open another terminal in the `mobile` directory:

```bash
npm install
```

In `mobile/src/app/index.tsx`, update the Socket.IO server URL to use your computer's local network IP address:

```ts
io('http://YOUR_COMPUTER_IP:3000')
```

Start Expo:

```bash
npx expo start
```

Open the project in Expo Go on a phone connected to the same Wi-Fi network as the computer.

### 3. Meta Webhook

Configure a Meta App webhook with:

- **Object:** Page
- **Callback URL:** Your publicly accessible backend URL followed by `/webhook`
- **Verify token:** The same value as `VERIFY_TOKEN` in `.env`
- **Subscription field:** `leadgen`

Subscribe the Facebook Page to the app's `leadgen` webhook events and ensure the app has the required lead access permissions.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend health check |
| GET | `/webhook` | Meta webhook verification |
| POST | `/webhook` | Receive Meta webhook events |
| GET | `/leads` | Retrieve stored leads |
| POST | `/leads` | Create a manual test lead |
| POST | `/debug/sync-lead` | Retrieve and broadcast a lead for debugging |

The debug endpoint requires the `x-debug-key` request header.

## Real-Time Flow

1. A person submits a lead through a Meta Lead Ad form.
2. Meta sends a `leadgen` webhook event to the backend.
3. The backend retrieves the lead details using the Meta Graph API.
4. The backend stores the lead and emits a `newLead` Socket.IO event.
5. The already-open React Native app receives the event and updates its list without user interaction.

## Assumptions and Limitations

- The Facebook Page and Meta App are configured with the required permissions and lead access.
- The backend must be publicly reachable over HTTPS for Meta webhook delivery.
- The mobile device and backend must be able to communicate over the network.
- Leads are stored in memory for this proof of concept; they are lost when the backend restarts.
- The mobile app currently uses a configurable-in-source local network URL. Update it when running on another network.
- Meta's sample webhook events may contain placeholder lead IDs. The backend skips placeholder events rather than treating them as actual leads.

## Security

- Credentials