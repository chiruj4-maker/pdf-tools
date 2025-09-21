'use client';
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Loader2, Download, FileArchive } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { PDFDocument } from 'pdf-lib';
import { downloadFile } from '@/lib/file-utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type CompressionLevel = 'low' | 'medium' | 'high';

export function PdfCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedPdf, setCompressedPdf] = useState<Blob | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const handleFileAdded = (files: File[]) => {
    const selectedFile = files[0] || null;
    setFile(selectedFile);
    setCompressedPdf(null);
    setOriginalSize(selectedFile ? selectedFile.size : 0);
  };

  const handleCompress = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a PDF file to compress.", variant: "destructive" });
      return;
    }

    setIsCompressing(true);
    setCompressedPdf(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const newPdfDoc = await PDFDocument.create();

      const qualityOptions = {
        low: 0.5,
        medium: 0.75,
        high: 0.9,
      };
      const quality = qualityOptions[compressionLevel];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context!, viewport: viewport }).promise;
        const jpgUrl = canvas.toDataURL('image/jpeg', quality);
        const jpgImageBytes = await fetch(jpgUrl).then(res => res.arrayBuffer());
        
        const jpgImage = await newPdfDoc.embedJpg(jpgImageBytes);
        
        const newPage = newPdfDoc.addPage([jpgImage.width, jpgImage.height]);
        newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: newPage.getWidth(),
            height: newPage.getHeight()
        });
      }

      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setCompressedPdf(blob);
      setCompressedSize(blob.size);

      addTask({
        name: 'PDF Compression',
        details: `Compressed ${file.name} with ${compressionLevel} compression.`,
        status: 'completed',
      });
      toast({
        title: 'Compression Complete!',
        description: `Your PDF has been compressed.`,
        action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>,
      });

    } catch (error) {
      console.error(error);
      toast({ title: "Compression Failed", description: "An error occurred while compressing the PDF.", variant: "destructive" });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (compressedPdf) {
      downloadFile(compressedPdf, `compressed-${file?.name || 'document'}.pdf`);
    }
  };

  const reset = () => {
    setFile(null);
    setCompressedPdf(null);
    setOriginalSize(0);
    setCompressedSize(0);
  };
  
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-6">
      {!file && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={false} />}

      {file && (
        <Alert variant="default" className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <File className="h-5 w-5 flex-shrink-0" />
            <AlertDescription className="truncate">{file.name} ({formatSize(file.size)})</AlertDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={reset}>
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {file && !compressedPdf && (
        <>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="compression">Compression Level</Label>
            <Select value={compressionLevel} onValueChange={(v) => setCompressionLevel(v as CompressionLevel)} disabled={isCompressing}>
              <SelectTrigger id="compression">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Larger Size, Best Quality)</SelectItem>
                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                <SelectItem value="high">High (Smallest Size, Lower Quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCompress} disabled={isCompressing}>
              {isCompressing ? <Loader2 className="mr-2 animate-spin" /> : <FileArchive className="mr-2" />}
              {isCompressing ? 'Compressing...' : 'Compress PDF'}
            </Button>
          </div>
        </>
      )}

      {compressedPdf && (
        <div className="flex flex-col items-center justify-center gap-4 p-4 border rounded-lg bg-muted/50">
          <p className="font-medium text-center">Your compressed PDF is ready!</p>
          <div className="text-sm text-muted-foreground">
            Original Size: {formatSize(originalSize)} | Compressed Size: {formatSize(compressedSize)} | Reduction: {(((originalSize - compressedSize) / originalSize) * 100).toFixed(2)}%
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload}>
              <Download className="mr-2" />
              Download Compressed PDF
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
