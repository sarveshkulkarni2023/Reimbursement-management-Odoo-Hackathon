import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { 
  Company, UpdateCompanyRequest, Currency, DashboardStats,
  ApprovalRule, CreateApprovalRuleRequest
} from "@workspace/api-client-react/src/generated/api.schemas";

export function useCompany() {
  return useQuery<Company>({
    queryKey: ["company"],
    queryFn: () => apiFetch<Company>("/company"),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: UpdateCompanyRequest) => apiFetch<Company>("/company", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "Settings saved", description: "Company settings have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: () => apiFetch<Currency[]>("/currency/list"),
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/analytics/dashboard"),
  });
}

export function useRules() {
  return useQuery<ApprovalRule[]>({
    queryKey: ["approval-rules"],
    queryFn: () => apiFetch<ApprovalRule[]>("/approval-rules"),
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateApprovalRuleRequest) => apiFetch<ApprovalRule>("/approval-rules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast({ title: "Approval rule created", description: `"${rule.name}" is now active.` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create rule", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateApprovalRuleRequest }) => 
      apiFetch<ApprovalRule>(`/approval-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast({ title: "Approval rule updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/approval-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-rules"] });
      toast({ title: "Approval rule deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useLoadDemoData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => apiFetch("/seed/demo", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries();
      toast({
        title: "Demo data loaded!",
        description: `Created ${data.created.managers} managers, ${data.created.employees} employees, and ${data.created.expenses} expenses.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to load demo data", description: err.message, variant: "destructive" });
    },
  });
}
