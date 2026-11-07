# Aries web app

The web app for Aries AI: an all-in-one CRM with AI agents for small
businesses (inbox, contacts, pipeline, calendar, payments, reviews and the
agents that work them). This repo holds the frontend only. It runs against a
developer sandbox server loaded with demo data.

Stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui (Radix), TanStack
Query, React Router and the Supabase JS client.

## Get started

You need Node 20 or newer.

```sh
npm install
cp .env.example .env.local   # then paste in the key sent with your login
npm run dev                  # http://localhost:8080
```

Sign in with the sandbox login you were given. Each login has its own demo
business, "Greenway Landscaping", with contacts, conversations, deals,
appointments, invoices, projects and reviews. You can't break anything that
matters: the maintainer can reset your demo data at any time.

## What works in the sandbox

The sandbox runs the real backend with no outside services connected, so:

- **Works:** everything that reads and writes app data (contacts, companies,
  pipeline, calendar, projects, invoices, reviews, settings, team).
- **Doesn't work:** anything that calls an outside service: AI replies and
  generation, sending email and texts, Gmail and iCloud connections, payments,
  social posting and phone calls. Expect those buttons to show an error. Build
  the UI around them as usual and note in your pull request that you couldn't
  test the live call.

## Where things are

| Path | What |
|---|---|
| `src/pages/client/` | The app's main screens (Inbox, Contacts, Pipeline, Calendar, ...) |
| `src/pages/agency/`, `src/pages/admin/` | Agency and admin screens |
| `src/components/` | Shared components; `ui/` is shadcn/ui |
| `src/layouts/` | App shells with the navigation |
| `src/hooks/`, `src/contexts/`, `src/lib/` | Data hooks, auth, helpers |
| `src/integrations/supabase/` | The Supabase client and generated database types |
| `src/brand/` | Brand settings and feature switches |

`src/brand/` holds the brand settings and feature switches. Screens behind a
switch that's off here (for example Outreach) aren't part of this repo.

The app talks to the backend through the Supabase client (tables, with
row-level security limiting each login to its own business) and through
`supabase.functions.invoke(...)` for server functions. You can't change the
backend from here. If a feature needs a new table, column or function, say so
in an issue or in your pull request and describe what you need.

## Before you open a pull request

```sh
npx tsc --noEmit -p tsconfig.app.json   # type check
npm test                                # unit tests (vitest)
npm run build                           # production build
```

CI runs the same three on every pull request.

- Branch from `main` and open your pull request against `main`.
- Keep pull requests focused: one feature or fix each.
- Only change frontend files. Changes to `.github/`, this README, `.env.example`
  or anything under `src/brands/` are refused automatically.
- Ask before adding a dependency, and explain why in the pull request.
- Match the existing style: Tailwind classes, the components in
  `src/components/ui`, and short, plain-English UI text.
- Add screenshots for visual changes.

## How your pull request gets merged

Pull requests here aren't merged with GitHub's merge button. Open yours (not as
a draft) and a comment says when it's in review, usually within two hours.
Pushing more commits to your branch updates the review. Review comments come
back here.

Once it's accepted, your change lands on `main` shortly after and your pull
request is closed with a note. So never push to `main` directly, and update
your branch by merging `main` into it (or rebasing on it).

If your pull request conflicts with newer changes, a comment asks you to update
your branch.
