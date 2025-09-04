import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { useUsers } from "@/hooks/use-users";

export default function UserRoleSelector() {
  const { currentUser, setCurrentUser, isLoading } = useUser();
  const { data: users = [] } = useUsers();

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'production_supervisor': return 'Production Supervisor';
      case 'material_handler': return 'Material Handler';
      case 'assembler': return 'Assembler';
      case 'scheduler': return 'Scheduler';
      case 'admin': return 'Admin';
      case 'engineer': return 'Engineer';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'production_supervisor': return 'default';
      case 'scheduler': return 'secondary';
      case 'material_handler': return 'outline';
      case 'assembler': return 'secondary';
      case 'engineer': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">{currentUser.name}</span>
        <Badge variant={getRoleBadgeVariant(currentUser.role)} data-testid="badge-current-role">
          {getRoleDisplayName(currentUser.role)}
        </Badge>
      </div>
      
      <Select
        value={currentUser.id}
        onValueChange={(userId) => {
          const selectedUser = users.find(u => u.id === userId);
          if (selectedUser) {
            setCurrentUser(selectedUser);
          }
        }}
      >
        <SelectTrigger className="w-48" data-testid="select-user-role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map(user => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center space-x-2">
                <span>{user.name}</span>
                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                  {getRoleDisplayName(user.role)}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}