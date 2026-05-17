import { z } from "zod";

import { apiError, validationError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type TenorCacheEntry = {
  expiresAt: number;
  payload: TenorSearchResponse;
};

type TenorSearchItem = {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
};

type TenorSearchResponse = {
  enabled: boolean;
  items: TenorSearchItem[];
};

const TENOR_CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, TenorCacheEntry>();

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

function mediaUrl(result: Record<string, unknown>, key: string) {
  const mediaFormats = result.media_formats;
  if (!mediaFormats || typeof mediaFormats !== "object" || Array.isArray(mediaFormats)) return null;

  const media = (mediaFormats as Record<string, unknown>)[key];
  if (!media || typeof media !== "object" || Array.isArray(media)) return null;

  const url = (media as Record<string, unknown>).url;
  return typeof url === "string" ? url : null;
}

function mediaDimensions(result: Record<string, unknown>, key: string) {
  const mediaFormats = result.media_formats;
  if (!mediaFormats || typeof mediaFormats !== "object" || Array.isArray(mediaFormats)) return {};

  const media = (mediaFormats as Record<string, unknown>)[key];
  if (!media || typeof media !== "object" || Array.isArray(media)) return {};

  const dims = (media as Record<string, unknown>).dims;
  if (!Array.isArray(dims)) return {};

  const [width, height] = dims;
  return {
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  };
}

export async function GET(req: Request) {
  try {
    const apiKey = process.env.TENOR_API_KEY;
    if (!apiKey) {
      return Response.json({ enabled: false, items: [] } satisfies TenorSearchResponse);
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      q: searchParams.get("q"),
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const cacheKey = `${parsedQuery.data.q.toLowerCase()}:${parsedQuery.data.limit}`;
    const cached = cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return Response.json(cached.payload);
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: parsedQuery.data.q,
      limit: String(parsedQuery.data.limit),
      media_filter: "gif,tinygif",
      contentfilter: "medium",
    });

    const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return apiError("Tenor search failed", 502);
    }

    const payload = await response.json() as { results?: unknown[] };
    const items = (payload.results ?? []).flatMap((result): TenorSearchItem[] => {
      if (!result || typeof result !== "object" || Array.isArray(result)) return [];

      const value = result as Record<string, unknown>;
      const url = mediaUrl(value, "gif") ?? mediaUrl(value, "tinygif");
      const previewUrl = mediaUrl(value, "tinygif") ?? url;
      const id = typeof value.id === "string" ? value.id : url;

      if (!url || !previewUrl || !id) return [];

      return [{
        id,
        title: typeof value.content_description === "string" ? value.content_description : "GIF",
        url,
        previewUrl,
        ...mediaDimensions(value, "tinygif"),
      }];
    });

    const result = { enabled: true, items } satisfies TenorSearchResponse;
    cache.set(cacheKey, {
      expiresAt: Date.now() + TENOR_CACHE_TTL_MS,
      payload: result,
    });

    return Response.json(result);
  } catch (error) {
    console.log("[TENOR_SEARCH_GET]", error);
    return apiError("Internal Error", 500);
  }
}
