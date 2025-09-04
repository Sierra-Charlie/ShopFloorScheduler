import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assembly-cards/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assembly-cards'] });
      setSelectedFile(null);
      setIsOpen(false);
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || 'Failed to upload file',
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel (.xlsx, .xls) or CSV file",
          variant: "destructive",
        });
        return;
      }

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const downloadTemplate = async (format: 'xlsx' | 'csv') => {
    try {
      const response = await fetch(`/api/assembly-cards/template?format=${format}`);
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assembly_cards_template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `Template file downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-file-upload">
          <Upload className="h-4 w-4 mr-2" />
          File Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Assembly Cards</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Template Download Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Download Template</Label>
            <p className="text-xs text-muted-foreground">
              Download a template file with the correct format and current data
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('xlsx')}
                data-testid="button-download-excel"
              >
                <Download className="h-3 w-3 mr-1" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('csv')}
                data-testid="button-download-csv"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                Select File
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload Excel (.xlsx, .xls) or CSV files with assembly card data
              </p>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
                data-testid="input-file-upload"
              />
            </div>

            {selectedFile && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="mt-2 space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Processing file...
                </p>
              </div>
            )}

            {uploadMutation.error && (
              <Alert className="mt-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="flex-1"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setIsOpen(false);
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>

            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The file will be validated before import. Any errors will be reported before creating cards.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}