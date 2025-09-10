'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, FileImage } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export function PdfToImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [imageFormat, setImageFormat] = useState('png');
  const { addTask } = useTaskHistory();
  const { toast } = useToast();
  const [isConverting, setIsConverting] = useState(false);

  const handleFileAdded = (files: File[]) => {
    setFile(files[0] || null);
  };

  const handleConvert = () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a PDF file to convert.", variant: "destructive" });
      return;
    }
    
    setIsConverting(true);
    // Placeholder for conversion logic
    console.log(`Converting ${file.name} to ${imageFormat}`);

    setTimeout(() => {
        addTask({
            name: 'PDF to Image Conversion',
            details: `Converted ${file.name} to ${imageFormat.toUpperCase()}`,
            status: 'completed',
        });
        toast({
            title: 'Conversion Complete!',
            description: `${file.name} has been converted.`,
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        });
        setFile(null);
        setIsConverting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={false} />

      {file && (
        <Alert variant="default" className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                <File className="h-5 w-5 flex-shrink-0"/>
                <AlertDescription className="truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</AlertDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
            </Button>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-auto">
            <Label htmlFor="format" className="sr-only">Image Format</Label>
            <Select value={imageFormat} onValueChange={setImageFormat}>
            <SelectTrigger id="format" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="webp">WEBP</SelectItem>
            </SelectContent>
            </Select>
        </div>
        <Button onClick={handleConvert} disabled={!file || isConverting} className="w-full sm:w-auto flex-grow sm:flex-grow-0">
            <FileImage className="mr-2"/>
            {isConverting ? 'Converting...' : 'Convert to Image'}
        </Button>
      </div>
    </div>
  );
}
