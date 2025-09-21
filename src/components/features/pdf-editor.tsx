'use client';
import { useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Loader2, Download, Trash2, RotateCcw, Save, FilePlus, ZoomIn, ZoomOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadFile } from '@/lib/file-utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type PDFPage = {
  id: number; // Original page number
  uniqueId: string;
  thumbnail: string;
  rotation: number; // In degrees
};

const SortablePageThumbnail = ({ page, isSelected, onClick }: { page: PDFPage, isSelected: boolean, onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.uniqueId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} className={`relative aspect-[7/10] bg-white border-2 rounded-md shadow-sm overflow-hidden touch-none cursor-pointer ${isSelected ? 'border-primary' : 'border-transparent'}`} onClick={onClick} {...attributes} {...listeners}>
            <img src={page.thumbnail} alt={`Page ${page.id}`} className="w-full h-full object-contain" style={{ transform: `rotate(${page.rotation}deg)` }} />
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs rounded-sm px-1">{page.id}</div>
        </div>
    );
};


export function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
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
    setSelectedPageId(null);
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
        newPages.push({ id: i, uniqueId: `page-${i}`, thumbnail, rotation: 0 });
      }
      setPages(newPages);
      if (newPages.length > 0) {
        setSelectedPageId(newPages[0].uniqueId);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error loading PDF", description: "Could not read or render the selected PDF file.", variant: "destructive" });
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex(item => item.uniqueId === active.id);
        const newIndex = items.findIndex(item => item.uniqueId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleDeleteSelected = () => {
    if(!selectedPageId) return;
    const pagesBeforeDelete = pages.length;
    setPages(prev => {
        const newPages = prev.filter(p => p.uniqueId !== selectedPageId);
        // Select the next page, or the previous one if the last was deleted
        const deletedIndex = prev.findIndex(p => p.uniqueId === selectedPageId);
        if(newPages.length > 0) {
            const newIndex = Math.min(deletedIndex, newPages.length - 1);
            setSelectedPageId(newPages[newIndex].uniqueId);
        } else {
            setSelectedPageId(null);
        }
        return newPages;
    });
    toast({ title: "Page Deleted", description: `1 page has been removed. Click 'Save & Download' to finalize.`});
  };

  const handleRotateSelected = () => {
    if(!selectedPageId) return;
    setPages(prev => prev.map(p => {
        if (p.uniqueId === selectedPageId) {
            return { ...p, rotation: (p.rotation + 90) % 360 };
        }
        return p;
    }));
    toast({ title: "Rotation Queued", description: `Selected page will be rotated. Click 'Save & Download' to finalize.`});
  };
  
  const handleInsertPage = () => {
      if (!selectedPageId) return;
      const newPageId = `blank-${crypto.randomUUID()}`;
      const blankPage: PDFPage = {
          id: -1, // Indicates a blank page
          uniqueId: newPageId,
          thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==",
          rotation: 0
      };
      
      const currentIndex = pages.findIndex(p => p.uniqueId === selectedPageId);
      const newPages = [...pages];
      newPages.splice(currentIndex + 1, 0, blankPage);
      setPages(newPages);
      setSelectedPageId(newPageId);
  }

  const handleSave = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
        const originalPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const newPdfDoc = await PDFDocument.create();
        
        const pageIndicesToCopy = pages.map(p => p.id - 1).filter(i => i >= 0);
        const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndicesToCopy);
        
        const pageMap = new Map<number, any>();
        pageIndicesToCopy.forEach((originalIndex, i) => {
            pageMap.set(originalIndex + 1, copiedPages[i]);
        });

        for (const page of pages) {
            if (page.id === -1) { // It's a blank page
                newPdfDoc.addPage();
            } else {
                const copiedPage = pageMap.get(page.id);
                if (copiedPage) {
                    copiedPage.setRotation(degrees(page.rotation));
                    newPdfDoc.addPage(copiedPage);
                }
            }
        }

        const finalPdfBytes = await newPdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        downloadFile(blob, `edited-${file.name}`);

        addTask({ name: 'PDF Edit', details: `Edited ${file.name}.`, status: 'completed' });
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
    setSelectedPageId(null);
    setZoom(1);
  };
  
  const selectedPage = useMemo(() => pages.find(p => p.uniqueId === selectedPageId), [pages, selectedPageId]);

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
                <Button size="sm" onClick={handleDeleteSelected} disabled={isProcessing || !selectedPageId}>
                    <Trash2 className="mr-2"/> Delete Page
                </Button>
                <Button size="sm" onClick={handleRotateSelected} disabled={isProcessing || !selectedPageId}>
                    <RotateCcw className="mr-2"/> Rotate Page
                </Button>
                <Button size="sm" onClick={handleInsertPage} disabled={isProcessing || !selectedPageId}>
                    <FilePlus className="mr-2"/> Insert Blank Page
                </Button>
                <div className="flex-grow"/>
                <Button size="sm" onClick={handleSave} disabled={isProcessing || pages.length === 0}>
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
            
            <div className="flex gap-4 h-[60vh]">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pages.map(p => p.uniqueId)} strategy={verticalListSortingStrategy}>
                    <ScrollArea className="w-40 h-full">
                      <div className="space-y-2 pr-4">
                        {pages.map((page) => (
                          <SortablePageThumbnail 
                            key={page.uniqueId} 
                            page={page} 
                            isSelected={selectedPageId === page.uniqueId}
                            onClick={() => setSelectedPageId(page.uniqueId)}
                           />
                        ))}
                      </div>
                    </ScrollArea>
                </SortableContext>
              </DndContext>
              
              <div className="flex-1 bg-muted/50 rounded-lg flex flex-col items-center justify-center relative p-4">
                {selectedPage ? (
                  <>
                  <ScrollArea className="w-full h-full">
                    <div className="flex items-center justify-center w-full h-full">
                        <img 
                            src={selectedPage.id === -1 ? selectedPage.thumbnail : pages.find(p => p.uniqueId === selectedPageId)?.thumbnail} 
                            alt={`Page Preview`} 
                            className="max-w-full max-h-full object-contain shadow-lg" 
                            style={{ transform: `scale(${zoom}) rotate(${selectedPage.rotation}deg)` }}
                        />
                    </div>
                  </ScrollArea>
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/80 border p-1 rounded-lg">
                      <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.2, z-0.1))}><ZoomOut className="h-5 w-5"/></Button>
                      <span className="text-sm font-semibold w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                      <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z+0.1))}><ZoomIn className="h-5 w-5"/></Button>
                  </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No page selected</p>
                )}
              </div>
            </div>
        </>
      )}

    </div>
  );
}
