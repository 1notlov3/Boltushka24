import { redirect } from "next/navigation";
import { Bell, Compass, Gamepad2, MessageSquareText, Plus, Radio, ShieldCheck, Sparkles, Star, Video } from "lucide-react";

import { CreateServerButton } from "@/components/create-server-button";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

const productPillars = [
  {
    title: "Мессенджер",
    description: "Серверы, каналы, личные сообщения, реакции, треды и быстрый поиск.",
    icon: MessageSquareText,
  },
  {
    title: "Развлечения",
    description: "Watch rooms, будущие активности, достижения, стикеры и игровые события.",
    icon: Gamepad2,
  },
  {
    title: "Голос и видео",
    description: "LiveKit-комнаты, прямые звонки и база для stage-каналов и screen share.",
    icon: Video,
  },
  {
    title: "Безопасность",
    description: "Роли, permissions, slow mode, rate limits и audit trail для сообществ.",
    icon: ShieldCheck,
  },
];

const roadmap = [
  "Home Inbox со всеми диалогами, упоминаниями и активными комнатами",
  "Group DM и групповые звонки",
  "Custom emoji, sticker packs, achievements и weekly quests",
  "Watch Together 2.0: host/co-host, голосования, scheduled parties",
  "Discovery: публичные серверы, теги, invite landing и рекомендации",
];

const quickActions = [
  {
    title: "Создать сообщество",
    description: "Запусти свой сервер с каналами, голосом и watch rooms.",
    href: "create-server",
    icon: Plus,
  },
  {
    title: "Глобальный поиск",
    description: "Найди сообщения, людей, закрепы и важные обсуждения.",
    href: "/search",
    icon: Compass,
  },
];

type SetupServer = {
  id: string;
  name: string;
  imageUrl: string;
  _count: { members: number; channels: number };
};

const SetupPage = async () => {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/sign-in");
  }

  // Fetch dashboard data resiliently — if Prisma fails (DB down, schema mismatch,
  // missing DATABASE_URL), still render the page with empty state instead of
  // crashing into the global error boundary.
  let servers: SetupServer[] = [];
  let unreadNotifications = 0;
  let dataError: string | null = null;

  try {
    const [s, n] = await Promise.all([
      db.server.findMany({
        where: { members: { some: { profileId: profile.id } } },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          _count: { select: { members: true, channels: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      db.notification.count({
        where: { targetId: profile.id, read: false },
      }),
    ]);
    servers = s;
    unreadNotifications = n;
  } catch (error) {
    console.error("[SETUP_PAGE] Failed to load dashboard data", error);
    dataError = error instanceof Error ? error.message : "Не удалось загрузить данные";
  }

  const primaryServer = servers[0];

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#f4f7fb] pb-[max(env(safe-area-inset-bottom),1rem)] text-zinc-900 dark:bg-[#111214] dark:text-zinc-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {dataError ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">Часть данных временно недоступна</p>
            <p className="mt-1 break-words text-xs opacity-80">{dataError}</p>
          </div>
        ) : null}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-blue-950/10 dark:border-white/10 dark:bg-[#1e1f22] md:p-10">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                <Sparkles className="h-4 w-4" />
                Boltushka24 Command Center
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Общение, голос и развлечения в одном живом пространстве.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
                  Это новая главная зона продукта: быстрый вход в серверы, обзор активности и направление развития к приложению, которое совмещает мессенджер, community hub и развлекательную платформу.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="primary" className="h-12 rounded-2xl px-6 text-base">
                  <a href="/home">Открыть Home Inbox</a>
                </Button>
                {primaryServer ? (
                  <Button asChild variant="outline" className="h-12 rounded-2xl px-6 text-base dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <a href={`/servers/${primaryServer.id}`}>Продолжить общение</a>
                  </Button>
                ) : (
                  <CreateServerButton
                    variant="outline"
                    label="Создать первый сервер"
                    className="h-12 rounded-2xl px-6 text-base dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                )}
                <Button asChild variant="outline" className="h-12 rounded-2xl px-6 text-base dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <a href="/search">Открыть поиск</a>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-950 p-5 text-white shadow-2xl dark:border-white/10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Сегодня</p>
                  <h2 className="text-2xl font-bold">Пульс пространства</h2>
                </div>
                <Radio className="h-6 w-6 text-emerald-400" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-3xl font-black">{servers.length}</p>
                  <p className="text-xs text-zinc-400">серверов</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-3xl font-black">{unreadNotifications}</p>
                  <p className="text-xs text-zinc-400">уведомлений</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-3xl font-black">24</p>
                  <p className="text-xs text-zinc-400">часа связи</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {servers.length > 0 ? servers.slice(0, 3).map((server) => (
                  <a
                    key={server.id}
                    href={`/servers/${server.id}`}
                    className="flex items-center justify-between rounded-2xl bg-white/5 p-3 transition hover:bg-white/10"
                  >
                    <div>
                      <p className="font-semibold">{server.name}</p>
                      <p className="text-xs text-zinc-400">
                        {server._count.members} участников · {server._count.channels} каналов
                      </p>
                    </div>
                    <Star className="h-4 w-4 text-yellow-300" />
                  </a>
                )) : (
                  <div className="rounded-2xl bg-white/5 p-4 text-sm text-zinc-300">
                    Создай первое сообщество, чтобы открыть каналы, голос и совместные активности.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {productPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1e1f22]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{pillar.description}</p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#1e1f22]">
            <div className="mb-5 flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-black">Быстрые действия</h2>
            </div>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                if (action.href === "create-server") {
                  return (
                    <CreateServerButton
                      key={action.title}
                      variant="outline"
                      label={action.title}
                      showIcon
                      className="h-auto w-full justify-start rounded-2xl border-zinc-100 p-4 text-left text-zinc-900 hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-transparent dark:text-zinc-100 dark:hover:bg-white/5"
                    />
                  );
                }

                return (
                  <a key={action.title} href={action.href} className="flex gap-4 rounded-2xl border border-zinc-100 p-4 transition hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:hover:bg-white/5">
                    <Icon className="mt-1 h-5 w-5 text-blue-500" />
                    <span>
                      <span className="block font-bold">{action.title}</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">{action.description}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#1e1f22]">
            <div className="mb-5 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <h2 className="text-xl font-black">Путь к финальному продукту</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {roadmap.map((item, index) => (
                <div key={item} className="rounded-2xl bg-zinc-100 p-4 dark:bg-white/5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Этап {index + 1}
                  </p>
                  <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SetupPage;
