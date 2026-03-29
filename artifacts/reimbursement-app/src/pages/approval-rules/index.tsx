import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useRules, useCreateRule, useDeleteRule } from "@/hooks/use-company";
import { useUsers } from "@/hooks/use-users";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Select, Badge } from "@/components/ui";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Shield, Trash2, ArrowRight } from "lucide-react";

const ruleSchema = z.object({
  name: z.string().min(1),
  conditionType: z.enum(["sequential", "percentage", "specific_approver", "hybrid"]),
  isDefault: z.boolean().default(false),
  percentageThreshold: z.coerce.number().optional().nullable(),
  specificApproverId: z.coerce.number().optional().nullable(),
  steps: z.array(z.object({
    stepNumber: z.number(),
    approverId: z.coerce.number(),
    isManagerStep: z.boolean().default(false),
  })).min(1),
});

export default function ApprovalRules() {
  const { data: rules, isLoading } = useRules();
  const { data: users } = useUsers();
  const createMutation = useCreateRule();
  const deleteMutation = useDeleteRule();
  const [isCreating, setIsCreating] = useState(false);

  const { register, control, handleSubmit, watch, reset } = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: { conditionType: "sequential", steps: [{ stepNumber: 1, approverId: 0, isManagerStep: false }] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "steps" });
  const conditionType = watch("conditionType");

  const onSubmit = async (data: any) => {
    await createMutation.mutateAsync(data);
    setIsCreating(false);
    reset();
  };

  const approverOptions = users?.filter(u => u.role !== 'employee').map(u => (
    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
  )) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Approval Workflows</h1>
            <p className="text-muted-foreground mt-1">Configure automated routing for expenses.</p>
          </div>
          <Button onClick={() => setIsCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Rule
          </Button>
        </div>

        {isCreating && (
          <Card className="border-primary/20 shadow-md ring-1 ring-primary/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Shield className="text-primary w-5 h-5"/> New Approval Rule</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input {...register("name")} placeholder="e.g. High Value Hardware" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition Type</Label>
                    <Select {...register("conditionType")}>
                      <option value="sequential">Sequential (Step 1 → Step 2)</option>
                      <option value="percentage">Percentage (e.g. Any 2 out of 3)</option>
                      <option value="specific_approver">Specific Approver Required</option>
                      <option value="hybrid">Hybrid</option>
                    </Select>
                  </div>
                </div>

                {(conditionType === "percentage" || conditionType === "hybrid") && (
                  <div className="space-y-2 w-1/2 pr-3">
                    <Label>Approval Threshold (%)</Label>
                    <Input type="number" min="1" max="100" {...register("percentageThreshold")} required />
                  </div>
                )}

                {(conditionType === "specific_approver" || conditionType === "hybrid") && (
                  <div className="space-y-2 w-1/2 pr-3">
                    <Label>Mandatory Approver</Label>
                    <Select {...register("specificApproverId")} required>
                      <option value="">Select an approver...</option>
                      {approverOptions}
                    </Select>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base">Approval Steps</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ stepNumber: fields.length + 1, approverId: 0, isManagerStep: false })}>
                      <Plus className="w-4 h-4 mr-1" /> Add Step
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <Select {...register(`steps.${index}.approverId`)} required className="bg-background">
                            <option value="">Select approver...</option>
                            {approverOptions}
                          </Select>
                          <input type="hidden" {...register(`steps.${index}.stepNumber`)} value={index + 1} />
                        </div>
                        {index > 0 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                  <Button type="submit" isLoading={createMutation.isPending}>Save Rule</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {rules?.map(rule => (
            <Card key={rule.id} className="border-border/50 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-stretch">
                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r bg-muted/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{rule.name}</h3>
                      <Badge variant="outline" className="mt-2 capitalize">{rule.conditionType.replace('_', ' ')}</Badge>
                      {rule.isDefault && <Badge variant="secondary" className="ml-2 mt-2">Default</Badge>}
                    </div>
                    {!rule.isDefault && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 -mt-2 -mr-2" onClick={() => deleteMutation.mutate(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {(rule.conditionType === 'percentage' || rule.conditionType === 'hybrid') && (
                    <p className="text-sm mt-4 text-muted-foreground"><strong className="text-foreground">Threshold:</strong> {rule.percentageThreshold}%</p>
                  )}
                  {(rule.conditionType === 'specific_approver' || rule.conditionType === 'hybrid') && (
                    <p className="text-sm mt-2 text-muted-foreground"><strong className="text-foreground">Mandatory:</strong> {rule.specificApproverName}</p>
                  )}
                </div>
                <div className="p-6 flex-1 flex items-center overflow-x-auto">
                  <div className="flex items-center gap-3">
                    {rule.steps.map((step, i) => (
                      <div key={step.id} className="flex items-center">
                        <div className="bg-card border shadow-sm rounded-lg p-3 w-40 text-center relative">
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border">Step {step.stepNumber}</div>
                          <p className="text-sm font-semibold truncate mt-1">{step.approverName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{step.approverRole}</p>
                        </div>
                        {i < rule.steps.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground mx-3 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {rules?.length === 0 && !isCreating && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
              No approval rules configured yet.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
