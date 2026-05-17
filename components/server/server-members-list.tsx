"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { ServerMember } from "@/components/server/server-member";
import { getServerMembersPage } from "@/lib/server-member-actions";
import type { ServerMemberWithProfile } from "@/types";

interface ServerMembersListProps {
  serverId: string;
  initialMembers: ServerMemberWithProfile[];
  totalMembers: number;
}

export const ServerMembersList = ({
  serverId,
  initialMembers,
  totalMembers,
}: ServerMembersListProps) => {
  const [members, setMembers] = useState(initialMembers);
  const [nextCursor, setNextCursor] = useState(initialMembers.at(-1)?.id ?? null);
  const [hasMore, setHasMore] = useState(initialMembers.length < totalMembers);
  const [isPending, startTransition] = useTransition();
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMembers(initialMembers);
    setNextCursor(initialMembers.at(-1)?.id ?? null);
    setHasMore(initialMembers.length < totalMembers);
  }, [initialMembers, totalMembers]);

  useEffect(() => {
    if (!hasMore || members.length >= totalMembers || isPending) return;

    startTransition(() => {
      void getServerMembersPage(serverId, nextCursor ?? undefined).then((page) => {
        setMembers((current) => {
          const seen = new Set(current.map((member) => member.id));
          const incoming = page.items.filter((member) => !seen.has(member.id));
          return [...current, ...incoming];
        });
        setNextCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      });
    });
  }, [hasMore, isPending, members.length, nextCursor, serverId, totalMembers]);

  const shouldVirtualize = totalMembers > 80;
  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 8,
    getItemKey: (index) => members[index]?.id ?? index,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const content = useMemo(() => {
    if (!shouldVirtualize) {
      return members.map((member) => (
        <ServerMember
          key={member.id}
          member={member}
        />
      ));
    }

    return (
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const member = members[virtualItem.index];
          if (!member) return null;

          return (
            <div
              key={virtualItem.key}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <ServerMember member={member} />
            </div>
          );
        })}
      </div>
    );
  }, [members, rowVirtualizer, shouldVirtualize, virtualItems]);

  if (!shouldVirtualize) {
    return (
      <div className="space-y-[2px]">
        {content}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[45dvh] overflow-y-auto pr-1"
    >
      {content}
    </div>
  );
};
