import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Upload, Image, Video, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AttachmentUploadProps {
  onAttachmentSelect: (attachment: { url: string; name: string; type: string }) => void;
  autoUpload?: boolean;
}

export function AttachmentUpload({ onAttachmentSelect, autoUpload = false }: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-upload if enabled
      if (autoUpload) {
        await handleUploadFile(file);
      }
    }
  };

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Get upload URL from backend
      const fileExtension = file.name.split('.').pop() || '';
      const uploadResponse = await fetch("/api/attachments/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileExtension })
      });
      const { uploadURL } = await uploadResponse.json();

      // Upload file directly to object storage
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (uploadResult.ok) {
        // Extract path from upload URL for serving
        const url = new URL(uploadURL);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part.startsWith('repl-objstore-') || part.startsWith('replit-objstore-'));
        if (bucketIndex !== -1) {
          // Get the path after bucket and .private directory
          const attachmentPath = pathParts.slice(bucketIndex + 2).join('/');
          // Extract just the filename from the attachments/filename path
          const fileName = attachmentPath.replace('attachments/', '');
          const attachmentUrl = `/attachments/${fileName}`;
          
          onAttachmentSelect({
            url: attachmentUrl,
            name: file.name,
            type: file.type
          });
        } else {
          // Fallback: use full upload URL
          onAttachmentSelect({
            url: uploadURL,
            name: file.name,
            type: file.type
          });
        }
        
        // Reset form only if not auto-uploading (so dialog can show the selected file)
        if (!autoUpload) {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    await handleUploadFile(selectedFile);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-2">
      {!selectedFile ? (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            data-testid="file-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-select-file"
          >
            <Camera className="h-4 w-4 mr-2" />
            Take a Photo or Video
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
          <div className="flex items-center gap-2 flex-1">
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!autoUpload && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                data-testid="button-upload-file"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            )}
            {autoUpload && isUploading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Uploading...
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              data-testid="button-remove-file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}