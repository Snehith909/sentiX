# SentiX — AI-powered English learning platform

This repository contains a starter scaffold for SentiX: a web app to learn English through movies and videos.

Structure

- /client — React frontend (Tailwind CSS)
- /server — Node + Express backend (API stubs)

What's included

- Firebase config wired into the frontend (`/client/src/firebase.js`) — replace keys as needed.
- Basic Auth-ready UI pages: Login and Watch (stubs).
- Express server with simple `/api/explain` and `/api/chat` stubs to wire AI later.

How to run (locally)

1. Install server deps and start server

```powershell
cd sentix/server
npm install
npm run dev
```

2. Install client deps and start client

```powershell
cd sentix/client
npm install
npm start
```

Notes
- This is a starter scaffold. Next steps: wire Firebase Auth in the client, implement subtitle upload/parse, integrate OpenAI/HF in `/server/api/explain`, and add Firestore interactions.
