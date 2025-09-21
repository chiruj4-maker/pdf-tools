'use client';
import { useState } from 'react';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Loader2, Download, Combine, GripVertical } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFDocument } from 'pdf-lib';
import { downloadFile } from '@/lib/file-utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFileItemProps {
  file: File;
  onRemove: () => void;
  isMerging: boolean;
}

function SortableFileItem({ file, onRemove, isMerging }: SortableFileItemProps) {
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
          <Button variant="ghost" size="icon" onClick={onRemove} disabled={isMerging}>
              <X className="h-4 w-4" />
          </Button>
      </Alert>
    </div>
  );
}


export function PdfMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedPdf, setMergedPdf] = useState<Blob | null>(null);
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
    setMergedPdf(null);
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

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({ title: "Not enough files", description: "Please select at least two PDF files to merge.", variant: "destructive" });
      return;
    }
    
    setIsMerging(true);
    setMergedPdf(null);

    try {
        const mergedPdf = await PDFDocument.create();
        for (const file of files) {
            const pdfBytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
            });
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        setMergedPdf(blob);

        addTask({
            name: 'PDF Merge',
            details: `Merged ${files.length} PDFs into a single document.`,
            status: 'completed',
        });
        toast({
            title: 'Merge Complete!',
            description: 'Your PDFs have been successfully merged.',
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        });
    } catch (error) {
        console.error(error);
        toast({ title: "Merge Failed", description: "An error occurred while merging the PDFs.", variant: "destructive" });
    } finally {
        setIsMerging(false);
    }
  };

  const handleDownload = () => {
    if (mergedPdf) {
      downloadFile(mergedPdf, 'merged-document.pdf');
    }
  };

  const reset = () => {
    setFiles([]);
    setMergedPdf(null);
  }

  return (
    <div className="space-y-6">
      {!mergedPdf && <FileDropzone onFilesAdded={handleFilesAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={true} />}

      {files.length > 0 && !mergedPdf && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="space-y-2">
                <h3 className="font-semibold">Selected Files ({files.length}):</h3>
                <p className="text-sm text-muted-foreground">Drag and drop to reorder the files before merging.</p>
                <SortableContext items={files.map(f => f.name)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {files.map((file) => (
                           <SortableFileItem key={file.name} file={file} onRemove={() => removeFile(file.name)} isMerging={isMerging} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </DndContext>
      )}

      {files.length > 0 && !mergedPdf && (
        <div className="flex justify-end">
            <Button onClick={handleMerge} disabled={isMerging || files.length < 2}>
                {isMerging ? <Loader2 className="mr-2 animate-spin" /> : <Combine className="mr-2"/>}
                {isMerging ? `Merging (${files.length} files)...` : `Merge ${files.length} PDFs`}
            </Button>
        </div>
      )}

       {mergedPdf && (
          <div className="flex flex-col items-center justify-center gap-4 p-4 border rounded-lg bg-muted/50">
                <p className="font-medium text-center">Your merged PDF is ready!</p>
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
