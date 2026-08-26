# StudyVerse

StudyVerse is a collaborative study workspace that brings focused study sessions, subject-based rooms, realtime chat, shared resources, and progress tracking into one place. It is designed to solve a common student problem: useful discussions, resources, and study momentum get scattered across messaging apps and separate productivity tools.

## Live Demo

https://study-verse-sable.vercel.app

## Highlights

- 🔐 Supabase authentication and account-scoped profiles
- 💬 Realtime direct and room chat
- 📎 Image, video, audio, and file sharing
- 📷 Browser camera capture and 🎙️ voice messages
- 🏠 Collaborative study rooms with shared sessions
- ⏱️ Study timer and session history
- 🔔 Account-specific notifications
- 👤 Profiles, nicknames, appearance, and privacy controls

## Tech Stack

- React 19
- Vite
- Supabase (Auth, Postgres, Realtime, Storage)
- Vercel
- ESLint

## Setup

```bash
git clone https://github.com/eeshajeyaraj-bot/StudyVerse.git
cd StudyVerse
npm install
```

Create a local `.env` file from `.env.example` and add your Supabase project values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Then run:

```bash
npm run dev
```

For a production check:

```bash
npm run lint
npm run build
```

## Chat Preview

The live demo contains the current StudyVerse chat UI, including room chat and media sharing. A repository screenshot/GIF can be added to this section once a stable product screenshot is captured from the deployed build.

## Roadmap

- [ ] Subject-tagged room discovery and pinned resources
- [ ] AI-assisted doubt resolution and searchable room FAQ
- [ ] Session summaries and weekly study streaks
- [ ] Typing indicators and online presence
- [ ] Read receipts and unread counts
- [ ] In-room message search
- [ ] Room notes/resources workspace
- [ ] Flashcards and lightweight quizzes
- [ ] Stronger RLS coverage and membership controls
- [ ] Email verification and abuse/rate-limit protection

## Security

Never commit `.env` files or production credentials. The repository contains only `.env.example`; configure secrets locally and in Vercel/Supabase environments.

## License

This project is currently maintained as a student project and portfolio/hackathon application.
