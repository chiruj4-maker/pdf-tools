'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, FilePlus, Loader2, Download, GripVertical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFDocument } from 'pdf-lib';
import { downloadFile } from '@/lib/file-utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFileItemProps {
  file: File;
  onRemove: () => void;
  isConverting: boolean;
}

function SortableFileItem({ file, onRemove, isConverting }: SortableFileItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: file.name });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} >
       <Alert variant="default" className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
              <button {...attributes} {...listeners} className="cursor-grab touch-none p-1"><GripVertical className="h-5 w-5 text-muted-foreground"/></button>
              <File className="h-5 w-5 flex-shrink-0"/>
              <AlertDescription className="truncate">{file.name} ({(file.size / 1024).toFixed(2)} KB)</AlertDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} disabled={isConverting}>
              <X className="h-4 w-4" />
          </Button>
      </Alert>
    </div>
  );
}


export function ImageToPdfConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFilesAdded = (newFiles: File[]) => {
    setFiles(prevFiles => {
      const allFiles = [...prevFiles, ...newFiles];
      const uniqueFiles = allFiles.filter((file, index, self) =>
        index === self.findIndex((f) => f.name === file.name && f.size === file.size)
      );
      return uniqueFiles;
    });
    setPdfBytes(null);
  };

  const removeFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter((file) => file.name !== fileName));
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(item => item.name === active.id);
        const newIndex = items.findIndex(item => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }


  const handleConvert = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please select one or more image files to convert.", variant: "destructive" });
      return;
    }
    
    setIsConverting(true);
    setPdfBytes(null);

    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const file of files) {
        const imageBytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg') {
            image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
             toast({ title: "Unsupported file type", description: `Skipping ${file.name}. Only JPG and PNG are supported.`, variant: "destructive" });
             continue;
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }
      
      const generatedPdfBytes = await pdfDoc.save();
      setPdfBytes(generatedPdfBytes);

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

    } catch(error) {
        console.error(error);
        toast({ title: "Conversion Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
    } finally {
        setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      downloadFile(blob, 'converted-images.pdf', 'pdf');
    }
  };

  const reset = () => {
    setFiles([]);
    setPdfBytes(null);
  }

  return (
    <div className="space-y-6">
      {!pdfBytes && <FileDropzone onFilesAdded={handleFilesAdded} accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }} multiple={true} />}

      {files.length > 0 && !pdfBytes && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-2">
                <h3 className="font-semibold">Selected Files ({files.length}):</h3>
                 <p className="text-sm text-muted-foreground">Drag and drop to reorder the images before converting.</p>
                <SortableContext items={files.map(f => f.name)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {files.map((file) => (
                           <SortableFileItem key={file.name} file={file} onRemove={() => removeFile(file.name)} isConverting={isConverting} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </DndContext>
      )}

      {files.length > 0 && !pdfBytes && (
        <div className="flex justify-end">
            <Button onClick={handleConvert} disabled={isConverting}>
                {isConverting ? <Loader2 className="mr-2 animate-spin" /> : <FilePlus className="mr-2"/>}
                {isConverting ? `Converting (${files.length} files)...` : `Create PDF from ${files.length} Image(s)`}
            </Button>
        </div>
      )}

       {pdfBytes && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 border rounded-lg bg-muted/50">
                <p className="font-medium text-center">Your PDF is ready!</p>
                <div className="flex gap-2">
                    <Button onClick={handleDownload}>
                        <Download className="mr-2" />
                        Download PDF
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
