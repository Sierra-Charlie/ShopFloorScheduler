import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Download, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FileUploadProps {
  onUploadSuccess?: () => void;
}

interface ValidationError {
  row: number;
  data: any;
  error: any;
}

interface UploadError {
  message: string;
  errors?: ValidationError[];
  validCount?: number;
  totalCount?: number;
}

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<UploadError | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
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
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Upload failed') as any;
        error.errorData = errorData;
        throw error;
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
      setValidationErrors(null);
      setIsOpen(false);
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      
      // Check if this is a validation error with detailed information
      if (error.errorData && error.errorData.errors) {
        setValidationErrors(error.errorData);
        toast({
          title: "Validation Errors Found",
          description: `${error.errorData.errors.length} row(s) have validation errors. Please check the details below.`,
          variant: "destructive",
        });
      } else {
        setValidationErrors(null);
        toast({
          title: "Upload Failed",
          description: error.message || 'Failed to upload file',
          variant: "destructive",
        });
      }
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
      setValidationErrors(null); // Clear previous errors when selecting new file
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

            {validationErrors && (
              <div className="mt-2 space-y-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">{validationErrors.message}</p>
                      {validationErrors.validCount !== undefined && validationErrors.totalCount !== undefined && (
                        <p className="text-sm">
                          {validationErrors.validCount} of {validationErrors.totalCount} rows are valid
                        </p>
                      )}
                      {validationErrors.errors && validationErrors.errors.length > 0 && (
                        <Collapsible open={showErrorDetails} onOpenChange={setShowErrorDetails}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs p-0 h-auto text-destructive hover:text-destructive">
                              {showErrorDetails ? (
                                <><ChevronDown className="h-3 w-3 mr-1" />Hide error details</>
                              ) : (
                                <><ChevronRight className="h-3 w-3 mr-1" />Show error details ({validationErrors.errors.length} rows)</>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <div className="max-h-48 overflow-y-auto border rounded p-2 bg-background/50">
                              {validationErrors.errors.map((err, idx) => (
                                <div key={idx} className="mb-3 pb-2 border-b border-border/50 last:border-b-0">
                                  <p className="font-medium text-xs">Row {err.row}:</p>
                                  <div className="mt-1 space-y-1">
                                    {Array.isArray(err.error) ? err.error.map((zodError: any, errIdx: number) => (
                                      <p key={errIdx} className="text-xs text-muted-foreground">
                                        • <span className="font-medium">{zodError.path.join('.')}</span>: {zodError.message}
                                      </p>
                                    )) : (
                                      <p className="text-xs text-muted-foreground">• {err.error}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {uploadMutation.error && !validationErrors && (
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
                  setValidationErrors(null);
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