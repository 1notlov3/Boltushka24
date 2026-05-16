import { ChannelCategory, Server, Member, Profile } from "@prisma/client";

export type ServerWithMembersWithProfiles = Server & {
  members: (Member & { profile: Profile })[];
  channelCategories?: Pick<ChannelCategory, "id" | "name" | "position">[];
};
