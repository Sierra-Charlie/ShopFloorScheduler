import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Camera, User, Clock, CheckCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AndonIssue, User as UserType } from "@shared/schema";

interface AndonIssuesProps {
  userRole?: string;
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "unresolved":
      return "bg-red-100 text-red-800 border-red-200";
    case "being_worked_on":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "unresolved":
      return <AlertTriangle className="h-4 w-4" />;
    case "being_worked_on":
      return <Play className="h-4 w-4" />;
    case "resolved":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return null;
  }
};

const formatStatusLabel = (status: string) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function AndonIssues() {
  const userRole = "production_supervisor"; // Default role
  const [selectedIssue, setSelectedIssue] = useState<AndonIssue | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: andonIssues = [], isLoading } = useQuery({
    queryKey: ["/api/andon-issues"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; assignedTo?: string | null; status?: string }) => {
      const response = await fetch(`/api/andon-issues/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update issue");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/andon-issues"] });
      toast({
        title: "Issue Updated",
        description: "Andon issue has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update andon issue",
        variant: "destructive",
      });
    },
  });

  const handleAssignUser = (issueId: number, userId: string | null) => {
    updateIssueMutation.mutate({
      id: issueId,
      assignedTo: userId,
    });
  };

  const handleStatusChange = (issueId: number, status: string) => {
    updateIssueMutation.mutate({
      id: issueId,
      status,
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u: UserType) => u.id === userId);
    return user ? user.name : "Unknown User";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading andon issues...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Andon Issues</h1>
        <p className="text-muted-foreground">
          Track and manage production issues reported by assemblers
        </p>
      </div>

      {andonIssues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Issues Reported</h3>
            <p className="text-muted-foreground text-center">
              Great! There are currently no andon issues reported.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {andonIssues.map((issue: AndonIssue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-lg font-bold">
                        {issue.issueNumber}
                      </span>
                      <Badge className={cn("flex items-center space-x-1", getStatusBadgeColor(issue.status))}>
                        {getStatusIcon(issue.status)}
                        <span>{formatStatusLabel(issue.status)}</span>
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDateTime(issue.createdAt)}
                  </div>
                </div>
                <CardTitle className="text-base font-medium">
                  Assembly Card: {issue.assemblyCardNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                    {issue.description}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Submitted By:</p>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-1" />
                      {issue.submittedBy}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Assigned To:</p>
                    <Select
                      value={issue.assignedTo || "unassigned"}
                      onValueChange={(value) => handleAssignUser(issue.id, value === "unassigned" ? null : value)}
                      disabled={updateIssueMutation.isPending}
                    >
                      <SelectTrigger className="h-8" data-testid={`select-assigned-${issue.id}`}>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users
                          .filter((user: UserType) => user.role === "production_supervisor" || user.role === "admin")
                          .map((user: UserType) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Status:</p>
                    <Select
                      value={issue.status}
                      onValueChange={(value) => handleStatusChange(issue.id, value)}
                      disabled={updateIssueMutation.isPending}
                    >
                      <SelectTrigger className="h-8" data-testid={`select-status-${issue.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unresolved">Unresolved</SelectItem>
                        <SelectItem value="being_worked_on">Being Worked On</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {issue.photoPath && (
                  <div>
                    <p className="text-sm font-medium mb-2">Attached Photo:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedIssue(issue);
                        setShowPhotoDialog(true);
                      }}
                      data-testid={`button-view-photo-${issue.id}`}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      View Photo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Photo Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Photo for {selectedIssue?.issueNumber} - {selectedIssue?.assemblyCardNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue?.photoPath && (
            <div className="flex justify-center">
              <img
                src={selectedIssue.photoPath}
                alt={`Photo for issue ${selectedIssue.issueNumber}`}
                className="max-w-full max-h-96 object-contain rounded"
                data-testid="img-andon-photo"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}