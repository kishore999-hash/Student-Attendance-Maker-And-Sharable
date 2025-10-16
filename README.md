# Teacher Attendance (MWRN) - Minimal Prototype

This workspace contains a minimal full-stack prototype: MongoDB + Express (server) and React (client). It's designed to be simple so beginners can run and explore.

Quick steps:

1. Start a MongoDB server (e.g., locally at mongodb://localhost:27017)
2. Server:
   - cd server
   - npm install
   - copy .env.example to .env and set TEACHER_ID and TEACHER_PW (these are the teacher credentials seeded at startup)
   - npm run dev
3. Client:
   - cd client
   - npm install
   - npm run dev

The default teacher id/password are in `.env.example`. The server seeds the teacher into the database at first run.
