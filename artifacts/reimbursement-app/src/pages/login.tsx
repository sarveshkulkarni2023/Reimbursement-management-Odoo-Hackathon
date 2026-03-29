import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { motion } from "framer-motion";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError("");
      await login(data);
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-background">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-display font-bold text-2xl mb-4 shadow-lg shadow-primary/30">
              R
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Enter your credentials to access your account</p>
          </div>

          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive-foreground bg-destructive rounded-lg font-medium">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="name@company.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-xs text-primary font-medium hover:underline">Forgot password?</a>
                  </div>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoggingIn}>
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up your company
            </Link>
          </p>
        </motion.div>
      </div>
      
      {/* Right side - Image Cover */}
      <div className="hidden lg:block relative w-0 flex-1 bg-muted">
        <img 
          className="absolute inset-0 h-full w-full object-cover" 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract geometric background" 
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-4xl font-display font-bold mb-4">Streamline your expenses.</h2>
          <p className="text-lg opacity-90 text-white/90 max-w-lg">
            Reimbursify helps modern teams manage spend, automate approvals, and reimburse employees faster.
          </p>
        </div>
      </div>
    </div>
  );
}
