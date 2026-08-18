# Game Center

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

**Browser Game Center**

A modern, mobile-first game center built with **Next.js**. Play classic browser games, save your scores, and compete on leaderboards.

## Games Included
- Snake
- Memory Match
- Hangman
- Sokoban

## Features
- Username-based profiles
- Persistent scores stored in PostgreSQL
- Real-time leaderboards
- Mobile-first responsive design
- Docker & Docker Compose support
- CI/CD ready (GitHub Actions)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | Full-stack React framework |
| React 19 | UI library |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| PostgreSQL 17 | Score storage & leaderboards |
| Docker | Containerization |
| lucide-react | Icons |
| shadcn-style UI | Button, Card, Input components |

## Project Structure
game-center/
├── src/
│ ├── app/
│ │ ├── api/
│ │ ├── games/
│ │ └── leaderboard/
│ ├── components/
│ │ ├── games/
│ │ └── ui/
│ ├── lib/
│ ├── hooks/
│ └── types/
├── public/
├── prisma/
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (optional)

### Installation
```bash
git clone https://github.com/yourusername/game-center.git
cd game-center
npm install
cp .env.example .env.local
npm run dev
