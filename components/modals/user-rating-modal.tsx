"use client";

import { useModal } from "@/hooks/use-modal-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  rating: number;
}

export const UserRatingModal = () => {
  const { isOpen, onClose, type } = useModal();
  
  // Статичные данные пользователей
  const [users] = useState<User[]>([
    {
      id: "1",
      name: "John",
      rating: 1.12
    },
    {
      id: "2",
      name: "max",
      rating: 0.71
    },
    {
      id: "3",
      name: "alex",
      rating: 0.40
    }
  ]);

  const isModalOpen = isOpen && type === "userRating";

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            🏆 Рейтинг пользователей
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[500px] px-6">
          <div className="space-y-4 mb-4">
            {users.map((user, index) => (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-3 rounded-md ${
                  index === 0 ? "bg-amber-50 border-l-4 border-amber-400" :
                  index === 1 ? "bg-slate-50 border-l-4 border-slate-300" :
                  index === 2 ? "bg-amber-40 border-l-4 border-amber-600" : "bg-zinc-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center w-8">
                      {index === 0 && (
                        <Crown className="h-5 w-5 text-amber-400 mb-1" />
                      )}
                      <span className="font-bold text-zinc-500 text-sm">
                        {index + 1}
                      </span>
                    </div>
                    
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user.name}</p>
                    <p className="text-sm text-zinc-500">
                      Рейтинг пользователя: {user.rating}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
