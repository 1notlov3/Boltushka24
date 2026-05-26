import { MainMobileBar } from "@/components/main-mobile-bar";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";

const MainLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="min-h-dvh md:h-dvh md:overflow-hidden">
      <div className="hidden md:flex h-dvh w-[72px] z-30 flex-col fixed inset-y-0">
        <NavigationSidebar />
      </div>
      <main className="min-h-dvh md:h-dvh md:pl-[72px]">
        <MainMobileBar />
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
