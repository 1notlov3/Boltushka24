"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown } from "lucide-react";

import { useModal } from "@/hooks/use-modal-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RatedUser {
  memberId: string;
  profileId: string;
  name: string;
  imageUrl: string;
  role: "ADMIN" | "MODERATOR" | "GUEST";
  totalMessages: number;
  totalDirectMessages: number;
  recentActivity: number;
  ratingScore: number;
  rank: number;
  lastActiveAt: string | null;
}

export const UserRatingModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "userRating";
  const serverId = data.server?.id;

  const [users, setUsers] = useState<RatedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModalOpen || !serverId) return;

    const fetchRatings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/ratings?serverId=${serverId}`);
        if (!response.ok) {
          throw new Error("Не удалось загрузить рейтинг");
        }

        const payload = await response.json();
        setUsers(payload.items ?? []);
      } catch (e) {
        console.error("[USER_RATING_MODAL]", e);
        setError("Не удалось загрузить рейтинг. Попробуй ещё раз.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [isModalOpen, serverId]);

  const hasUsers = useMemo(() => users.length > 0, [users.length]);

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            🏆 Рейтинг пользователей
          </DialogTitle>
          <p className="text-center text-xs text-zinc-500">
            Живые данные по активности: сообщения + личные сообщения + бонус за последние 30 дней
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] px-6">
          <div className="space-y-4 mb-4">
            {isLoading && (
              <div className="text-sm text-zinc-500 py-6 text-center">Загружаю рейтинг...</div>
            )}

            {!isLoading && error && (
              <div className="text-sm text-rose-500 py-6 text-center">{error}</div>
            )}

            {!isLoading && !error && !hasUsers && (
              <div className="text-sm text-zinc-500 py-6 text-center">
                Пока нет активности для построения рейтинга.
              </div>
            )}

            {!isLoading && !error && users.map((user, index) => (
              <div
                key={user.memberId}
                className={`flex items-center justify-between p-3 rounded-md ${
                  index === 0
                    ? "bg-amber-50 border-l-4 border-amber-400"
                    : index === 1
                    ? "bg-slate-50 border-l-4 border-slate-300"
                    : index === 2
                    ? "bg-orange-50 border-l-4 border-orange-400"
                    : "bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center w-8 shrink-0">
                    {index === 0 && <Crown className="h-5 w-5 text-amber-400 mb-1" />}
                    <span className="font-bold text-zinc-500 text-sm">{user.rank}</span>
                  </div>

                  <UserAvatar src={user.imageUrl} className="h-9 w-9" />

                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500">
                      Сообщения: {user.totalMessages} · ЛС: {user.totalDirectMessages} · 30д: {user.recentActivity}
                    </p>
                  </div>
                </div>

                <div className="text-right pl-3 shrink-0">
                  <p className="font-bold text-lg">{user.ratingScore}</p>
                  <p className="text-[10px] text-zinc-500">рейтинг</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
