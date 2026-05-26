"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { http } from "@/lib/http";

interface InviteJoinButtonProps {
  inviteCode: string;
  alreadyMember: boolean;
  serverId: string;
}

export const InviteJoinButton = ({ inviteCode, alreadyMember, serverId }: InviteJoinButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (alreadyMember) {
      router.push(`/servers/${serverId}`);
      return;
    }

    setLoading(true);
    try {
      const response = await http.post<{ serverId: string }>(`/api/invite/${inviteCode}/join`, {});
      router.push(`/servers/${response.data.serverId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="primary" className="w-full rounded-2xl" onClick={join} isLoading={loading} disabled={loading}>
      {alreadyMember ? "Открыть сервер" : "Вступить в сервер"}
    </Button>
  );
};
