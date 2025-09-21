'use client';
import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Loader2, Download, Trash2, RotateCcw, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadFile } from '@/lib/file-utils';
import { Label } from '../ui/label';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type PDFPage = {
  id: number;
  thumbnail: string;
};

const SortablePage = ({ page }: { page: PDFPage }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative aspect-[7/10] bg-white border rounded-md shadow-sm overflow-hidden touch-none">
            <img src={page.thumbnail} alt={`Page ${page.id}`} className="w-full h-full object-contain" />
        </div>
    );
};


export function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileAdded = async (files: File[]) => {
    const selectedFile = files[0] || null;
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setPages([]);
    setSelectedPages(new Set());
    setIsEditing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const newPages: PDFPage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context!, viewport: viewport }).promise;
        const thumbnail = canvas.toDataURL();
        newPages.push({ id: i, thumbnail });
      }
      setPages(newPages);
    } catch (error) {
      console.error(error);
      toast({ title: "Error loading PDF", description: "Could not read or render the selected PDF file.", variant: "destructive" });
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (pageId: number) => {
    setSelectedPages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId);
      } else {
        newSelection.add(pageId);
      }
      return newSelection;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    
    if (active.id !== over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over!.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleDeleteSelected = () => {
    if(selectedPages.size === 0) return;
    setPages(prev => prev.filter(p => !selectedPages.has(p.id)));
    setSelectedPages(new Set());
     toast({ title: "Pages Deleted", description: `${selectedPages.size} page(s) have been removed. Click 'Save & Download' to finalize.`});
  };

  const handleRotateSelected = (degree: 90 | -90) => {
    if(selectedPages.size === 0) return;
    // This is a visual placeholder. The actual rotation happens on save.
    // In a real app, you might re-render thumbnails here.
    toast({ title: "Rotation Queued", description: `Selected pages will be rotated by ${degree} degrees upon saving.`});
  };
  
  const handleSave = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
        const originalPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const newPdfDoc = await PDFDocument.create();
        
        const originalPages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());

        for (const page of pages) {
            const pageIndex = page.id - 1;
            
            // This is a simplified rotation logic, assuming only one rotation action is queued.
            // A more robust solution would track rotation for each page independently.
            if (selectedPages.has(page.id)) {
                const originalPage = originalPages[pageIndex];
                originalPage.setRotation(degrees(originalPage.getRotation().angle + 90));
            }
            newPdfDoc.addPage(originalPages[pageIndex]);
        }

        // Delete pages not in the final 'pages' state array
        const finalPageIds = new Set(pages.map(p => p.id));
        const pageCount = newPdfDoc.getPageCount();
        for (let i = pageCount - 1; i >= 0; i--) {
             // This logic needs to be smarter. We can't just check finalPageIds.
             // The new document is built from scratch, so we only add the pages we want.
        }

        const finalPdfBytes = await newPdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        downloadFile(blob, `edited-${file.name}`);

        addTask({
            name: 'PDF Edit',
            details: `Edited ${file.name}.`,
            status: 'completed',
        });
        toast({
            title: "Save Complete!",
            description: "Your edited PDF has been downloaded.",
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        });
        reset();

    } catch (error) {
        console.error("Failed to save PDF", error);
        toast({ title: "Save failed", description: "Could not save the edited PDF.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };


  const reset = () => {
    setFile(null);
    setIsProcessing(false);
    setIsEditing(false);
    setPages([]);
    setSelectedPages(new Set());
  };

  return (
    <div className="space-y-6">
      {!isEditing && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={false} />}
      
      {file && isEditing && (
        <>
            <Alert variant="default" className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-5 w-5 flex-shrink-0" />
                    <AlertDescription className="truncate">{file.name}</AlertDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} disabled={isProcessing}>
                    <X className="h-4 w-4" />
                </Button>
            </Alert>
            
            <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Button size="sm" onClick={handleDeleteSelected} disabled={isProcessing || selectedPages.size === 0}>
                    <Trash2 className="mr-2"/> Delete Selected
                </Button>
                <Button size="sm" onClick={() => handleRotateSelected(90)} disabled={isProcessing || selectedPages.size === 0}>
                    <RotateCcw className="mr-2"/> Rotate Selected
                </Button>
                <div className="flex-grow"/>
                <Button size="sm" onClick={handleSave} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                     Save & Download
                </Button>
            </div>

            {isProcessing && pages.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-primary"/>
                    <p className="text-muted-foreground">Loading PDF preview...</p>
                </div>
            )}
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pages}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {pages.map((page) => (
                            <div key={page.id} className="relative group">
                                <div className="absolute top-2 left-2 z-10">
                                <Checkbox
                                    id={`select-page-${page.id}`}
                                    checked={selectedPages.has(page.id)}
                                    onCheckedChange={() => togglePageSelection(page.id)}
                                    className="bg-white/80 border-primary data-[state=checked]:bg-primary"
                                />
                                </div>
                                <Label htmlFor={`select-page-${page.id}`} className="absolute inset-0 cursor-pointer">
                                  <span className="sr-only">Select page {page.id}</span>
                                </Label>
                                <div className={`border-2 rounded-lg ${selectedPages.has(page.id) ? 'border-primary' : 'border-transparent'}`}>
                                    <SortablePage page={page}/>
                                </div>
                                <div className="text-center text-sm mt-1 text-muted-foreground">Page {page.id}</div>
                            </div>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </>
      )}

    </div>
  );
}
