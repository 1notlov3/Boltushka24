import { z } from "zod";

import { apiError, unauthorized, validationError } from "@/lib/api-response";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 200_000;
const PREVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const QuerySchema = z.object({
  url: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  }, "Only http(s) URLs are supported"),
});

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host.startsWith("127.") || host === "::1") return true;
  if (host.startsWith("10.") || host.startsWith("192.168.")) return true;

  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function firstMeta(html: string, names: string[]) {
  for (const name of names) {
    const propertyPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const contentPattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
    const match = html.match(propertyPattern) ?? html.match(contentPattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }

  return null;
}

function firstTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].replace(/\s+/g, " ")) : null;
}

function absoluteUrl(value: string | null, base: string) {
  if (!value) return null;

  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsedQuery = QuerySchema.safeParse({
      url: searchParams.get("url"),
    });

    if (!parsedQuery.success) return validationError(parsedQuery.error);

    const target = new URL(parsedQuery.data.url);
    if (isPrivateHost(target.hostname)) {
      return apiError("URL is not allowed", 400);
    }

    const cached = await db.linkPreview.findUnique({
      where: { url: target.toString() },
    });

    if (cached && cached.fetchedAt.getTime() > Date.now() - PREVIEW_TTL_MS) {
      return Response.json(cached);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Boltushka24-LinkPreview/1.0",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return apiError("Preview fetch failed", 502);
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const title = firstMeta(html, ["og:title", "twitter:title"]) ?? firstTitle(html);
    const description = firstMeta(html, ["og:description", "twitter:description", "description"]);
    const image = absoluteUrl(firstMeta(html, ["og:image", "twitter:image"]), response.url);

    const preview = await db.linkPreview.upsert({
      where: { url: target.toString() },
      create: {
        url: target.toString(),
        title,
        description,
        image,
        fetchedAt: new Date(),
      },
      update: {
        title,
        description,
        image,
        fetchedAt: new Date(),
      },
    });

    return Response.json(preview);
  } catch (error) {
    console.log("[LINK_PREVIEW_GET]", error);
    return apiError("Internal Error", 500);
  }
}
