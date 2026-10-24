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
   Then run each update file **in order** the same way: [`supabase/migration-002.sql`](supabase/migration-002.sql), then [`supabase/migration-003.sql`](supabase/migration-003.sql).
   > Always run `schema.sql` **followed by** every `migration-…sql`. Running `schema.sql` alone later would undo the update rules.
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
   | `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) |
   | `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (server only) |

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
- **Admin**: everything, including Website content, Why us & steps, FAQ, Forms & fields, Webhooks and Users (create users with username, employee ID and password, reset passwords, deactivate or reactivate, change roles).
- **Agent**: Workers (add, edit, publish, retire, export), Professions & countries, Form entries (status, notes, export) and My account. The database itself blocks agents from changing the admin-only areas.
- Anyone signed in can change their own password under **My account**. Admins cannot view passwords, only reset them.

### Security
- **Form entries** go only through the `submit-form` Netlify function: Cloudflare Turnstile bot check, server-side validation, max 8 entries per visitor IP per hour, duplicate (double-click) protection. Browsers cannot write to the database directly.
- **Two-step login (TOTP)** is mandatory for Admins and optional for Agents (My account). Lost phone → another Admin uses **Users → Reset** (or Supabase → Authentication → Users → the user → delete the MFA factor).
- **Automatic logout** after 30 minutes without activity.
- **Uploads**: images 5 MB, PDF 15 MB, video 50 MB; only PNG/JPG/WebP/PDF/MP4/WebM.
- **Security headers** (CSP, HSTS, anti-framing) in `netlify.toml`. If a new marketing tag added in GTM is blocked, add its domain to the Content-Security-Policy there.
- **Privacy policy (PDPL)** page at `/privacy`, editable under Website content; forms can require consent to it.

### Activity tracking
- **Form entries** record who last changed the status and who last edited the notes, with the time (shown in the table, the details window and the Excel export).
- **Workers** record who created and last edited each profile, plus a full log: created, edited (with the list of changed fields), published, republished and retired, each with user and time. **Workers → Export Excel** downloads two sheets: full profiles and the activity log.

### Extra forms
Forms created in **Forms & fields** always get their own page (`/form/<slug>`) and can also appear as a header link, a footer link and/or a section on the home page at a chosen position. Extra forms can be deleted (their entries are deleted too; export them first). The core Contact and Booking forms cannot be deleted.
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
