import { MemberRole, type Member } from "@prisma/client";

export type Permission =
  | "server.manage"
  | "server.invite"
  | "channel.manage"
  | "member.manage"
  | "message.manage"
  | "message.create"
  | "message.react"
  | "message.pin"
  | "message.save";

type MinimalMember = Pick<Member, "id" | "role">;
type MemberWithCustomRoles = MinimalMember & {
  serverRoles?: Array<{
    role: {
      permissions: unknown;
    };
  }>;
};

const permissionsByRole: Record<MemberRole, Permission[]> = {
  [MemberRole.ADMIN]: [
    "server.manage",
    "server.invite",
    "channel.manage",
    "member.manage",
    "message.manage",
    "message.create",
    "message.react",
    "message.pin",
    "message.save",
  ],
  [MemberRole.MODERATOR]: [
    "server.invite",
    "channel.manage",
    "member.manage",
    "message.manage",
    "message.create",
    "message.react",
    "message.pin",
    "message.save",
  ],
  [MemberRole.GUEST]: [
    "message.create",
    "message.react",
    "message.save",
  ],
};

export function hasPermission(role: MemberRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return permissionsByRole[role]?.includes(permission) ?? false;
}

function permissionList(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Permission => (
    typeof item === "string" &&
    [
      "server.manage",
      "server.invite",
      "channel.manage",
      "member.manage",
      "message.manage",
      "message.create",
      "message.react",
      "message.pin",
      "message.save",
    ].includes(item)
  ));
}

export function resolvePermissions(member: MemberWithCustomRoles | null | undefined) {
  if (!member) return [];

  return Array.from(new Set([
    ...(permissionsByRole[member.role] ?? []),
    ...(member.serverRoles ?? []).flatMap((assignment) => permissionList(assignment.role.permissions)),
  ]));
}

export function memberHasPermission(member: MemberWithCustomRoles | null | undefined, permission: Permission) {
  return resolvePermissions(member).includes(permission);
}

export function canManageChannels(member: MemberWithCustomRoles | null | undefined) {
  return memberHasPermission(member, "channel.manage");
}

export function canManageMembers(member: MemberWithCustomRoles | null | undefined) {
  return memberHasPermission(member, "member.manage");
}

export function canDeleteMessage(member: MemberWithCustomRoles | null | undefined, authorMemberId: string) {
  if (!member) return false;
  return member.id === authorMemberId || memberHasPermission(member, "message.manage");
}

export function canEditMessage(member: MemberWithCustomRoles | null | undefined, authorMemberId: string) {
  return !!member && member.id === authorMemberId;
}

export function canPinMessage(member: MemberWithCustomRoles | null | undefined, authorMemberId: string) {
  if (!member) return false;
  return member.id === authorMemberId || memberHasPermission(member, "message.pin");
}

export function canReactToMessage(member: MemberWithCustomRoles | null | undefined) {
  return memberHasPermission(member, "message.react");
}

export function canCreateMessage(member: MemberWithCustomRoles | null | undefined) {
  return memberHasPermission(member, "message.create");
}

export function canSaveMessage(member: MemberWithCustomRoles | null | undefined) {
  return memberHasPermission(member, "message.save");
}
