'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, FilePlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ImageToPdfConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleConvert = () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please select one or more image files to convert.", variant: "destructive" });
      return;
    }
    // Placeholder for conversion logic
    console.log(`Converting ${files.length} images to PDF`);

    setTimeout(() => {
        addTask({
            name: 'Image to PDF Conversion',
            details: `Converted ${files.length} images to a single PDF.`,
            status: 'completed',
        });
        toast({
            title: 'Conversion Complete!',
            description: 'Your images have been combined into a PDF.',
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        });
        setFiles([]);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <FileDropzone onFilesAdded={handleFilesAdded} accept={{ 'image/*': ['.jpeg', '.png', '.gif', '.webp'] }} multiple={true} />

      {files.length > 0 && (
        <div className="space-y-2">
            <h3 className="font-semibold">Selected Files ({files.length}):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {files.map((file, index) => (
                     <Alert key={index} variant="default" className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <File className="h-5 w-5 flex-shrink-0"/>
                            <AlertDescription className="truncate">{file.name} ({(file.size / 1024).toFixed(2)} KB)</AlertDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                ))}
            </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleConvert} disabled={files.length === 0}>
            <FilePlus className="mr-2"/>
            Create PDF
        </Button>
      </div>
    </div>
  );
}
