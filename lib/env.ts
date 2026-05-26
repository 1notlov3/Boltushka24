import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const postgresUrl = z.string().min(1).refine(
  (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
  "must start with postgresql:// or postgres://",
);

const websocketUrl = z.preprocess(
  emptyToUndefined,
  z.string().refine(
    (value) => value.startsWith("wss://") || value.startsWith("ws://"),
    "must start with wss:// or ws://",
  ).optional(),
);

const publicSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.preprocess(emptyToUndefined, z.string().default("/sign-in")),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.preprocess(emptyToUndefined, z.string().default("/sign-up")),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: websocketUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,
  CLERK_SECRET_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  LIVEKIT_API_KEY: optionalString,
  LIVEKIT_API_SECRET: optionalString,
  RATE_LIMIT_BACKEND: z.preprocess(
    emptyToUndefined,
    z.enum(["memory", "upstash"]).default("memory"),
  ),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  TENOR_API_KEY: optionalString,
  VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: z.preprocess(emptyToUndefined, z.string().default("mailto:admin@example.com")),
  SENTRY_DSN: optionalUrl,
});

const rawPublicEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const rawServerEnv = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  TENOR_API_KEY: process.env.TENOR_API_KEY,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  SENTRY_DSN: process.env.SENTRY_DSN,
};

const formatEnvError = (error: z.ZodError) => error.issues
  .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
  .join("\n");

const parsePublicEnv = () => {
  const result = publicSchema.safeParse(rawPublicEnv);

  if (!result.success) {
    throw new Error(`Invalid public environment variables:\n${formatEnvError(result.error)}`);
  }

  return result.data;
};

const parseServerEnv = () => {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv must not be imported in client code");
  }

  const result = serverSchema.safeParse(rawServerEnv);

  if (!result.success) {
    throw new Error(`Invalid server environment variables:\n${formatEnvError(result.error)}`);
  }

  return result.data;
};

export const publicEnv = parsePublicEnv();
export const serverEnv = parseServerEnv();

const requireAllOrNone = (groupName: string, values: Record<string, unknown>) => {
  const entries = Object.entries(values);
  const present = entries.filter(([, value]) => Boolean(value));

  if (present.length > 0 && present.length < entries.length) {
    throw new Error(
      `Invalid ${groupName} environment group: set all or none of ${entries.map(([key]) => key).join(", ")}`,
    );
  }
};

requireAllOrNone("LiveKit", {
  NEXT_PUBLIC_LIVEKIT_URL: publicEnv.NEXT_PUBLIC_LIVEKIT_URL,
  LIVEKIT_API_KEY: serverEnv.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: serverEnv.LIVEKIT_API_SECRET,
});

requireAllOrNone("Upstash Redis", {
  UPSTASH_REDIS_REST_URL: serverEnv.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

requireAllOrNone("VAPID", {
  VAPID_PUBLIC_KEY: serverEnv.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: serverEnv.VAPID_PRIVATE_KEY,
});

if (serverEnv.RATE_LIMIT_BACKEND === "upstash" && (!serverEnv.UPSTASH_REDIS_REST_URL || !serverEnv.UPSTASH_REDIS_REST_TOKEN)) {
  throw new Error("RATE_LIMIT_BACKEND=upstash requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
}

if (serverEnv.NODE_ENV === "production" && serverEnv.VAPID_PUBLIC_KEY && serverEnv.VAPID_SUBJECT === "mailto:admin@example.com") {
  throw new Error("VAPID_SUBJECT must be a real contact in production when web push is enabled");
}

export const serverFeatures = {
  livekit: Boolean(publicEnv.NEXT_PUBLIC_LIVEKIT_URL && serverEnv.LIVEKIT_API_KEY && serverEnv.LIVEKIT_API_SECRET),
  redisRateLimit: Boolean(serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN),
  tenor: Boolean(serverEnv.TENOR_API_KEY),
  webPush: Boolean(serverEnv.VAPID_PUBLIC_KEY && serverEnv.VAPID_PRIVATE_KEY),
  sentryServer: Boolean(serverEnv.SENTRY_DSN),
} as const;

export const publicFeatures = {
  livekit: Boolean(publicEnv.NEXT_PUBLIC_LIVEKIT_URL),
  sentryClient: Boolean(publicEnv.NEXT_PUBLIC_SENTRY_DSN),
} as const;
