export type CreateGroupMemberOption = {
  id: string;
  profileId?: string;
  name: string;
  imageUrl: string | null;
  role?: string;
};

export type CreateGroupPayloadInput = {
  serverId: string;
  name: string;
  imageUrl?: string | null;
  selectedMemberIds: string[];
  currentMemberId?: string | null;
};

export type CreateGroupPayload = {
  serverId: string;
  name: string;
  imageUrl: string | null;
  memberIds: string[];
};

export const MIN_GROUP_OTHER_MEMBERS = 2;
export const MAX_GROUP_NAME_LENGTH = 120;

export function normalizeGroupName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function normalizeImageUrl(imageUrl?: string | null) {
  const value = imageUrl?.trim();
  return value ? value : null;
}

export function uniqueMemberIds(memberIds: string[]) {
  return Array.from(new Set(memberIds.filter(Boolean)));
}

export function buildCreateGroupConversationPayload({
  serverId,
  name,
  imageUrl,
  selectedMemberIds,
  currentMemberId,
}: CreateGroupPayloadInput): CreateGroupPayload {
  const memberIds = uniqueMemberIds(selectedMemberIds).filter((memberId) => memberId !== currentMemberId);

  return {
    serverId,
    name: normalizeGroupName(name),
    imageUrl: normalizeImageUrl(imageUrl),
    memberIds,
  };
}

export function canSubmitGroupConversation(payload: CreateGroupPayload) {
  return Boolean(payload.serverId)
    && payload.name.length > 0
    && payload.name.length <= MAX_GROUP_NAME_LENGTH
    && payload.memberIds.length >= MIN_GROUP_OTHER_MEMBERS;
}

export function groupConversationHref(serverId: string, conversationId: string) {
  return `/servers/${serverId}/conversations/group/${conversationId}`;
}
