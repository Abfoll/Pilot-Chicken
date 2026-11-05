# Chicken Road

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)

**Chicken Road** is a real‑time multiplayer multiplier game designed for **Telegram Mini Apps**. Players place bets, watch the flight climb, and must cash out before the round ends. The game uses a **provably fair** system with SHA‑256 hashing, ensuring every round is transparent and verifiable.

![Game Screenshot](https://via.placeholder.com/800x400?text=Pilot+Chicken+Gameplay)

---

## ✨ Features

- **Real‑time Multiplayer** – All players share the same live round.
- **Dynamic Multiplier** – Multiplier increases continuously until the chicken crashes.
- **Provably Fair** – Server seed, client seed, and nonce generate each round; players can verify outcomes.
- **Telegram Integration** – Seamless authentication via Telegram Login Widget.
- **Wallet System** – Main and bonus balances with full transaction history.
- **Auto Bet & Auto Cash Out** – Automate your strategy.
- **Leaderboards & History** – Track performance and past rounds.
- **Admin Dashboard** (optional) – Manage users, rounds, and finances.
- **Scalable** – Built with WebSockets and Redis for horizontal scaling.

---

## 🚀 Tech Stack

### Backend
- [NestJS](https://nestjs.com/) – modular, TypeScript‑first framework
- [PostgreSQL](https://www.postgresql.org/) – primary database
- [Redis](https://redis.io/) – caching & session store (optional)
- [TypeORM](https://typeorm.io/) – ORM for database entities
- [Socket.IO](https://socket.io/) – real‑time WebSocket communication
- [JWT](https://jwt.io/) – authentication
- [Passport](https://www.passportjs.org/) – Telegram login strategy

### Frontend
- [Next.js](https://nextjs.org/) (App Router) – React framework
- [TypeScript](https://www.typescriptlang.org/) – type‑safe code
- [Tailwind CSS](https://tailwindcss.com/) – styling
- [Framer Motion](https://www.framer.com/motion/) – chicken flight animation
- [Socket.IO Client](https://socket.io/) – real‑time updates
- [Telegram SDK](https://core.telegram.org/bots/webapps) – Mini App integration

---

## 📦 Installation & Setup

### Prerequisites
- Node.js ≥ 18
- npm or yarn
- PostgreSQL (or Docker)
- Redis (optional, for scaling)

### 1. Clone the repository
```bash
git clone https://github.com/Abfoll/pilot-chicken.git
cd pilot-chicken