import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Hash, Lock, Users } from "lucide-react";

import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { Button } from "@/components/ui/button";
import { InviteJoinButton } from "@/components/invite/invite-join-button";

interface InviteCodePageProps {
  params: Promise<{
    inviteCode: string;
  }>;
}

const InviteCodePage = async ({ params }: InviteCodePageProps) => {
  const resolvedParams = await params;

  if (!resolvedParams.inviteCode) {
    return redirect("/");
  }

  const [profile, server] = await Promise.all([
    currentProfile(),
    db.server.findUnique({
      where: { inviteCode: resolvedParams.inviteCode },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        isPublic: true,
        inviteCode: true,
        members: {
          select: {
            profileId: true,
          },
        },
        _count: {
          select: {
            members: true,
            channels: true,
          },
        },
      },
    }),
  ]);

  if (!server) {
    return redirect("/");
  }

  const alreadyMember = !!profile && server.members.some((member) => member.profileId === profile.id);
  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(`/invite/${server.inviteCode}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4 text-zinc-900 dark:bg-[#111214] dark:text-zinc-100">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-blue-950/10 dark:border-white/10 dark:bg-[#1e1f22]">
        <div className="relative h-36 bg-gradient-to-br from-indigo-500 to-blue-500">
          <div className="absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-[2rem] border-4 border-white bg-zinc-200 dark:border-[#1e1f22] dark:bg-white/10">
            <Image src={server.imageUrl} alt="" fill className="object-cover" />
          </div>
        </div>

        <div className="px-6 pb-6 pt-14 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
            {server.isPublic ? "Публичный сервер" : <><Lock className="h-3 w-3" /> Доступ по приглашению</>}
          </div>
          <h1 className="text-2xl font-black">{server.name}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {server.description || "Вас пригласили присоединиться к серверу Boltushka24."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-bold">
            <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-white/5">
              <Users className="mx-auto mb-1 h-5 w-5 text-indigo-500" />
              {server._count.members} участников
            </div>
            <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-white/5">
              <Hash className="mx-auto mb-1 h-5 w-5 text-indigo-500" />
              {server._count.channels} каналов
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {profile ? (
              <InviteJoinButton inviteCode={server.inviteCode} alreadyMember={alreadyMember} serverId={server.id} />
            ) : (
              <Button asChild variant="primary" className="w-full rounded-2xl">
                <Link href={signInUrl}>Войти и вступить</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Link href="/discover">Открыть каталог</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteCodePage;
