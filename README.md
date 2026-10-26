# BeeHive prototype — quick setup

1. `npm install`
2. `cp .env.example .env.local` and set `GEMINI_API_KEY` (server-side only; get one at https://aistudio.google.com/apikey)
3. `npm run dev` → http://localhost:3000
4. In the Firebase console (project `beehive-f0282`): enable Email/Password + Google sign-in, add `localhost` to Authorized domains, and deploy `firestore.rules`.

AI features (moderation, recommendations, opportunity scout, resume) run through `/api/ai`, which checks the user's Firebase ID token. The key never reaches the browser.

---

# BeeHive 🐝
### The Student Collaboration & Project Showcase Platform

BeeHive is a dedicated social and project-sharing ecosystem built specifically for high school and teenage students to connect, showcase innovative projects, find project teammates, exchange feedback, discover opportunities, and collaborate safely.

---

## 🌟 Key Features

1. **Student Profiles**: Customized high school profiles displaying grade, school/city, technical and creative interests, bios, and direct contact details (Discord, email, phone).
2. **Project Showcase**: Rich project cards with multimedia, tags, description, timestamp, likes, comments, and creator verification.
3. **Smart Feed & AI Recommendations**:
   - **Main Feed**: Chronological stream of projects from peers.
   - **Trending**: High-engagement projects ranked by community likes.
   - **AI Recommended**: Matches user interests to projects using Google GenAI / Gemini.
4. **Opportunity Board**:
   - Discover internships, volunteer opportunities, competitions, hackathons, and jobs for high schoolers.
   - AI-powered opportunity generator that scouts tailored roles based on your skills and grade level.
5. **Real-Time Direct Messaging**: Direct chat between peers to coordinate project teams and hackathon submissions.
6. **FERPA & COPPA Compliant**:
   - Built-in student privacy safeguards and data protection.
   - Instant account and data deletion capabilities (`/settings/profile`).
   - Detailed Terms of Service (`/terms`) and Privacy Policy (`/privacy`) complying with educational and child privacy regulations.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend / Database**: Firebase Firestore (with custom RBAC security rules in `firestore.rules`)
- **Authentication**: Firebase Authentication (Email/Password & Google Sign-In)
- **AI Integration**: `@google/genai` (Google Gemini Flash)
- **Icons & UI**: `lucide-react`, `motion/react`, `sonner`
- **Utilities**: `date-fns`, `clsx`, `tailwind-merge`

---

## 🚀 Quick Start (Running Locally)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18.18 or higher (v20+ recommended)
- `npm` or `yarn` or `pnpm`

### 2. Extract & Install Dependencies
```bash
# If you downloaded the zip:
unzip beehive-project.zip
cd beehive-project

# Install npm dependencies
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory (you can copy `.env.example`):
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Google Gemini API Key (Server-side)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Client Configuration (if using custom Firebase project)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 📁 Project Directory Structure

```
├── app/
│   ├── layout.tsx             # Root layout with metadata & providers
│   ├── globals.css            # Tailwind CSS imports and global styling
│   ├── page.tsx               # BeeHive landing & download hub
│   ├── beehive/page.tsx       # Main app dashboard (Feed, Trending, AI Recommendations, Opportunities)
│   ├── download/page.tsx      # Dedicated codebase download center
│   ├── onboarding/page.tsx    # New student onboarding profile wizard
│   ├── profile/[id]/page.tsx  # Dynamic user profile page & project portfolio
│   ├── messages/              # Direct messaging & chat system
│   ├── settings/              # User settings & COPPA data deletion
│   ├── terms/page.tsx         # FERPA & COPPA compliant terms of service
│   ├── privacy/page.tsx       # Comprehensive privacy policy
│   ├── verify-email/page.tsx  # Email verification flow
│   └── api/
│       └── download/route.ts  # Direct attachment streaming endpoint
├── components/
│   ├── AuthModal.tsx          # Login, Sign Up & Password Reset modal
│   ├── ProjectCard.tsx        # Interactive project card with like/comment logic
│   ├── ErrorBoundary.tsx      # React error boundary with graceful fallback
│   └── Providers.tsx          # Client providers (Auth, Toaster, ErrorBoundary)
├── contexts/
│   └── AuthContext.tsx        # Firebase auth context & route protection
├── lib/
│   ├── firebase.ts            # Firebase SDK client initialization
│   ├── firestore-errors.ts    # Rich error handling and reporting
│   ├── messaging.ts           # Firestore chat channel management
│   └── utils.ts               # Classnames merge utility
├── types/
│   └── index.ts               # Core TypeScript interfaces (User, Project, Comment, etc.)
├── scripts/
│   └── package-project.py     # Script to generate .zip and .tar.gz distribution bundles
├── firestore.rules            # Granular Firestore security and access control rules
├── firebase-blueprint.json    # Firestore collection schema & field blueprints
├── package.json               # NPM scripts and project dependencies
└── tsconfig.json              # TypeScript compiler configuration
```

---

## 🔒 Security & Firebase Rules

The project includes production-ready Firestore security rules (`firestore.rules`) designed to enforce:
- Authenticated user read/write boundaries.
- User profile ownership (`request.auth.uid == userId`).
- Student privacy protections and data sanitation.
- Project and message author verification.

To deploy rules to your Firebase console:
```bash
firebase deploy --only firestore:rules
```

---

## 📄 License
Created for student collaboration and educational development.
