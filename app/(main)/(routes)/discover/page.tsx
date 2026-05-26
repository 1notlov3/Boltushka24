import Link from "next/link";
import Image from "next/image";
import { Compass, Search, Users, Hash } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { publicServerHref } from "@/lib/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

interface DiscoverPageProps {
  searchParams: Promise<{ q?: string }>;
}

const DiscoverPage = async ({ searchParams }: DiscoverPageProps) => {
  const profile = await currentProfile();
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams.q ?? "").trim().slice(0, 80);

  const servers = await db.server.findMany({
    where: {
      isPublic: true,
      ...(query
        ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      inviteCode: true,
      description: true,
      members: profile ? {
        where: { profileId: profile.id },
        select: { id: true },
      } : false,
      _count: {
        select: {
          members: true,
          channels: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#f4f7fb] pb-[max(env(safe-area-inset-bottom),1rem)] text-zinc-900 dark:bg-[#111214] dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-xl shadow-blue-950/10 dark:border-white/10 dark:bg-[#1e1f22]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-500">
              <Compass className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-indigo-500">Discovery</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Каталог публичных серверов</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
                Найди открытые сообщества, посмотри описание и вступи только после явного подтверждения.
              </p>
            </div>
          </div>

          <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/discover">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Поиск по названию или описанию"
                className="rounded-2xl bg-zinc-100 pl-9 dark:bg-zinc-900"
              />
            </div>
            <Button variant="primary" className="rounded-2xl">Искать</Button>
          </form>
        </section>

        {servers.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1e1f22]">
            <Compass className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <h2 className="text-xl font-black">Публичных серверов пока нет</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
              Владельцы могут включить публикацию в настройках сервера. Новые серверы остаются приватными по умолчанию.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servers.map((server) => {
              const isMember = Array.isArray(server.members) && server.members.length > 0;
              const href = isMember ? `/servers/${server.id}` : publicServerHref(server.inviteCode);

              return (
                <Link
                  key={server.id}
                  href={href}
                  className="group flex min-h-60 flex-col rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-white/10 dark:bg-[#1e1f22]"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl bg-zinc-200 dark:bg-white/10">
                      <Image src={server.imageUrl} alt="" fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-black group-hover:text-indigo-500">{server.name}</h2>
                      <p className="mt-1 line-clamp-3 text-sm text-zinc-500 dark:text-zinc-400">
                        {server.description || "Публичное сообщество Boltushka24."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-5 text-xs font-bold text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {server._count.members}</span>
                    <span className="inline-flex items-center gap-1"><Hash className="h-4 w-4" /> {server._count.channels}</span>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-500">
                      {isMember ? "Открыть" : "Посмотреть"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
