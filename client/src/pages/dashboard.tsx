import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser, canAccess } from "@/contexts/user-context";
import type { AssemblyCard, Assembler } from "@shared/schema";

interface DashboardMetrics {
  percentageCompleted: {
    mechanical: number;
    electrical: number;
    overall: number;
  };
  efficiency: {
    mechanical: number;
    electrical: number;
    overall: number;
  };
  scheduleRealization: {
    mechanical: number;
    electrical: number;
    overall: number;
  };
}

interface AndonIssue {
  id: string;
  cardId: string;
  cardNumber: string;
  issue: string;
  status: 'open' | 'in_progress' | 'resolved';
  timestamp: Date;
}

export default function Dashboard() {
  const { currentUser } = useUser();
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    percentageCompleted: { mechanical: 0, electrical: 0, overall: 0 },
    efficiency: { mechanical: 0, electrical: 0, overall: 0 },
    scheduleRealization: { mechanical: 0, electrical: 0, overall: 0 }
  });

  // Mock recent Andon issues - in a real app, this would come from the API
  const [recentAndonIssues] = useState<AndonIssue[]>([
    {
      id: '1',
      cardId: 'M3',
      cardNumber: 'M3',
      issue: 'Missing bolt size M8x25 for bracket assembly',
      status: 'open',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      cardId: 'E5',
      cardNumber: 'E5',
      issue: 'Wiring diagram discrepancy - connector pin layout',
      status: 'in_progress',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      id: '3',
      cardId: 'M1',
      cardNumber: 'M1',
      issue: 'Tool calibration required for torque wrench',
      status: 'resolved',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    }
  ]);

  // Calculate metrics when data changes
  useEffect(() => {
    if (assemblyCards.length === 0 || assemblers.length === 0) return;

    const calculateMetrics = () => {
      // Filter cards by type
      const mechanicalCards = assemblyCards.filter(card => card.type === 'M');
      const electricalCards = assemblyCards.filter(card => card.type === 'E');

      // Calculate percentage completed (Actual Hours / Expected Hours)
      const calculatePercentageCompleted = (cards: AssemblyCard[]) => {
        const totalExpectedHours = cards.reduce((sum, card) => sum + card.duration, 0);
        const totalActualHours = cards.reduce((sum, card) => {
          const actualDuration = card.actualDuration || 0;
          const elapsedTime = card.elapsedTime || 0;
          return sum + (actualDuration > 0 ? actualDuration : elapsedTime / 3600); // Convert seconds to hours
        }, 0);
        
        return totalExpectedHours > 0 ? (totalActualHours / totalExpectedHours) * 100 : 0;
      };

      // Calculate efficiency (Expected Time / Actual Time)
      const calculateEfficiency = (cards: AssemblyCard[]) => {
        const completedCards = cards.filter(card => card.status === 'completed' && card.actualDuration);
        if (completedCards.length === 0) return 0;

        const totalExpectedTime = completedCards.reduce((sum, card) => sum + card.duration, 0);
        const totalActualTime = completedCards.reduce((sum, card) => sum + (card.actualDuration || 0), 0);
        
        return totalActualTime > 0 ? (totalExpectedTime / totalActualTime) * 100 : 0;
      };

      // Calculate schedule realization (On-time completion rate)
      const calculateScheduleRealization = (cards: AssemblyCard[]) => {
        const completedCards = cards.filter(card => card.status === 'completed');
        if (completedCards.length === 0) return 0;

        const onTimeCards = completedCards.filter(card => {
          if (!card.endTime || !card.actualDuration) return false;
          const scheduledEndTime = new Date(card.endTime);
          const actualEndTime = new Date(card.startTime || Date.now());
          actualEndTime.setHours(actualEndTime.getHours() + (card.actualDuration || 0));
          
          return actualEndTime <= scheduledEndTime;
        });

        return (onTimeCards.length / completedCards.length) * 100;
      };

      const newMetrics: DashboardMetrics = {
        percentageCompleted: {
          mechanical: calculatePercentageCompleted(mechanicalCards),
          electrical: calculatePercentageCompleted(electricalCards),
          overall: calculatePercentageCompleted(assemblyCards)
        },
        efficiency: {
          mechanical: calculateEfficiency(mechanicalCards),
          electrical: calculateEfficiency(electricalCards),
          overall: calculateEfficiency(assemblyCards)
        },
        scheduleRealization: {
          mechanical: calculateScheduleRealization(mechanicalCards),
          electrical: calculateScheduleRealization(electricalCards),
          overall: calculateScheduleRealization(assemblyCards)
        }
      };

      setMetrics(newMetrics);
    };

    calculateMetrics();
  }, [assemblyCards, assemblers]);

  // Check permissions
  if (!currentUser || !canAccess(currentUser, 'dashboard')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view the dashboard.</p>
        </div>
      </div>
    );
  }

  if (cardsLoading || assemblersLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: AndonIssue['status']) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AndonIssue['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPercentage = (value: number) => {
    return isNaN(value) ? '0.0%' : `${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manufacturing Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </div>
      </div>

      {/* Percentage Completed */}
      <Card data-testid="card-percentage-completed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Percentage Completed
          </CardTitle>
          <CardDescription>
            Actual hours vs expected hours (shows progress on current work)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Mechanical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.percentageCompleted.mechanical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.percentageCompleted.mechanical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Electrical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.percentageCompleted.electrical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.percentageCompleted.electrical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Overall</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.percentageCompleted.overall)}
                </span>
              </div>
              <Progress value={Math.min(metrics.percentageCompleted.overall, 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency */}
      <Card data-testid="card-efficiency">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Efficiency
          </CardTitle>
          <CardDescription>
            Expected time vs actual time for completed work (higher is better)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Mechanical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.efficiency.mechanical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.efficiency.mechanical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Electrical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.efficiency.electrical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.efficiency.electrical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Overall</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.efficiency.overall)}
                </span>
              </div>
              <Progress value={Math.min(metrics.efficiency.overall, 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Realization */}
      <Card data-testid="card-schedule-realization">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Realization
          </CardTitle>
          <CardDescription>
            Percentage of assembly cards completed on time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Mechanical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.scheduleRealization.mechanical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.scheduleRealization.mechanical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Electrical Assembly</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.scheduleRealization.electrical)}
                </span>
              </div>
              <Progress value={Math.min(metrics.scheduleRealization.electrical, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Overall</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(metrics.scheduleRealization.overall)}
                </span>
              </div>
              <Progress value={Math.min(metrics.scheduleRealization.overall, 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Andon Issues */}
      <Card data-testid="card-andon-issues">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Andon Issues
          </CardTitle>
          <CardDescription>
            Three most recent issues reported on the shop floor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAndonIssues.map((issue, index) => (
              <div key={issue.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(issue.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {issue.cardNumber}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(issue.status)}`}>
                      {issue.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-900 mt-1">{issue.issue}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {issue.timestamp.toLocaleString('en-US', {
                      timeZone: 'America/Chicago',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}