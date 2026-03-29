import { useState, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies, useRules } from "@/hooks/use-company";
import { useCreateExpense, useOcrReceipt } from "@/hooks/use-expenses";
import { Button, Input, Label, Card, CardContent, Select, Textarea } from "@/components/ui";
import { Camera, Upload, Loader2, Sparkles } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().min(1),
  category: z.enum(["travel", "meals", "accommodation", "office_supplies", "software", "training", "medical", "entertainment", "utilities", "other"]),
  expenseDate: z.string().min(1, "Date is required"),
  approvalRuleId: z.coerce.number().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: currencies } = useCurrencies();
  const { data: rules } = useRules();
  const createMutation = useCreateExpense();
  const ocrMutation = useOcrReceipt();
  
  const [ocrScanning, setOcrScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: user?.company.currency || "USD",
      expenseDate: new Date().toISOString().split('T')[0],
      category: "other"
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        approvalRuleId: data.approvalRuleId || null
      });
      setLocation("/expenses");
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const result = await ocrMutation.mutateAsync({ imageBase64: base64 });
        if (result.amount) setValue("amount", result.amount);
        if (result.title) setValue("title", result.title);
        if (result.date) setValue("expenseDate", result.date);
        if (result.category) setValue("category", result.category as any);
        if (result.currency) setValue("currency", result.currency);
        // Simulate a saved URL
        setValue("receiptUrl", "https://example.com/mock-receipt.jpg");
      } catch (error) {
        console.error("OCR failed", error);
      } finally {
        setOcrScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold tracking-tight">Submit Expense</h1>
          <p className="text-muted-foreground mt-1">Upload a receipt or fill in the details manually.</p>
        </div>

        <Card className="border-border/50 shadow-sm mb-8 bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" /> Smart Scan
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Upload a receipt and we'll auto-fill the fields for you using AI.</p>
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={ocrScanning}
                className="shrink-0 gap-2"
                variant="secondary"
              >
                {ocrScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {ocrScanning ? "Scanning..." : "Upload Receipt"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {createMutation.error && (
                <div className="p-3 text-sm text-destructive-foreground bg-destructive rounded-lg">
                  {createMutation.error.message}
                </div>
              )}

              <div className="space-y-2">
                <Label>Merchant / Title</Label>
                <Input placeholder="e.g. Uber, Delta Airlines, Starbucks" {...register("title")} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <Input type="number" step="0.01" className="pl-8" placeholder="0.00" {...register("amount")} />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  </div>
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select {...register("currency")}>
                    {currencies?.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </Select>
                  {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" {...register("expenseDate")} />
                  {errors.expenseDate && <p className="text-xs text-destructive">{errors.expenseDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select {...register("category")}>
                    <option value="travel">Travel</option>
                    <option value="meals">Meals</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="software">Software</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="training">Training</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                  </Select>
                  {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea placeholder="Add any business justification or notes..." {...register("description")} />
              </div>

              {user?.role === "admin" && rules && rules.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Override Approval Workflow</Label>
                  <Select {...register("approvalRuleId")}>
                    <option value="">Default Workflow</option>
                    {rules.map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/expenses")}>Cancel</Button>
                <Button type="submit" isLoading={createMutation.isPending}>Submit Expense</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
