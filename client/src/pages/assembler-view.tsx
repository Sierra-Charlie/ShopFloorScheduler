import { useState } from "react";
import { useAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser, canAccess } from "@/contexts/user-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Play, CheckCircle } from "lucide-react";
import AssemblyDetailView from "@/components/assembly-detail-view";
import AssemblyCardModal from "@/components/assembly-card-modal";
import type { AssemblyCard } from "@shared/schema";

export default function AssemblerView() {
  const { currentUser } = useUser();
  const { data: assemblyCards = [] } = useAssemblyCards();
  const { data: assemblers = [] } = useAssemblers();
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCard, setEditCard] = useState<AssemblyCard | null>(null);

  // Check if user has permission to access this view
  if (!currentUser || !canAccess(currentUser, 'assembler_view')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the Assembler View.</p>
        </div>
      </div>
    );
  }

  // Get cards assigned to current assembler or show all if admin/supervisor
  const currentAssembler = assemblers.find(a => a.name.toLowerCase().includes(currentUser.name.toLowerCase()));
  const relevantCards = currentUser.role === 'assembler' && currentAssembler
    ? assemblyCards.filter(card => card.assignedTo === currentAssembler.id)
    : assemblyCards;

  const activeCards = relevantCards.filter(card => 
    card.status === 'in_progress' || card.status === 'ready_for_build'
  );
  
  const upcomingCards = relevantCards.filter(card => 
    card.status === 'scheduled'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'ready_for_build': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress': return { variant: 'default' as const, label: 'In Progress' };
      case 'completed': return { variant: 'default' as const, label: 'Completed' };
      case 'ready_for_build': return { variant: 'secondary' as const, label: 'Ready for Build' };
      case 'scheduled': return { variant: 'outline' as const, label: 'Scheduled' };
      case 'blocked': return { variant: 'destructive' as const, label: 'Blocked' };
      default: return { variant: 'outline' as const, label: status };
    }
  };

  const handleCardEdit = (card: AssemblyCard) => {
    setEditCard(card);
    setIsModalOpen(true);
    setSelectedCard(null); // Close detail view
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditCard(null);
  };

  if (selectedCard) {
    return (
      <>
        <AssemblyDetailView
          card={selectedCard}
          isOpen={true}
          onClose={() => setSelectedCard(null)}
          onEdit={handleCardEdit}
        />
        {editCard && (
          <AssemblyCardModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            card={editCard}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assembler Workstation</h1>
          <p className="text-muted-foreground">
            {currentUser.role === 'assembler' && currentAssembler
              ? `Workstation: ${currentAssembler.name} (${currentAssembler.type})`
              : `Viewing all assembly cards (${currentUser.name})`
            }
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Work */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Play className="h-5 w-5 mr-2 text-primary" />
            Active Work ({activeCards.length})
          </h2>
          
          {activeCards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No active assembly cards
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeCards.map((card) => {
                const statusBadge = getStatusBadge(card.status);
                return (
                  <Card 
                    key={card.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCard(card)}
                    data-testid={`card-active-${card.cardNumber}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                          {card.cardNumber} - {card.name}
                        </CardTitle>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Phase {card.phase} • {card.duration} hours</span>
                        <div className="flex items-center">
                          {getStatusIcon(card.status)}
                          <span className="ml-1">{card.type}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Work */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            Upcoming Work ({upcomingCards.length})
          </h2>
          
          {upcomingCards.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No upcoming assembly cards
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingCards.map((card) => {
                const statusBadge = getStatusBadge(card.status);
                return (
                  <Card 
                    key={card.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer opacity-75"
                    onClick={() => setSelectedCard(card)}
                    data-testid={`card-upcoming-${card.cardNumber}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                          {card.cardNumber} - {card.name}
                        </CardTitle>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Phase {card.phase} • {card.duration} hours</span>
                        <div className="flex items-center">
                          {getStatusIcon(card.status)}
                          <span className="ml-1">{card.type}</span>
                        </div>
                      </div>
                      {card.dependencies && card.dependencies.length > 0 && (
                        <div className="mt-2 text-xs text-warning">
                          Waiting for: {card.dependencies.join(", ")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}