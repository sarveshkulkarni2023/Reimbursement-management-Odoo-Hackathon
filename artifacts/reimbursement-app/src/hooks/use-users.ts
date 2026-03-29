import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { User, CreateUserRequest, UpdateUserRequest } from "@workspace/api-client-react/src/generated/api.schemas";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => apiFetch<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Team member added", description: `${user.firstName} ${user.lastName} has been added to the team.` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add member", description: err.message || "Email may already be in use.", variant: "destructive" });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) => 
      apiFetch<User>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });
}
