"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";

type CreateServerButtonProps = {
  label?: string;
  variant?: "primary" | "outline";
  className?: string;
  showIcon?: boolean;
};

export const CreateServerButton = ({
  label = "Создать сообщество",
  variant = "primary",
  className,
  showIcon = false,
}: CreateServerButtonProps) => {
  const { onOpen } = useModal();

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => onOpen("createServer")}
    >
      {showIcon ? <Plus className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );
};
