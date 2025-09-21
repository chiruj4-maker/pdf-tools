'use client';
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, FileImage, Loader2, Download, Archive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { downloadFile, createZip } from '@/lib/file-utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type OutputImage = {
  name: string;
  blob: Blob;
}

export function PdfToImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [isConverting, setIsConverting] = useState(false);
  const [outputImages, setOutputImages] = useState<OutputImage[]>([]);
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const handleFileAdded = (files: File[]) => {
    setFile(files[0] || null);
    setOutputImages([]);
  };

  const handleConvert = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a PDF file to convert.", variant: "destructive" });
      return;
    }
    
    setIsConverting(true);
    setOutputImages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const images: OutputImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Increase scale for better quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context!, viewport: viewport }).promise;

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, `image/${imageFormat}`));

        if (blob) {
            images.push({
                name: `${file.name.replace('.pdf', '')}-page-${i}.${imageFormat === 'jpeg' ? 'jpg' : 'png'}`,
                blob: blob,
            });
        }
      }

      setOutputImages(images);

      addTask({
          name: 'PDF to Image Conversion',
          details: `Converted ${numPages} pages from ${file.name} to ${imageFormat.toUpperCase()}`,
          status: 'completed',
      });
      toast({
          title: 'Conversion Complete!',
          description: `${file.name} has been converted.`,
          action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
      });

    } catch(error) {
        console.error(error);
        toast({ title: "Conversion Failed", description: "Could not process the PDF file.", variant: "destructive" });
    } finally {
        setIsConverting(false);
    }
  };

  const handleDownloadAll = async () => {
    if(outputImages.length > 0) {
        const zipBlob = await createZip(outputImages);
        downloadFile(zipBlob, `${file?.name.replace('.pdf','') || 'images'}.zip`);
    }
  }

  const reset = () => {
      setFile(null);
      setOutputImages([]);
      setIsConverting(false);
  }

  return (
    <div className="space-y-6">
      {outputImages.length === 0 && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={false} />}

      {file && outputImages.length === 0 && (
        <>
            <Alert variant="default" className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-5 w-5 flex-shrink-0"/>
                    <AlertDescription className="truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</AlertDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={isConverting}>
                    <X className="h-4 w-4" />
                </Button>
            </Alert>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-auto">
                    <Label htmlFor="format">Image Format</Label>
                    <Select value={imageFormat} onValueChange={(v) => setImageFormat(v as 'png' | 'jpeg')} disabled={isConverting}>
                    <SelectTrigger id="format" className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpeg">JPG</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                <div className="flex-grow"></div>
                <Button onClick={handleConvert} disabled={isConverting} className="w-full sm:w-auto">
                    {isConverting ? <Loader2 className="mr-2 animate-spin"/> : <FileImage className="mr-2"/>}
                    {isConverting ? 'Converting...' : 'Convert to Image'}
                </Button>
            </div>
        </>
      )}

      {outputImages.length > 0 && (
           <div className="space-y-4">
                <p className="font-medium">Conversion successful! {outputImages.length} images were generated.</p>
                <div className="flex gap-2">
                    <Button onClick={handleDownloadAll}>
                        <Archive className="mr-2"/>
                        Download All (.zip)
                    </Button>
                    <Button onClick={reset} variant="outline">
                        Start Over
                    </Button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-md p-2">
                    {outputImages.map((image, index) => (
                        <Alert key={index} variant="default" className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileImage className="h-5 w-5 flex-shrink-0"/>
                                <AlertDescription className="truncate">{image.name}</AlertDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => downloadFile(image.blob, image.name)}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </Alert>
                    ))}
                </div>
           </div>
      )}
    </div>
  );
}
