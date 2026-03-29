import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { Button, Card, Input, Label, Select, Badge } from "@/components/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCog, MoreVertical } from "lucide-react";

const userSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["manager", "employee"]),
  managerId: z.coerce.number().optional().nullable(),
  isManagerApprover: z.boolean().default(false),
});

export default function UsersList() {
  const { data: users, isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "employee" }
  });

  const onSubmit = async (data: any) => {
    await createMutation.mutateAsync({
      ...data,
      managerId: data.managerId || null
    });
    setIsCreateOpen(false);
    reset();
  };

  const toggleStatus = (user: any) => {
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage users and assign roles.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Member
          </Button>
        </div>

        <Card className="border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users?.map(user => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {user.firstName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'} className="capitalize">
                      {user.role}
                    </Badge>
                    {user.isManagerApprover && <Badge variant="outline" className="ml-2 text-[10px]">Approver</Badge>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {user.managerName || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.isActive ? 'success' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(user)}>
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center bg-muted/20">
                <h3 className="font-bold text-lg">Add New Member</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input {...register("firstName")} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input {...register("lastName")} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" {...register("email")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <Input type="password" {...register("password")} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select {...register("role")}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reports To (Manager)</Label>
                    <Select {...register("managerId")}>
                      <option value="">None</option>
                      {users?.filter(u => u.role === 'manager' || u.role === 'admin').map(m => (
                        <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex gap-3 justify-end pt-4 mt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" isLoading={createMutation.isPending}>Add Member</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
