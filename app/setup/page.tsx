import { redirect } from "next/navigation";
import { InitialModal } from "@/components/modals/initial-modal";
import { db } from "@/lib/db";
import { initialProfile } from "@/lib/initial-profile";

const SetupPage = async () => {
  const profile = await initialProfile();

  const server = await db.server.findFirst({
    where: {
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
    // ⚡ Bolt Optimization: Select only id for redirection
    select: {
      id: true,
    }
  });

  if (server) {
    return redirect(`/servers/${server.id}`);
  }

  return <InitialModal />;
};

export default SetupPage;
