import { useAuth as useClerkAuth } from "@clerk/nextjs";

export function useAuth() {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();
  return {
    isLoaded,
    isSignedIn,
    userId,
  };
}
