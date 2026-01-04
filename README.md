# Conversation Call Flow Builder

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/blinkdigital/v0-blandflowchartbuilder)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/3XqW8Mo3Mlq)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/blinkdigital/v0-blandflowchartbuilder](https://vercel.com/blinkdigital/v0-blandflowchartbuilder)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/3XqW8Mo3Mlq](https://v0.dev/chat/projects/3XqW8Mo3Mlq)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Development-only flags

- **`ALLOW_UNAUTH_PATHWAY_GENERATION`** (implemented in `app/api/generate-pathway/route.ts`):
  - In development (`NODE_ENV !== "production"`), this flag defaults to `true`, allowing `/api/generate-pathway` to work even if the `auth-token` cookie is missing.
  - In production, the code path treats missing/invalid auth as a `401` error and requires a valid session cookie.
  - Before deploying, verify that:
    - You are logged in and `auth-token` is present in browser cookies.
    - A POST to `/api/generate-pathway` includes that cookie.
    - `/api/auth/me` returns `200` for an authenticated user.

