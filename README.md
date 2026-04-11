# Book Log Server

> 🚧 **Work in progress** — actively being developed and refactored.

Backend API for a book quote collection iOS app. Users can search books, save meaningful sentences, and manage their reading list.

## Tech Stack

- **Runtime**: Node.js / Express / TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Apple Sign-In + JWT
- **Push**: Firebase Cloud Messaging
- **Deployment**: GCP App Engine

## Project Structure

```
src/
├── routes/          # Endpoint definitions + middleware binding
├── controllers/     # HTTP request/response handling
├── services/        # Business logic + Supabase queries
├── middlewares/      # Auth, validation, error handling
├── validators/      # Joi request body schemas
├── errors/          # Custom error classes
├── types/           # Shared TypeScript interfaces
└── lib/             # External client configs (Supabase)
```

## Architecture Decisions

- **Route → Controller → Service**: Routes bind middleware, controllers handle HTTP concerns, services own business logic and DB access. Services have no knowledge of `req`/`res`.
- **No DI or ORM**: Intentionally kept minimal for a solo project. Supabase client is used directly in services.
- **Global error handler**: Controllers throw `AppError`; a centralized middleware catches and formats error responses.
- **Joi validation**: Request body validation is declarative via middleware, keeping controllers clean.

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/apple/login` | - | Apple Sign-In + JWT issuance |
| POST | `/validate-token` | - | Verify JWT for auto-login |
| GET | `/user/me` | ✓ | Get current user info |
| POST | `/user/country` | ✓ | Update locale settings |
| DELETE | `/user/apple` | ✓ | Account deletion + Apple token revoke |
| GET | `/book/search` | - | Search books (Aladin API) |
| GET | `/book/bestseller` | - | Bestseller list (Aladin API) |
| POST | `/book/add` | ✓ | Add book to library |
| GET | `/book/list` | ✓ | Get user's book list |
| POST | `/books/:bookId/sentences` | ✓ | Save a sentence |
| GET | `/books/:bookId/sentences` | ✓ | List saved sentences |
| PATCH | `/books/:bookId/sentences/:sentenceId/representative` | ✓ | Set representative sentence |
