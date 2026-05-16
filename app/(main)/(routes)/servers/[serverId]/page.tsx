import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

interface ServerIdPageProps {
  params: Promise<{
    serverId: string;
  }>
};

const ServerIdPage = async ({ params }: ServerIdPageProps) => {
  const resolvedParams = await params;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const server = await db.server.findUnique({
    where: {
      id: resolvedParams.serverId,
      members: {
        some: {
          profileId: profile.id,
        }
      }
    },
    include: {
      channels: {
        where: {
          name: "основной"
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  const initialChannel = server?.channels[0];

  if (initialChannel?.name !== "основной") {
    return null;
  }

  return redirect(`/servers/${resolvedParams.serverId}/channels/${initialChannel?.id}`)
}
 
export default ServerIdPage;
