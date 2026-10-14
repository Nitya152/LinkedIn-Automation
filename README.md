# LinkedIn Manager Engagement Flow Automator (Unipile API)

A full-stack Next.js (App Router, TypeScript, Tailwind CSS, Lucide Icons) web application designed to automate the LinkedIn engagement lifecycle seamlessly via the Unipile API.

---

## 🚀 Key Features

1. **One-Click End-to-End Automation (`/api/automate`)**
   - Dispatches a multi-stage engagement sequence entirely on the server side to eliminate browser CORS limitations.
   - **Step 1: Resolve Public Slug to `provider_id`**: Queries `GET /users/{slug}?account_id={accountId}` and isolates the canonical LinkedIn `provider_id` (`ACoAA...`).
   - **Step 2: Smart Connection Check & Invite**: Inspects `is_relationship` and `invitation.status`. Skips if already connected or pending; otherwise sends `POST /users/invite`.
   - **Step 3: Chronological Posts Retrieval**: Fetches posts via `GET /users/{provider_id}/posts`, deterministically sorted by ISO `parsed_datetime` descending. Extracts full `social_id` (`urn:li:activity:...`).
   - **Step 4: Automated Reaction**: Evaluates permissions and dispatches `POST /posts/reaction` (like, celebrate, support, love, insightful, funny).
   - **Step 5: Automated Comment**: Optionally posts a comment via `POST /posts/{encodedSocialId}/comments` with `multipart/form-data`.

2. **UI & Configuration (Pre-filled & Saved in LocalStorage)**
   - **Unipile Base API URL**: Defaults to `https://api70.unipile.com:20009/api/v1` with auto-sanitization for raw domain inputs.
   - **Unipile API Key**: Pre-filled with password show/hide toggle. Sent securely via `X-API-KEY`.
   - **Unipile Account ID**: Pre-filled with a dedicated **"Fetch My Accounts"** action that populates a dropdown of connected accounts.
   - **Target Profile Input**: Accepts full URLs (`https://www.linkedin.com/in/...`) or vanity slugs, stripping query params and trailing slashes.
   - **Engagement Controls**: Customizable reaction type, custom connection note (with quota saver checkbox), and auto-comment text.

3. **Collapsible API Specification Drawer**
   - Documents all 6 core Unipile endpoints with templates and copy shortcuts.

4. **Interactive Dashboard & Feeds**
   - **Execution Log**: Status badges (`Success`, `Skipped`, `Error`, `Running`), exact HTTP method + URL, and a collapsible syntax-highlighted JSON viewer.
   - **Resolved Profile Card**: Name, headline, location, avatar, network distance badge, connection status badge, and copyable canonical `provider_id`.
   - **Posts Feed**: Post text, timestamps, engagement counters, full `social_id` copy button, and interactive **Manual Like & Manual Comment** controls on every post card.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API Engine**: Unipile API v1

---

## 🏃 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Or build and start production server:
npm run build
npx next start -p 3005
```

Navigate to `http://localhost:3005` in your browser.

