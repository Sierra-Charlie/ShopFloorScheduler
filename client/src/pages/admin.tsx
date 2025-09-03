import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Edit, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const createForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "assembler",
    },
  });

  const editForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema.partial()),
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "User Created",
        description: "New user has been successfully created.",
      });
    },
    onError: (error: any) => {
      console.error("Create user error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<InsertUser> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, userData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "User Updated",
        description: "User has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Update user error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      console.error("Delete user error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: Partial<InsertUser>) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, userData: data });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "", // Don't populate password for security
    });
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      production_supervisor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      scheduler: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      material_handler: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      assembler: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.assembler}`}>
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the manufacturing system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  {...createForm.register("name")}
                  data-testid="input-user-name"
                  placeholder="Full name"
                />
                {createForm.formState.errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {createForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  {...createForm.register("email")}
                  data-testid="input-user-email"
                  placeholder="user@vikingeng.com"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  {...createForm.register("password")}
                  data-testid="input-user-password"
                  placeholder="Minimum 6 characters"
                />
                {createForm.formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createForm.watch("role")}
                  onValueChange={(value) => createForm.setValue("role", value as any)}
                >
                  <SelectTrigger data-testid="select-user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="production_supervisor">Production Supervisor</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="material_handler">Material Handler</SelectItem>
                    <SelectItem value="assembler">Assembler</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {createForm.formState.errors.role.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  data-testid="button-confirm-create"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({Array.isArray(users) ? users.length : 0})</CardTitle>
          <CardDescription>
            Manage system users and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(users) && users.map((user: User) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                    {user.name}
                  </TableCell>
                  <TableCell data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell data-testid={`text-user-role-${user.id}`}>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell data-testid={`text-user-created-${user.id}`}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        data-testid={`button-delete-user-${user.id}`}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password empty to keep current password.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                  data-testid="input-edit-user-name"
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register("email")}
                  data-testid="input-edit-user-email"
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-password">Password (optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  {...editForm.register("password")}
                  data-testid="input-edit-user-password"
                  placeholder="Leave empty to keep current password"
                />
                {editForm.formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {editForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editForm.watch("role")}
                  onValueChange={(value) => editForm.setValue("role", value as any)}
                >
                  <SelectTrigger data-testid="select-edit-user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="production_supervisor">Production Supervisor</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="material_handler">Material Handler</SelectItem>
                    <SelectItem value="assembler">Assembler</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {editForm.formState.errors.role.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-confirm-edit"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}