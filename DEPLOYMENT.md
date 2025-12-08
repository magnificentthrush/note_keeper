## Deployment Guide – NoteKeeper (Next.js + Supabase)

This guide walks you through deploying NoteKeeper, with a focus on avoiding CORS issues. The **recommended platform is Vercel** because it has first‑class support for Next.js.

---

## 1. Prerequisites

- Git repo pushed to GitHub / GitLab / Bitbucket
- Supabase project already set up with:
  - `lecture-audio` storage bucket and RLS policies (from the migrations)
  - `lectures` table (from migrations)
- AssemblyAI account + API key (for transcription)
- LLM provider:
  - Google Gemini API key **or**
  - OpenAI API key

---

## 2. Required Environment Variables

Create a `.env.local` file locally (already git‑ignored) with at least:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side ONLY

ASSEMBLYAI_API_KEY=your-assemblyai-key

# LLM – prefer Gemini (free)
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
# or, if you use OpenAI instead:
# OPENAI_API_KEY=sk-...

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel you will re‑create these in the **Project → Settings → Environment Variables** UI.

**Important security note**
- `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the browser.
- In this app it is only read in API routes / server code, which Vercel keeps server‑side.

---

## 3. Test Locally in “Production” Mode

Before deploying, verify that everything works in a production build:

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000` and:
- Sign up / sign in
- Record a lecture
- Confirm transcription + notes generation work

If this works, you’re ready for Vercel and you’ve already caught most CORS / env issues.

---

## 4. Deploying to Vercel (Recommended)

1. Go to `https://vercel.com` and log in.
2. Click **“New Project” → “Import”** and select your NoteKeeper repo.
3. Vercel will auto-detect **Next.js**:
   - Framework: `Next.js`
   - Build command: `next build`
   - Output: `.next`
4. In the **Environment Variables** section, add all variables from your `.env.local` (same names, same values).
5. Click **Deploy**.

Once the first deploy finishes, you’ll get a URL like:

```text
https://your-project-name.vercel.app
```

Update in Vercel:

- Set `NEXT_PUBLIC_SITE_URL` in the project’s env vars to the production URL, e.g.  
  `NEXT_PUBLIC_SITE_URL=https://your-project-name.vercel.app`

Trigger a redeploy after changing env vars:

```bash
# from local
git commit -am "Set NEXT_PUBLIC_SITE_URL"
git push
```

Vercel will rebuild with the new value.

---

## 5. Supabase Auth Redirects & “Allowed URLs”

To avoid auth / redirect issues in production:

1. In Supabase Dashboard, go to **Authentication → URL Configuration** (or **Settings → Auth** depending on UI version).
2. Set:
   - **Site URL**: your production URL, e.g.  
     `https://your-project-name.vercel.app`
   - **Redirect URLs / Authorized redirect URIs**:
     - `http://localhost:3000/auth/callback`
     - `https://your-project-name.vercel.app/auth/callback`
3. Save changes.

This ensures Supabase can redirect back to your Next.js app correctly after sign‑ups/sign‑ins.

---

## 6. CORS / CROS – How This Setup Avoids Problems

Most of your previous CORS issues came from calling third‑party APIs or Supabase Storage **directly from the browser**. In this project:

- The browser talks **only to your own Next.js domain** (e.g. `localhost:3000` or your Vercel URL).
- Next.js API routes (e.g. `/api/upload-audio`, `/api/process-lecture`) run server‑side and talk to:
  - Supabase (Database + Storage)
  - AssemblyAI
  - Gemini / OpenAI

Because these calls are **server‑to‑server**, CORS is not involved for them.

To keep it that way:
- Do **not** call Supabase Storage REST URLs or AssemblyAI / LLM APIs directly from the browser.
- Always go through your Next.js API routes for anything that needs secrets or special headers.

If you ever add a new external API:
- Add a new route under `src/app/api/.../route.ts`.
- Call it from the frontend with `fetch('/api/your-route', ...)` instead of hitting the external URL directly from the browser.

This pattern almost entirely eliminates browser CORS headaches.

---

## 7. Alternative Platforms (If Not Using Vercel)

Vercel is the **easiest** for this stack. If you still want alternatives:

- **Netlify**: supports Next.js with their Next support; you’ll need to:
  - Use their Next.js runtime / adapter.
  - Configure environment variables similarly.
- **Render / Fly.io**: run `npm run build` then `npm start` in a Node service.

In all cases:

- Keep the same environment variables.
- Expose only `NEXT_PUBLIC_*` and the Supabase anon key to the client.
- Keep service keys and API secrets server‑side.

---

## 8. Quick Checklist Before Final Deploy

- [ ] All env vars set in Vercel exactly as in `.env.local`.
- [ ] `NEXT_PUBLIC_SITE_URL` matches your production URL.
- [ ] Supabase auth redirect URLs include both localhost and the Vercel domain.
- [ ] No direct browser calls to Supabase Storage REST endpoints or external AI APIs.
- [ ] `npm run build` succeeds locally.

Once all of these are green, you should be able to deploy and use NoteKeeper on Vercel without CORS issues.


