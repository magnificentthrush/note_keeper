## NoteKeeper MVP – Technical Report

### 1. Overview

**NoteKeeper** is a Next.js 15 (App Router) SaaS-style web app that turns recorded lectures into structured, study-ready notes using:
- Browser audio recording (MediaRecorder)
- Supabase (auth, Postgres, Storage)
- AssemblyAI (transcription)
- Gemini / OpenAI (LLM-generated notes, Gemini preferred as free tier)

The current state is an end-to-end working MVP suitable for personal use and demos, deployed to Vercel.

---

### 2. Core User Flows

- **Authentication**
  - Email + password auth via Supabase.
  - Protected routes for dashboard, record, lecture detail, and profile pages.

- **Recording a lecture**
  - From `/record`, user starts/stops recording in the browser.
  - User can add **keypoints** (timestamped notes) while recording.
  - On stop, the audio and keypoints are sent to the backend:
    - Audio uploaded to a private Supabase Storage bucket (`lecture-audio`).
    - A `lectures` row is created with `status = 'processing'`.

- **Processing & notes generation**
  - A server-side API route:
    - Uses AssemblyAI to transcribe the audio (with signed URL access).
    - Saves detailed transcript JSON to the lecture row.
    - Calls LLM (Gemini by default, OpenAI as fallback) to generate structured notes, integrating user keypoints.
  - On success: `status = 'completed'` and `final_notes` is saved.
  - On quota/LLM failure: transcript is still saved; `final_notes` contains an explanatory message and a “Retry AI Notes” path exists.

- **Viewing & managing lectures**
  - **Dashboard**: Grid of lecture cards with status badges (Recording, Processing, Ready, Error), rename, and delete actions.
  - **Lecture detail**:
    - Human-readable date, status badge.
    - **Editable title** – hover over the title to reveal an edit button; inline editing with Enter/Escape.
    - Keypoints highlighted with timestamps.
    - Formatted notes rendered via a lightweight markdown-like renderer.
  - **Rename lecture**:
    - Inline editing on dashboard cards (click edit icon on hover).
    - Inline editing on lecture detail page header.
    - **Auto-title**: If user doesn't provide a title, the system extracts one from the AI-generated notes (first heading or meaningful text).
  - **Delete lecture**:
    - Deletes both the lecture row and its audio file from Supabase Storage (best-effort for storage).

- **Profile**
  - Shows signed-in user email and simple stats:
    - Total lectures
    - Completed (notes generated)
  - Allows signing out and provides quick navigation to dashboard/record.

---

### 3. Architecture & Code Organization

- **Framework & runtime**
  - Next.js 15 App Router, React 19.
  - Mix of Server Components and Client Components.
  - Deployed on Vercel; SSR and API routes run on the edge/Node runtimes as configured by Next/Vercel defaults.

- **Project structure (high level)**
  - `src/app/`
    - `page.tsx` – marketing/landing page.
    - `auth/` – sign-in / sign-up UI and Supabase client auth.
    - `dashboard/` – folder grid and uncategorized lectures.
    - `dashboard/folder/[folderId]/` – lectures inside a specific folder.
    - `record/` – recording page with folder selector and upload flow.
    - `lecture/[id]/` – lecture detail view and "Retry" logic.
    - `profile/` – user profile & stats.
    - `api/folders/` – CRUD for folders (GET, POST, PATCH, DELETE).
    - `api/upload-audio/` – handle audio upload to Supabase Storage (service role, no CORS).
    - `api/process-lecture/` – transcription + LLM processing pipeline (also auto-generates title from notes).
    - `api/update-lecture-title/` – rename/update lecture title.
    - `api/delete-lecture/` – deletion of lecture row + storage object.
    - `globals.css` – Tailwind + global CSS (dark theme, typography, resets).
    - `layout.tsx` – root layout shell.
  - `src/components/`
    - `ui/` – `Button`, `Card`, `Badge`, `Input`.
    - `layout/` – `Header`, `Sidebar`.
    - `features/folder/` – `FolderCard`, `CreateFolderButton`, `FolderSelector`, barrel file.
    - `features/lecture/` – `LectureCard`, `NoteRenderer`, barrel file.
    - `features/recording/` – `Recorder`, `KeypointInput`, barrel file.
  - `src/lib/`
    - `supabase/` – `client.ts` (browser-safe singleton) and `server.ts` (SSR/service role clients).
    - `types.ts` – TypeScript models (e.g., `Folder`, `Lecture`, `Keypoint`, `TranscriptResponse`).
  - `supabase/migrations/` – SQL migrations for `folders`, `lectures`, and `lecture-audio` RLS policies.

---

### 4. External Services & Integrations

- **Supabase**
  - **Auth**: email/password; used both client-side (Supabase JS) and server-side (`@supabase/ssr`).
  - **Database**:
    - `folders` table stores: IDs, `user_id`, `name`, timestamps.
    - `lectures` table stores: IDs, `user_id`, `folder_id`, title, `audio_url`, `user_keypoints`, `transcript_json`, `final_notes`, `status`, timestamps.
  - **Storage**:
    - Private bucket `lecture-audio`.
    - RLS policies ensure users can only access their own folder (`userId/file.ext`).
    - Service role key used in API routes for upload and deletion.

- **AssemblyAI**
  - Used to transcribe audio using signed URLs from Supabase Storage.
  - Transcript with speaker labels and timing is normalized into `TranscriptResponse`, persisted to the DB.

- **LLM (Gemini / OpenAI)**
  - Gemini is preferred if `GOOGLE_GEMINI_API_KEY` is present; OpenAI is fallback.
  - Robust error handling:
    - Authentication errors → explicit messages.
    - Quota/429 errors → store transcript-only “Transcript Available” note with explanation.
  - Prompt explicitly instructs the model to:
    - Integrate user keypoints and mark them with a special “USER NOTE” indicator.
    - Produce structured, markdown-style notes.

---

### 5. CORS & Security Design

- **CORS avoidance strategy**
  - Browser calls **only** your own domain:
    - `GET/POST/PATCH/DELETE /api/folders`
    - `POST /api/upload-audio`
    - `POST /api/process-lecture`
    - `PATCH /api/update-lecture-title`
    - `DELETE /api/delete-lecture`
  - All external calls (Supabase Storage, AssemblyAI, Gemini/OpenAI) happen **server-side** from these API routes.
  - This design almost completely eliminates browser CORS issues.

- **RLS and storage security**
  - Storage bucket is private.
  - RLS policies restrict access by `auth.uid()` and folder name.
  - Audio access for AssemblyAI is via short-lived signed URLs.

- **Secrets**
  - Supabase service role key, AssemblyAI key, and LLM keys are used only in server contexts:
    - Not exposed to the client (`NEXT_PUBLIC_*` only for anon URL/key).

---

### 6. Current MVP Status

**Implemented & working:**
- Auth, protected routes, session handling.
- Recording, keypoint capture, upload, and lecture creation.
- Transcription with AssemblyAI and note generation with Gemini/OpenAI.
- Handling of LLM quota/auth failures with graceful fallback.
- **Folder/Course organization**: Users can create folders to organize lectures by course/topic.
  - Create, rename, and delete folders from the dashboard.
  - Select folder when recording a new lecture.
  - Lectures without a folder appear in "Uncategorized".
- Dashboard with folder grid, status-aware cards, inline rename, and delete flow.
- Lecture detail view with editable title, keypoints + note rendering.
- **Auto-title**: If user leaves title blank, system extracts a title from AI-generated notes.
- Profile page with simple stats and sign-out.
- Vercel deployment pipeline with stricter TypeScript + ESLint (build must be clean).

**Known limitations / trade-offs:**
- No dedicated mobile navigation beyond responsive layout; primarily optimized for desktop.
- Markdown parser (`NoteRenderer`) is intentionally simple and does not cover full markdown spec.
- No pagination / search for lectures or folders.
- No team/multi-tenant features (single-user lectures).
- Retry flow for AI notes is triggered manually from the lecture page (no background job queue).

---

### 7. Testing & Deployment

- **Local**
  - `npm run dev` – development.
  - `npm run build && npm start` – production-like test.
  - Linting and type-checking are part of `next build`.

- **Deployment**
  - Primary: **Vercel** (Next.js native support).
  - All environment variables mirrored in Vercel project settings.
  - Supabase Auth redirect URLs configured for both localhost and production URL.
  - `DEPLOYMENT.md` in the repo documents exact setup and CORS-safe patterns.

---

### 8. Suggested Next Steps Beyond MVP

- UX/UI:
  - Add mobile-optimized nav (e.g., bottom nav or hamburger sidebar).
  - Add a “recent activity” or “quick actions” section on dashboard.

- Features:
  - Lecture search, filtering, and tagging.
  - Export notes as PDF/Markdown.
  - More advanced note templates (flashcards, summaries, quiz questions).

- Reliability:
  - Background job queue for long-running transcription and LLM work.
  - More robust retry and notification system (e.g., email when notes are ready).

This MVP already delivers a complete loop from recording → transcription → AI notes → review/delete, with production-ready deployment on Vercel and a clear path for future enhancements.



