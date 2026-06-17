# Code Reviewer AI

An intelligent, production-grade web application that leverages AI (OpenAI GPT-4o-mini) to review code, provide live suggestions, and execute code in multiple languages — all within a sandboxed environment. Built with React 19, Express.js, MongoDB, and featuring JWT + Google OAuth authentication.

![Screenshot placeholder](https://via.placeholder.com/800x450/1a1a2e/00e676?text=Code+Reviewer+AI)

## Features

- **AI Code Review** — Get comprehensive, beginner-friendly reviews with quality scores, inline annotations, and complexity analysis
- **Live Suggestions** — Real-time AI-powered suggestions as you type, with severity indicators and one-click fixes
- **Multi-Language Execution** — Run JavaScript, Python, Java, and C++ in an isolated server-side environment
- **OCR / Vision Extraction** — Extract code from images using Tesseract.js or OpenAI Vision API
- **JWT + Google OAuth** — Secure authentication with short-lived access tokens, refresh token rotation, and social login
- **Paginated History** — Browse past reviews with configurable pagination (max 50 per page)
- **Dark/Light Theme** — Persistent theme switching with system-level appropriate defaults

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Monaco Editor, Tailwind CSS 4, Vite 6 |
| Backend | Express.js 4, Mongoose 9, JWT, bcryptjs |
| Database | MongoDB |
| AI | OpenAI GPT-4o-mini / GPT-4o (Vision) |
| Auth | JWT (access + refresh tokens), Google OAuth 2.0 |
| Code Execution | Child process with timeout, env stripping, and temp isolation |

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **Python** 3 (for Python code execution)
- **Java JDK** 17+ (for Java code execution)
- **g++** (for C++ code execution)
- **MongoDB** 6+ (local or Atlas)

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/ramwarhekar02/code-reviewer.git
cd code-reviewer

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure backend environment
cp .env.example .env
# Edit .env with your values (see below)

# 4. Install frontend dependencies
cd ../Frontend
npm install

# 5. Configure frontend environment
cp .env

# 6. Start MongoDB (if running locally)
# mongodo

# 7. Start the backend
cd ../backend
npm run dev

# 8. In a new terminal, start the frontend
cd Frontend
npm run dev

# 9. Open http://localhost:5173
```

## Live Demo

Deployed at: *[coming soon]*
