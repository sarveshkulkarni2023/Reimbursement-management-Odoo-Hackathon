import { Layout } from "@/components/layout/Layout";
import { useCompany, useUpdateCompany, useCurrencies } from "@/hooks/use-company";
import { Card, CardHeader, CardTitle, CardContent, Input, Label, Select, Button } from "@/components/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

const schema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  currency: z.string().min(1),
});

export default function Settings() {
  const { data: company, isLoading } = useCompany();
  const { data: currencies } = useCurrencies();
  const updateMutation = useUpdateCompany();

  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        country: company.country,
        currency: company.currency,
      });
    }
  }, [company, reset]);

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  if (isLoading) return <Layout><div className="animate-pulse h-64 bg-muted rounded-xl"></div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Company Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your workspace preferences.</p>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input {...register("name")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input {...register("country")} />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select {...register("currency")}>
                    {currencies?.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                  </Select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
