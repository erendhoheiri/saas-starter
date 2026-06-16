import { useSession } from "@/lib/auth";

export function useMember() {
  const { data: session } = useSession();
  return {
    // biome-ignore lint/suspicious/noExplicitAny: intentional
    member: (session as any)?.user ?? null,
  };
}
