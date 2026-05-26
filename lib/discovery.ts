import { z } from "zod";

export const DiscoveryDescriptionSchema = z.string().trim().max(500).optional().nullable();
export const DiscoveryQuerySchema = z.string().trim().max(80).optional().default("");

export function normalizeServerDescription(value: string | null | undefined) {
  const description = value?.trim() ?? "";
  return description.length > 0 ? description : null;
}

export function publicServerHref(inviteCode: string) {
  return `/invite/${inviteCode}`;
}

export function canShowInDiscovery(server: { isPublic: boolean }) {
  return server.isPublic;
}
