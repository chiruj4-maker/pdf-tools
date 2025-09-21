'use client';
import { useState, useEffect } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Scaling, Loader2, Download, Lock, LockOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadFile } from '@/lib/file-utils';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ResizeMode = 'pixels' | 'percentage';

export function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{width: number, height: number} | null>(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [percentage, setPercentage] = useState('50');
  const [isResizing, setIsResizing] = useState(false);
  const [resizedImage, setResizedImage] = useState<Blob | null>(null);
  const [originalFileName, setOriginalFileName] = useState('');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('pixels');

  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  useEffect(() => {
    if (file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                setOriginalDimensions({ width: img.width, height: img.height });
                setWidth(String(img.width));
                setHeight(String(img.height));
            };
        };
    }
  }, [file]);


  const handleDimensionChange = (value: string, dimension: 'width' | 'height') => {
    if (!lockAspectRatio || !originalDimensions) {
        if (dimension === 'width') setWidth(value);
        else setHeight(value);
        return;
    }

    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue) || numericValue <= 0) {
        if (dimension === 'width') setWidth('');
        else setHeight('');
        return;
    }

    const aspectRatio = originalDimensions.width / originalDimensions.height;
    if (dimension === 'width') {
        setWidth(value);
        setHeight(String(Math.round(numericValue / aspectRatio)));
    } else {
        setHeight(value);
        setWidth(String(Math.round(numericValue * aspectRatio)));
    }
  }


  const handleFileAdded = (files: File[]) => {
    const selectedFile = files[0] || null;
    setFile(selectedFile);
    setResizedImage(null);
    setOriginalFileName(selectedFile ? selectedFile.name : '');
  };

  const handleResize = async () => {
    if (!file || !originalDimensions) {
      toast({ title: "No file selected", description: "Please select an image file to resize.", variant: "destructive" });
      return;
    }
    
    let newWidth: number;
    let newHeight: number;

    if (resizeMode === 'pixels') {
        newWidth = parseInt(width, 10);
        newHeight = parseInt(height, 10);
        if (isNaN(newWidth) && isNaN(newHeight)) {
             toast({ title: "No dimensions specified", description: "Please enter a width or a height.", variant: "destructive" });
             return;
        }
        if (isNaN(newWidth)) {
            newWidth = (originalDimensions.width / originalDimensions.height) * newHeight;
        } else if (isNaN(newHeight)) {
            newHeight = (originalDimensions.height / originalDimensions.width) * newWidth;
        }
    } else { // Percentage
        const scale = parseInt(percentage, 10);
        if (isNaN(scale) || scale <= 0) {
            toast({ title: "Invalid Percentage", description: "Please enter a valid percentage.", variant: "destructive" });
            return;
        }
        newWidth = originalDimensions.width * (scale / 100);
        newHeight = originalDimensions.height * (scale / 100);
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

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            canvas.toBlob((blob) => {
                if(blob){
                    setResizedImage(blob);
                    addTask({
                        name: 'Image Resizing',
                        details: `Resized ${file.name} to ${Math.round(newWidth)} x ${Math.round(newHeight)}.`,
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
    setPercentage('50');
    setResizedImage(null);
    setOriginalFileName('');
    setOriginalDimensions(null);
    setLockAspectRatio(true);
    setResizeMode('pixels');
  }

  return (
    <div className="space-y-6">
      {!file && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'image/*': ['.jpeg', '.png', '.gif', '.webp'] }} multiple={false} />}

      {file && (
        <Alert variant="default" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <File className="h-5 w-5"/>
                <AlertDescription>{file.name} ({(file.size / 1024).toFixed(2)} KB) {originalDimensions && ` - ${originalDimensions.width} x ${originalDimensions.height}px`}</AlertDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}>
                <X className="h-4 w-4" />
            </Button>
        </Alert>
      )}

      {file && !resizedImage && (
        <>
            <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                    <Switch id="aspect-ratio-lock" checked={lockAspectRatio} onCheckedChange={setLockAspectRatio} />
                    <Label htmlFor="aspect-ratio-lock" className="flex items-center gap-2 cursor-pointer">
                        {lockAspectRatio ? <Lock /> : <LockOpen />}
                        Lock Aspect Ratio
                    </Label>
                </div>
                <RadioGroup defaultValue="pixels" value={resizeMode} onValueChange={(value: string) => setResizeMode(value as ResizeMode)}>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pixels" id="r-pixels" />
                      <Label htmlFor="r-pixels">By Pixels</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percentage" id="r-percentage" />
                      <Label htmlFor="r-percentage">By Percentage</Label>
                    </div>
                  </div>
                </RadioGroup>

                {resizeMode === 'pixels' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end animate-in fade-in-50 duration-300">
                      <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="width">Width (px)</Label>
                          <Input id="width" type="number" placeholder="e.g., 1920" value={width} onChange={(e) => handleDimensionChange(e.target.value, 'width')} disabled={isResizing} />
                      </div>
                      <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="height">Height (px)</Label>
                          <Input id="height" type="number" placeholder="e.g., 1080" value={height} onChange={(e) => handleDimensionChange(e.target.value, 'height')} disabled={isResizing} />
                      </div>
                  </div>
                ) : (
                  <div className="grid w-full max-w-xs items-center gap-1.5 animate-in fade-in-50 duration-300">
                      <Label htmlFor="percentage">Percentage (%)</Label>
                      <Input id="percentage" type="number" placeholder="e.g., 50" value={percentage} onChange={(e) => setPercentage(e.target.value)} disabled={isResizing} />
                  </div>
                )}
            </div>


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
