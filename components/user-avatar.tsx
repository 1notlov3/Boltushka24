import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string;
  className?: string;
  name?: string;
}

export const UserAvatar = ({
  src,
  className,
  name
}: UserAvatarProps) => {
  const initials = name
    ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : "";

  return (
    <Avatar className={cn(
      "h-7 w-7 md:h-10 md:w-10",
      className
    )}>
      <AvatarImage src={src} alt={name || "User Avatar"} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
