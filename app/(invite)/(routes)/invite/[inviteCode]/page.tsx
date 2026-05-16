import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

interface InviteCodePageProps {
  params: Promise<{
    inviteCode: string;
  }>;
};

const InviteCodePage = async ({
  params
}: InviteCodePageProps) => {
  const resolvedParams = await params;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  if (!resolvedParams.inviteCode) {
    return redirect("/");
  }

  const existingServer = await db.server.findFirst({
    where: {
      inviteCode: resolvedParams.inviteCode,
      members: {
        some: {
          profileId: profile.id
        }
      }
    },
    // ⚡ Bolt Optimization: Select only id for redirection
    select: {
      id: true,
    }
  });

  if (existingServer) {
    return redirect(`/servers/${existingServer.id}`);
  }

  const server = await db.server.update({
    where: {
      inviteCode: resolvedParams.inviteCode,
    },
    data: {
      members: {
        create: [
          {
            profileId: profile.id,
          }
        ]
      }
    }
  });

  if (server) {
    return redirect(`/servers/${server.id}`);
  }
  
  return null;
}
 
export default InviteCodePage;
