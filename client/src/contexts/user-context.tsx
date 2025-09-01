import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@shared/schema';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  startDate: string;
  setStartDate: (date: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState("2025-09-08");
  const [startTime, setStartTime] = useState("08:00");

  useEffect(() => {
    // For demo purposes, we'll simulate loading the first user as default
    // In a real app, this would check authentication state
    const loadDefaultUser = async () => {
      try {
        const response = await fetch('/api/users');
        const users = await response.json();
        if (users.length > 0) {
          // Default to production supervisor role for demo
          const defaultUser = users.find((u: User) => u.role === 'production_supervisor') || users[0];
          setCurrentUser(defaultUser);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaultUser();
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoading, startDate, setStartDate, startTime, setStartTime }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function hasRole(user: User | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function canAccess(user: User | null, feature: string): boolean {
  if (!user) return false;
  
  // Define role permissions
  const permissions: Record<string, string[]> = {
    // Admin can access everything
    admin: ['dashboard', 'schedule_view', 'gantt_view', 'material_handler_view', 'assembler_view', 'edit_cards', 'create_cards', 'delete_cards', 'andon_alerts', 'andon_issues_view'],
    
    // Production Supervisor can manage scheduling and view all data
    production_supervisor: ['dashboard', 'schedule_view', 'gantt_view', 'material_handler_view', 'edit_cards', 'create_cards', 'andon_alerts', 'andon_issues_view'],
    
    // Scheduler can manage schedules and view data
    scheduler: ['dashboard', 'schedule_view', 'gantt_view', 'edit_cards', 'create_cards'],
    
    // Material Handler manages card workflow and phases
    material_handler: ['material_handler_view', 'edit_cards'],
    
    // Assembler can view their assignments and report issues
    assembler: ['assembler_view', 'andon_alerts'],
  };

  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(feature);
}