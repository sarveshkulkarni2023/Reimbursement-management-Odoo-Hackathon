import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { 
  Expense, ExpenseDetail, ExpenseListResponse, 
  CreateExpenseRequest, UpdateExpenseRequest, ApprovalActionRequest,
  OcrRequest, OcrResponse
} from "@workspace/api-client-react/src/generated/api.schemas";

export function useExpenses(params?: { status?: string; page?: number; limit?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== "all") queryParams.append("status", params.status);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  
  const qs = queryParams.toString();
  const url = qs ? `/expenses?${qs}` : `/expenses`;

  return useQuery<ExpenseListResponse>({
    queryKey: ["expenses", params],
    queryFn: () => apiFetch<ExpenseListResponse>(url),
  });
}

export function useExpense(id: number) {
  return useQuery<ExpenseDetail>({
    queryKey: ["expenses", id],
    queryFn: () => apiFetch<ExpenseDetail>(`/expenses/${id}`),
    enabled: !!id,
  });
}

export function usePendingApprovals() {
  return useQuery<ExpenseDetail[]>({
    queryKey: ["expenses", "pending-approvals"],
    queryFn: () => apiFetch<ExpenseDetail[]>("/expenses/pending-approvals"),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => apiFetch<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      toast({ title: "Expense submitted", description: "Your expense has been submitted for approval." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit", description: err.message || "An error occurred", variant: "destructive" });
    },
  });
}

export function useUpdateExpense(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: UpdateExpenseRequest) => apiFetch<Expense>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", id] });
      toast({ title: "Expense updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useCancelExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      toast({ title: "Expense cancelled" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel", description: err.message, variant: "destructive" });
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalActionRequest }) => 
      apiFetch<ExpenseDetail>(`/expenses/${id}/approve`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      toast({ title: "Expense approved", description: "The expense has been approved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApprovalActionRequest }) => 
      apiFetch<ExpenseDetail>(`/expenses/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", id] });
      queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
      toast({ title: "Expense rejected", description: "The expense has been rejected." });
    },
    onError: (err: any) => {
      toast({ title: "Rejection failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useOcrReceipt() {
  return useMutation({
    mutationFn: (data: OcrRequest) => apiFetch<OcrResponse>("/expenses/ocr", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  });
}
