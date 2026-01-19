# Boltushka24

Next.js 14 app with real-time chat features and Clerk-powered authentication.

## Environment

Add a `.env` file with at least:

```
DATABASE_URL="..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..."
CLERK_SECRET_KEY="..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="..."
OPENAI_API_KEY="..." # required if AI features are used
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
```

## Development

Install dependencies and start the dev server:

```
npm install
npm run dev
```

Authentication routes are available at `/sign-in` and `/sign-up` via Clerk components.
