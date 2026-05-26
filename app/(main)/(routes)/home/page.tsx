import { redirect } from "next/navigation";

import { HomeInbox } from "@/components/home/home-inbox";
import { getHomeInboxData } from "@/lib/home-inbox";

const HomePage = async () => {
  const data = await getHomeInboxData();

  if (!data) {
    return redirect("/sign-in");
  }

  return <HomeInbox data={data} />;
};

export default HomePage;
