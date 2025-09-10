'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Scaling, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const handleFileAdded = (files: File[]) => {
    setFile(files[0] || null);
  };

  const handleResize = () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select an image file to resize.", variant: "destructive" });
      return;
    }
    if (!width && !height) {
        toast({ title: "No dimensions specified", description: "Please enter a width or a height.", variant: "destructive" });
        return;
    }

    // Placeholder for resizing logic
    console.log(`Resizing ${file.name} to ${width}x${height}`);

    setTimeout(() => {
        addTask({
            name: 'Image Resizing',
            details: `Resized ${file.name} to ${width || 'auto'} x ${height || 'auto'}.`,
            status: 'completed',
        });
        toast({
            title: 'Resize Complete!',
            description: `${file.name} has been resized.`,
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        });
        setFile(null);
        setWidth('');
        setHeight('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'image/*': ['.jpeg', '.png', '.gif', '.webp'] }} multiple={false} />

      {file && (
        <Alert variant="default" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <File className="h-5 w-5"/>
                <AlertDescription>{file.name} ({(file.size / 1024).toFixed(2)} KB)</AlertDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
            </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="width">Width (px)</Label>
          <Input id="width" type="number" placeholder="e.g., 1920" value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="height">Height (px)</Label>
          <Input id="height" type="number" placeholder="e.g., 1080" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
      </div>
       <p className="text-sm text-muted-foreground">Leave a dimension blank to auto-scale and maintain aspect ratio.</p>


      <div className="flex justify-end">
        <Button onClick={handleResize} disabled={!file}>
            <Scaling className="mr-2"/>
            Resize Image
        </Button>
      </div>
    </div>
  );
}
