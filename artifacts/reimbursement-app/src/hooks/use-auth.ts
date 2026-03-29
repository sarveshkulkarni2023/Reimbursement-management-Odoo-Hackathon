import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { LoginRequest, SignupRequest, AuthResponse, UserWithCompany } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("reimb_token");

  const { data: user, isLoading, error } = useQuery<UserWithCompany>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<UserWithCompany>("/auth/me"),
    enabled: !!token,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (data) => {
      localStorage.setItem("reimb_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      setLocation("/");
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: SignupRequest) => apiFetch<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (data) => {
      localStorage.setItem("reimb_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
      setLocation("/");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    onSettled: () => {
      localStorage.removeItem("reimb_token");
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user,
    isLoading: isLoading && !!token,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutateAsync,
    isSigningUp: signupMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
