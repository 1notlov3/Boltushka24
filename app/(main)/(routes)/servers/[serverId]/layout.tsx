import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { ServerSidebar } from "@/components/server/server-sidebar";
import { ServerActivityProvider } from "@/components/providers/server-activity-provider";

const ServerIdLayout = async (props: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) => {
  const { children } = props;
  const params = await props.params;
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  const member = await db.member.findFirst({
    where: {
      serverId: params.serverId,
      profileId: profile.id,
    },
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          status: true,
        },
      },
    },
  });

  if (!member) {
    return redirect("/");
  }

  return ( 
    <ServerActivityProvider
      serverId={params.serverId}
      currentMember={{
        memberId: member.id,
        profileId: member.profile.id,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
        status: member.profile.status,
      }}
    >
      <div className="h-full">
        <div 
        className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0">
          <ServerSidebar serverId={params.serverId} />
        </div>
        <main className="h-full md:pl-60">
          {children}
        </main>
      </div>
    </ServerActivityProvider>
   );
}
 
export default ServerIdLayout;
