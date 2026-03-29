import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies } from "@/hooks/use-company";
import { Link } from "wouter";
import { Button, Input, Label, Card, CardContent, Select } from "@/components/ui";
import { motion } from "framer-motion";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyName: z.string().min(1, "Company name is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const { signup, isSigningUp } = useAuth();
  const { data: currencies } = useCurrencies();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country: "United States", currency: "USD" }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError("");
      await signup(data);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-xl"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-display font-bold text-2xl mb-4 shadow-lg">
            R
          </div>
          <h2 className="mt-2 text-3xl font-display font-bold tracking-tight text-foreground">
            Create your workspace
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with Reimbursify for your company
          </p>
        </div>

        <Card className="shadow-xl shadow-black/5 border-border/50">
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive-foreground bg-destructive rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input {...register("firstName")} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input {...register("lastName")} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work email</Label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-4">Company Details</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input {...register("companyName")} />
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input {...register("country")} placeholder="e.g. United States" />
                      {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Default Currency</Label>
                      <Select {...register("currency")}>
                        {currencies?.map(c => (
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        )) || <option value="USD">USD ($)</option>}
                      </Select>
                      {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isSigningUp}>
                Create workspace
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
