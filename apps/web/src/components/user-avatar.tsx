import { Avatar, AvatarFallback, AvatarImage, cn } from "@starter/ui";
import { getInitials } from "@/lib/format";

/** Avatar with image + initials fallback, driven by the app user shape. */
export function UserAvatar({
  name,
  image,
  className,
  fallback = "U",
}: {
  name: string | null | undefined;
  image?: string | null;
  className?: string;
  fallback?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {image ? <AvatarImage src={image} alt={name ?? ""} /> : null}
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials(name, fallback)}
      </AvatarFallback>
    </Avatar>
  );
}
