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

export function canManageChannels(member: MinimalMember | null | undefined) {
  return hasPermission(member?.role, "channel.manage");
}

export function canManageMembers(member: MinimalMember | null | undefined) {
  return hasPermission(member?.role, "member.manage");
}

export function canDeleteMessage(member: MinimalMember | null | undefined, authorMemberId: string) {
  if (!member) return false;
  return member.id === authorMemberId || hasPermission(member.role, "message.manage");
}

export function canEditMessage(member: MinimalMember | null | undefined, authorMemberId: string) {
  return !!member && member.id === authorMemberId;
}

export function canPinMessage(member: MinimalMember | null | undefined, authorMemberId: string) {
  if (!member) return false;
  return member.id === authorMemberId || hasPermission(member.role, "message.pin");
}

export function canReactToMessage(member: MinimalMember | null | undefined) {
  return hasPermission(member?.role, "message.react");
}

export function canCreateMessage(member: MinimalMember | null | undefined) {
  return hasPermission(member?.role, "message.create");
}

export function canSaveMessage(member: MinimalMember | null | undefined) {
  return hasPermission(member?.role, "message.save");
}
