import { useSession } from "@/lib/auth";

export function useMember() {
  const { data: session } = useSession();
  return {
    member: (session as any)?.user ?? null,
  };
}
