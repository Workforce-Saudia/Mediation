# Workforce Saudia – Mediation Service Website

A bilingual (Arabic-first, plus English) marketing site and admin dashboard for the Workforce Saudia mediation service.

- **Frontend:** React + Vite. Single-page app, responsive on mobile, tablet and desktop, with RTL and LTR layouts.
- **Backend:** Supabase (database, login, file storage), plus one Netlify Function for user management.
- **Hosting:** Netlify (recommended).

---

## Page URLs

| URL | Page |
|---|---|
| `/` | Home: hero banner, About, Why us, Mediation service, FAQ teaser, Contact form, WhatsApp button |
| `/#about` `/#why` `/#mediation` `/#faq` `/#contact` | Links straight to a home-page section (useful for ads) |
| `/workers` | Worker selection, all professions and all countries |
| `/workers/housemaid` | One profession (the slug is set in the dashboard) |
| `/workers/housemaid/ph` | One profession and one country (the "country page") |
| `/workers/all/ph` | One country, all professions |
| `/book/<worker-id>` | Booking form for the chosen worker (worker ID is filled in for the visitor) |
| `/faq` | FAQ |
| `/terms` | Terms & Conditions (also linked in the footer) |
| `/contact` | Contact form on its own page |
| `/form/<slug>` | Any extra form you create in the dashboard |
| `/thank-you?form=…` | Shown after a form is sent. Use it as the conversion page in Google Ads, Meta or Snap |
| `/admin` | Dashboard (login at `/admin/login`) |

Add `?lang=en` to any URL to open the site in English, for example in English-language ad campaigns.

---

## One-time setup (about 20 minutes)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick a region close to Saudi Arabia, such as Frankfurt or Mumbai.
2. Open **SQL Editor**, then **New query**. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the tables, security rules, the `media` storage bucket and starter data: 5 professions, 10 countries, the forms, the "Why us" cards and the FAQ.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Only admins should create accounts.
4. Create the first Admin: **Authentication → Users → Add user → Create new user**
   - Email: `admin@staff.wfs.local` (the part before `@` is the username, here `admin`)
   - Password: choose a strong one
   - Tick **Auto Confirm User**

   The first user ever created automatically becomes an **Admin**. Create every other user from the dashboard (**Users** page).
5. **Project Settings → API**: copy the **Project URL**, the **anon / publishable key** and the **service_role / secret key**.

### 2. Netlify (recommended hosting)

**Option A: GitHub (best for future updates)**
1. Push this folder to a GitHub repository.
2. In Netlify: **Add new site → Import from Git**, then pick the repository. Netlify reads the build settings from `netlify.toml`.
3. **Site configuration → Environment variables**: add

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (server only, never shared) |

4. Click **Deploy**. After it finishes, connect your domain under **Domain management**.

**Option B: no GitHub (Netlify CLI)**

Install [Node.js 20+](https://nodejs.org) first, then run these in this folder:

```bash
npm install
npx netlify-cli login
npx netlify-cli init
npx netlify-cli env:set VITE_SUPABASE_URL "https://xxxx.supabase.co"
npx netlify-cli env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
npx netlify-cli env:set SUPABASE_URL "https://xxxx.supabase.co"
npx netlify-cli env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
npx netlify-cli deploy --build --prod
```

> Netlify's drag-and-drop upload is **not** enough. It skips the build step and the user-management function.

### 3. First login
Go to `https://your-site/admin/login` and sign in with username `admin` and the password you set. Then:
1. **Website content → General settings**: logo, WhatsApp number, phone, email, Google Tag Manager ID.
2. **Website content → Home – Hero banner**: upload the banner image and edit the headline and button.
3. **Professions & countries**: adjust the lists.
4. **Workers → Add worker**: add profiles, then **Publish**.
5. **Users**: create Agent accounts.

---

## Running it on your computer (optional)

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values. Then run:

```bash
npm run dev
```

The **Users** page needs the Netlify function. To test it locally, use `npx netlify-cli dev` instead of `npm run dev`.

---

## How things work

### Roles
- **Admin**: everything, plus the **Users** page (create users with a username and password, change any password, deactivate or reactivate accounts, change roles).
- **Agent**: everything except the Users page. Anyone signed in can change their own password under **My account**.
- A deactivated user is blocked from logging in and loses database access immediately.

### Workers
- A profile has: worker ID, name, age, country, photo (PNG/JPG), a default CV (PDF/PNG/JPG), one or more professions, and an optional separate CV for each profession.
- **Publish** shows the worker on the website and records the publish date and time. **Retire** hides it. **Republish** shows it again and is logged as a *republish*. The full history is on the worker's page.
- The website orders professions by number of published CVs (most first). Within each profession, countries are ordered the same way. Each profession and country shows a counter.

### Forms
- **Forms & fields**: add, remove, reorder and rename fields in both languages, mark them required, and add validation (for example, the Iqama/ID must be 10 digits starting with 1 or 2).
- The booking form fills in the worker ID automatically, locks it, and requires ticking Terms & Conditions before submitting.
- Every entry is saved in Supabase together with its campaign source (UTM, gclid, fbclid). Find entries under **Form entries**, grouped by form. You can filter them, change their status, add notes and **Export to Excel**.

### Automation (Zapier, Make, n8n…)
**Webhooks & automation**: paste a webhook URL, such as Zapier's *Catch Hook*. Each new form entry is then sent automatically as JSON. You can also send events when a worker is published or retired. Supabase sends these from the database itself (`pg_net`), so they keep working whatever the hosting is.

### Campaign tracking
- Put your **Google Tag Manager ID** in General settings. Add GA4, Meta Pixel, Snap and TikTok tags inside GTM.
- The site pushes these `dataLayer` events: `form_submit` (with `form`), `cta_click`, `choose_worker`, `view_cv`, `whatsapp_click`.
- Use `/thank-you` as the conversion URL.

### Editing text
**Website content** lists every headline, paragraph, button (text and destination), image and setting, in Arabic and English. Long text accepts simple formatting: `## heading`, `- bullet`, `**bold**`, `[link](https://…)`.
