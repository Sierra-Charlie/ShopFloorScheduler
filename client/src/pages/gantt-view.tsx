import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Table, Save, Package } from "lucide-react";
import { Link } from "wouter";
import { useAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser } from "@/contexts/user-context";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import AssemblyDetailView from "@/components/assembly-detail-view";
import DependencyLegend from "@/components/dependency-legend";
import { AssemblyCard } from "@shared/schema";

export default function GanttView() {
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailCard, setSelectedDetailCard] = useState<AssemblyCard | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { startDate, setStartDate, startTime, setStartTime } = useUser();
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Utility function to get current time in Central Time Zone
  const getCurrentCentralTime = () => {
    return new Date(currentTime.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  };
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();

  const handleCardEdit = (card: AssemblyCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCardView = (card: AssemblyCard) => {
    setSelectedDetailCard(card);
    setIsDetailViewOpen(true);
  };

  if (cardsLoading || assemblersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gantt Chart View</h1>
            <p className="text-muted-foreground">
              Table view of all assembly cards with detailed information
            </p>
            <div className="text-sm text-muted-foreground mt-2">
              Current Time: {getCurrentCentralTime().toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Assembly Build Start Date:
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                data-testid="input-start-date"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="start-time" className="text-sm font-medium">
                Start Time:
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-24"
                data-testid="input-start-time"
              />
            </div>
            <Button onClick={() => setIsModalOpen(true)} data-testid="button-add-card">
              <Package className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>

        <DependencyLegend />

        <div className="bg-card rounded-lg border">
          <GanttTable
            assemblyCards={assemblyCards}
            assemblers={assemblers}
            onCardEdit={handleCardEdit}
            onCardView={handleCardView}
          />
        </div>
      </div>

      <AssemblyCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        assemblers={assemblers}
      />

      <AssemblyDetailView
        card={selectedDetailCard}
        isOpen={isDetailViewOpen}
        onClose={() => {
          setIsDetailViewOpen(false);
          setSelectedDetailCard(null);
        }}
      />
    </div>
  );
}