import { ChannelCategory, Member, Profile, Server } from "@prisma/client";

export type ServerMemberWithProfile = Pick<
  Member,
  "id" | "role" | "profileId" | "serverId" | "createdAt" | "updatedAt"
> & {
  profile: Pick<
    Profile,
    "id" | "name" | "imageUrl" | "status" | "customStatus" | "lastSeenAt"
  >;
};

export type ServerWithMembersWithProfiles = Server & {
  members: ServerMemberWithProfile[];
  channelCategories?: Pick<ChannelCategory, "id" | "name" | "position">[];
  _count?: {
    members: number;
  };
};
