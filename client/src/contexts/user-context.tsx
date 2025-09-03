import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@shared/schema';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
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
    // Check for existing authentication on app load
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to load saved user:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isAuthenticated = currentUser !== null;

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      setCurrentUser, 
      isLoading, 
      isAuthenticated,
      login,
      logout,
      startDate, 
      setStartDate, 
      startTime, 
      setStartTime 
    }}>
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
    admin: ['dashboard', 'schedule_view', 'gantt_view', 'planning_view', 'material_handler_view', 'assembler_view', 'edit_cards', 'create_cards', 'delete_cards', 'andon_alerts', 'andon_issues_view', 'messages_view', 'admin'],
    
    // Production Supervisor can manage scheduling and view all data
    production_supervisor: ['dashboard', 'schedule_view', 'gantt_view', 'planning_view', 'material_handler_view', 'edit_cards', 'create_cards', 'andon_alerts', 'andon_issues_view', 'messages_view'],
    
    // Scheduler can manage schedules and view data
    scheduler: ['dashboard', 'schedule_view', 'gantt_view', 'planning_view', 'edit_cards', 'create_cards', 'messages_view'],
    
    // Material Handler manages card workflow and phases
    material_handler: ['material_handler_view', 'edit_cards', 'messages_view'],
    
    // Assembler can view their assignments and report issues
    assembler: ['assembler_view', 'andon_alerts', 'messages_view'],
  };

  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(feature);
}