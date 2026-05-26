export const GROUP_SYSTEM_EVENT_PREFIX = "__boltushka_group_system_event__:";

export type GroupSystemEvent =
  | { type: "member_added"; actorName: string; targetNames: string[] }
  | { type: "member_removed"; actorName: string; targetName: string }
  | { type: "member_left"; targetName: string }
  | { type: "role_changed"; actorName: string; targetName: string; role: "ADMIN" | "MEMBER" }
  | { type: "owner_transferred"; actorName: string; targetName: string }
  | { type: "group_renamed"; actorName: string; name: string };

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === "string")
);

export function buildGroupSystemEventContent(event: GroupSystemEvent) {
  return `${GROUP_SYSTEM_EVENT_PREFIX}${JSON.stringify(event)}`;
}

export function parseGroupSystemEvent(content: string | null | undefined): GroupSystemEvent | null {
  if (!content?.startsWith(GROUP_SYSTEM_EVENT_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.slice(GROUP_SYSTEM_EVENT_PREFIX.length)) as unknown;
    if (!isRecord(parsed) || typeof parsed.type !== "string") return null;

    if (parsed.type === "member_added") {
      if (typeof parsed.actorName !== "string" || !isStringArray(parsed.targetNames)) return null;
      return { type: parsed.type, actorName: parsed.actorName, targetNames: parsed.targetNames };
    }

    if (parsed.type === "member_removed") {
      if (typeof parsed.actorName !== "string" || typeof parsed.targetName !== "string") return null;
      return { type: parsed.type, actorName: parsed.actorName, targetName: parsed.targetName };
    }

    if (parsed.type === "member_left") {
      if (typeof parsed.targetName !== "string") return null;
      return { type: parsed.type, targetName: parsed.targetName };
    }

    if (parsed.type === "role_changed") {
      if (typeof parsed.actorName !== "string" || typeof parsed.targetName !== "string") return null;
      if (parsed.role !== "ADMIN" && parsed.role !== "MEMBER") return null;
      return { type: parsed.type, actorName: parsed.actorName, targetName: parsed.targetName, role: parsed.role };
    }

    if (parsed.type === "owner_transferred") {
      if (typeof parsed.actorName !== "string" || typeof parsed.targetName !== "string") return null;
      return { type: parsed.type, actorName: parsed.actorName, targetName: parsed.targetName };
    }

    if (parsed.type === "group_renamed") {
      if (typeof parsed.actorName !== "string" || typeof parsed.name !== "string") return null;
      return { type: parsed.type, actorName: parsed.actorName, name: parsed.name };
    }

    return null;
  } catch {
    return null;
  }
}

export function formatGroupSystemEvent(event: GroupSystemEvent) {
  switch (event.type) {
    case "member_added":
      return `${event.actorName} добавил(а): ${event.targetNames.join(", ")}`;
    case "member_removed":
      return `${event.actorName} удалил(а) ${event.targetName} из группы`;
    case "member_left":
      return `${event.targetName} покинул(а) группу`;
    case "role_changed":
      return event.role === "ADMIN"
        ? `${event.actorName} сделал(а) ${event.targetName} админом`
        : `${event.actorName} снял(а) админа с ${event.targetName}`;
    case "owner_transferred":
      return `${event.actorName} передал(а) владение группой пользователю ${event.targetName}`;
    case "group_renamed":
      return `${event.actorName} переименовал(а) группу в «${event.name}»`;
    default:
      return "Системное событие";
  }
}
