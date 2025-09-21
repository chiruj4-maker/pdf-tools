'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Scaling, Loader2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadFile } from '@/lib/file-utils';

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [resizedImage, setResizedImage] = useState<Blob | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const handleFileAdded = (files: File[]) => {
    const selectedFile = files[0] || null;
    setFile(selectedFile);
    setResizedImage(null);
    setOriginalFileName(selectedFile ? selectedFile.name : '');
  };

  const handleResize = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select an image file to resize.", variant: "destructive" });
      return;
    }
    if (!width && !height) {
        toast({ title: "No dimensions specified", description: "Please enter a width or a height.", variant: "destructive" });
        return;
    }

    setIsResizing(true);
    setResizedImage(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                toast({ title: "Error", description: "Could not process image.", variant: "destructive" });
                setIsResizing(false);
                return;
            }

            let newWidth = parseInt(width, 10);
            let newHeight = parseInt(height, 10);

            if (!width) {
                newWidth = (img.width / img.height) * newHeight;
            } else if (!height) {
                newHeight = (img.height / img.width) * newWidth;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            canvas.toBlob((blob) => {
                if(blob){
                    setResizedImage(blob);
                    addTask({
                        name: 'Image Resizing',
                        details: `Resized ${file.name} to ${newWidth} x ${newHeight}.`,
                        status: 'completed',
                    });
                    toast({
                        title: 'Resize Complete!',
                        description: `${file.name} has been resized.`,
                        action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
                    });
                } else {
                     toast({ title: "Error", description: "Failed to resize image.", variant: "destructive" });
                }
                setIsResizing(false);
            }, file.type);
        };
        img.onerror = () => {
            toast({ title: "Error", description: "Could not load image.", variant: "destructive" });
            setIsResizing(false);
        }
    };
    reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read file.", variant: "destructive" });
        setIsResizing(false);
    }
  };

  const handleDownload = () => {
      if (resizedImage) {
          const extension = originalFileName.split('.').pop();
          downloadFile(resizedImage, `resized-${originalFileName}`, extension || 'png');
      }
  }

  const reset = () => {
    setFile(null);
    setWidth('');
    setHeight('');
    setResizedImage(null);
    setOriginalFileName('');
  }

  return (
    <div className="space-y-6">
      {!file && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'image/*': ['.jpeg', '.png', '.gif', '.webp'] }} multiple={false} />}

      {file && (
        <Alert variant="default" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <File className="h-5 w-5"/>
                <AlertDescription>{file.name} ({(file.size / 1024).toFixed(2)} KB)</AlertDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}>
                <X className="h-4 w-4" />
            </Button>
        </Alert>
      )}

      {file && !resizedImage && (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="width">Width (px)</Label>
                <Input id="width" type="number" placeholder="e.g., 1920" value={width} onChange={(e) => setWidth(e.target.value)} disabled={isResizing} />
                </div>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="height">Height (px)</Label>
                <Input id="height" type="number" placeholder="e.g., 1080" value={height} onChange={(e) => setHeight(e.target.value)} disabled={isResizing} />
                </div>
            </div>
            <p className="text-sm text-muted-foreground">Leave a dimension blank to auto-scale and maintain aspect ratio.</p>


            <div className="flex justify-end">
                <Button onClick={handleResize} disabled={isResizing}>
                    {isResizing ? <Loader2 className="mr-2 animate-spin" /> : <Scaling className="mr-2"/>}
                    {isResizing ? 'Resizing...' : 'Resize Image'}
                </Button>
            </div>
        </>
      )}

      {resizedImage && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 border rounded-lg bg-muted/50">
                <p className="font-medium text-center">Your image is ready!</p>
                <div className="flex gap-2">
                    <Button onClick={handleDownload}>
                        <Download className="mr-2" />
                        Download Resized Image
                    </Button>
                     <Button onClick={reset} variant="outline">
                        Start Over
                    </Button>
                </div>
          </div>
      )}
    </div>
  );
}
