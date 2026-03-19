import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

interface ServerIdPageProps {
  params: {
    serverId: string;
  }
};

const ServerIdPage = async ({
  params
}: ServerIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const server = await db.server.findUnique({
    where: {
      id: params.serverId,
      members: {
        some: {
          profileId: profile.id,
        }
      }
    },
    // ⚡ Bolt Optimization: Select only id for redirection
    select: {
      channels: {
        where: {
          name: "основной"
        },
        orderBy: {
          createdAt: "asc"
        },
        select: {
          id: true,
          name: true,
        }
      }
    }
  })

  const initialChannel = server?.channels[0];

  if (initialChannel?.name !== "основной") {
    return null;
  }

  return redirect(`/servers/${params.serverId}/channels/${initialChannel?.id}`)
}
 
export default ServerIdPage;