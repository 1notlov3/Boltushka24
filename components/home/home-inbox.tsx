import Image from "next/image";
import Link from "next/link";
import { Bell, Compass, Inbox, MessageCircle, Plus, Search, Server, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HomeInboxGroupAction } from "@/components/home/home-inbox-group-action";
import { HomeInboxData, HomeInboxItem } from "@/lib/home-inbox";
import { cn } from "@/lib/utils";

const formatTime = (value: string | null) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
};

const itemKindLabel = (kind: HomeInboxItem["kind"]) => kind === "conversation" ? "Личное" : "Канал";

const Avatar = ({ imageUrl, label }: { imageUrl: string | null; label: string }) => (
  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-200 text-lg font-black text-zinc-700 dark:bg-white/10 dark:text-white">
    {imageUrl ? (
      <Image src={imageUrl} alt="" fill className="object-cover" />
    ) : (
      <span>{label.trim().charAt(0).toUpperCase() || "?"}</span>
    )}
  </div>
);

const InboxRow = ({ item }: { item: HomeInboxItem }) => (
  <Link
    href={item.href}
    className="group flex gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg dark:border-white/10 dark:bg-[#1e1f22] dark:hover:bg-white/[0.06]"
  >
    <Avatar imageUrl={item.imageUrl} label={item.title} />
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-zinc-900 dark:text-white">{item.title}</p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-500 dark:bg-white/10 dark:text-zinc-300">
              {itemKindLabel(item.kind)}
            </span>
          </div>
          <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] text-zinc-400">{formatTime(item.lastActivityAt)}</span>
          {item.unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.preview}</p>
    </div>
  </Link>
);

const EmptyInbox = ({ hasServers }: { hasServers: boolean }) => (
  <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1e1f22]">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-500">
      <Inbox className="h-7 w-7" />
    </div>
    <h3 className="text-xl font-black">{hasServers ? "Всё прочитано" : "Добро пожаловать в Болтушку"}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
      {hasServers
        ? "Новых сообщений пока нет. Можно открыть поиск, создать канал или вернуться к активному серверу."
        : "Создайте первое пространство, пригласите людей и запустите общение, голос и совместные активности."}
    </p>
    <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
      <Button asChild variant="primary" className="rounded-2xl">
        <Link href={hasServers ? "/search" : "/setup"}>{hasServers ? "Открыть поиск" : "Создать сервер"}</Link>
      </Button>
      {hasServers && (
        <Button asChild variant="outline" className="rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
          <Link href="/setup">Command Center</Link>
        </Button>
      )}
    </div>
  </div>
);

export const HomeInbox = ({ data }: { data: HomeInboxData }) => {
  const unreadText = data.totals.unreadMessages > 0
    ? `${data.totals.unreadMessages} новых сообщений`
    : "Всё спокойно";

  return (
    <div className="min-h-full overflow-y-auto bg-[#f4f7fb] text-zinc-900 dark:bg-[#111214] dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-xl shadow-blue-950/10 dark:border-white/10 dark:bg-[#1e1f22]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Avatar imageUrl={data.profile.imageUrl} label={data.profile.name} />
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-300">
                  <Sparkles className="h-4 w-4" />
                  Home Inbox
                </div>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Привет, {data.profile.name}</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{unreadText}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">
              <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-white/5">
                <p className="text-2xl font-black">{data.totals.unreadMessages}</p>
                <p className="text-xs text-zinc-500">сообщений</p>
              </div>
              <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-white/5">
                <p className="text-2xl font-black">{data.totals.unreadNotifications}</p>
                <p className="text-xs text-zinc-500">уведомлений</p>
              </div>
              <div className="rounded-3xl bg-zinc-100 p-4 dark:bg-white/5">
                <p className="text-2xl font-black">{data.totals.servers}</p>
                <p className="text-xs text-zinc-500">серверов</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            <Button asChild variant="primary" className="shrink-0 rounded-2xl">
              <Link href="/search"><Search className="mr-2 h-4 w-4" /> Найти</Link>
            </Button>
            <Button asChild variant="outline" className="shrink-0 rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Link href="/setup"><Plus className="mr-2 h-4 w-4" /> Создать сервер</Link>
            </Button>
            <HomeInboxGroupAction servers={data.servers} />
            <Button asChild variant="outline" className="shrink-0 rounded-2xl dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Link href="/setup"><Compass className="mr-2 h-4 w-4" /> Command Center</Link>
            </Button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Входящие</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Личные диалоги и активные каналы в одном списке.</p>
              </div>
              <div className="hidden gap-2 text-xs font-bold text-zinc-500 sm:flex">
                <span className="rounded-full bg-white px-3 py-1 dark:bg-white/5">Все</span>
                <span className="rounded-full bg-white px-3 py-1 dark:bg-white/5">Личные</span>
                <span className="rounded-full bg-white px-3 py-1 dark:bg-white/5">Каналы</span>
              </div>
            </div>

            {data.items.length > 0 ? (
              <div className="space-y-3">
                {data.items.map((item) => <InboxRow key={`${item.kind}:${item.id}`} item={item} />)}
              </div>
            ) : (
              <EmptyInbox hasServers={data.servers.length > 0} />
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1f22]">
              <div className="mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-black">Серверы</h2>
              </div>
              <div className="space-y-3">
                {data.servers.length > 0 ? data.servers.map((server) => (
                  <Link key={server.id} href={server.href} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-zinc-100 dark:hover:bg-white/5">
                    <Avatar imageUrl={server.imageUrl} label={server.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{server.name}</p>
                      <p className="text-xs text-zinc-500">{server.membersCount} участников · {server.channelsCount} каналов</p>
                    </div>
                    {server.unreadCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-1 text-xs font-black text-white">{server.unreadCount}</span>
                    )}
                  </Link>
                )) : (
                  <p className="text-sm text-zinc-500">Серверов пока нет.</p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#1e1f22]">
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-black">Уведомления</h2>
              </div>
              <div className="space-y-3">
                {data.notifications.length > 0 ? data.notifications.map((notification) => {
                  const content = (
                    <div className={cn(
                      "rounded-2xl border p-3 transition",
                      notification.read
                        ? "border-zinc-100 bg-zinc-50 dark:border-white/5 dark:bg-white/[0.03]"
                        : "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10",
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold">{notification.title}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{notification.subtitle}</p>
                        </div>
                        <span className="text-[10px] text-zinc-400">{formatTime(notification.createdAt)}</span>
                      </div>
                    </div>
                  );

                  return notification.href ? (
                    <Link key={notification.id} href={notification.href}>{content}</Link>
                  ) : (
                    <div key={notification.id}>{content}</div>
                  );
                }) : (
                  <div className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                    Новых уведомлений нет.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-zinc-950 p-5 text-white dark:border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-black">Следующий уровень</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Дальше здесь появятся закреплённые чаты, быстрые group settings, активные voice rooms, quests и watch parties.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
