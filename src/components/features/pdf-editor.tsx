'use client';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import type { fabric as FabricType } from 'fabric';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { FileDropzone } from '@/components/ui/file-dropzone';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { File, X, Check, Loader2, Download, Trash2, RotateCcw, Save, FilePlus, ZoomIn, ZoomOut, Image as ImageIcon, Type as TextIcon } from 'lucide-react';
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
            <img src={page.thumbnail} alt={`Page ${page.id}`} className="w-full h-full object-contain" />
             <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `rotate(${page.rotation}deg)` }} />
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs rounded-sm px-1">{page.id > 0 ? page.id : 'New'}</div>
        </div>
    );
};


export function PdfEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  
  // Fabric.js state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricType.Canvas | null>(null);
  const fabricRef = useRef<typeof FabricType | null>(null);
  const [isFabricReady, setIsFabricReady] = useState(false);

  const [zoom, setZoom] = useState(1);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectedPageIndex = useMemo(() => {
      if (!selectedPageId) return -1;
      return pages.findIndex(p => p.uniqueId === selectedPageId);
  }, [pages, selectedPageId]);

  useEffect(() => {
    import('fabric').then(fabricModule => {
        fabricRef.current = fabricModule.fabric;
        setIsFabricReady(true);
    });
  }, []);

  const initFabricCanvas = useCallback(() => {
    if (canvasRef.current && fabricRef.current) {
        fabricCanvasRef.current = new fabricRef.current.Canvas(canvasRef.current);
    }
    return () => {
        fabricCanvasRef.current?.dispose();
        fabricCanvasRef.current = null;
    }
  }, []);

  useEffect(() => {
    if(isFabricReady) {
        initFabricCanvas();
    }
  }, [isFabricReady, initFabricCanvas]);

  const drawCanvas = useCallback(async () => {
    if (!pdfDocProxy || selectedPageIndex === -1 || !fabricCanvasRef.current || !fabricRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const fabric = fabricRef.current;
    canvas.clear();

    const pageData = pages[selectedPageIndex];

    if (pageData.id === -1) { // It's a blank page
        const a4_width = 595;
        const a4_height = 842;
        canvas.setWidth(a4_width * zoom);
        canvas.setHeight(a4_height * zoom);
        canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
        return;
    }

    const page = await pdfDocProxy.getPage(pageData.id);
    const viewport = page.getViewport({ scale: zoom, rotation: pageData.rotation });
    
    canvas.setWidth(viewport.width);
    canvas.setHeight(viewport.height);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const tempContext = tempCanvas.getContext('2d');

    if (tempContext) {
      await page.render({ canvasContext: tempContext, viewport: viewport }).promise;
    
      const bgImage = new fabric.Image(tempCanvas, {
          selectable: false,
          evented: false,
      });
      
      canvas.setBackgroundImage(bgImage, canvas.renderAll.bind(canvas), {
          originX: 'left',
          originY: 'top',
      });
    }

  }, [pdfDocProxy, selectedPageIndex, pages, zoom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);


  const handleFileAdded = async (files: File[]) => {
    const selectedFile = files[0] || null;
    if (!selectedFile) return;

    reset();
    setFile(selectedFile);
    setIsProcessing(true);
    setIsEditing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocProxy(pdf);
      
      const numPages = pdf.numPages;
      const newPages: PDFPage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const thumbnail = canvas.toDataURL();
          newPages.push({ id: i, uniqueId: `page-${i}`, thumbnail, rotation: 0 });
        }
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
            const newRotation = (p.rotation + 90) % 360;
            return { ...p, rotation: newRotation };
        }
        return p;
    }));
    toast({ title: "Rotation Queued", description: `Selected page will be rotated. Click 'Save & Download' to finalize.`});
  };
  
  const handleInsertPage = () => {
      if (selectedPageIndex === -1) {
         toast({title: "Select a page", description: "Please select a page to insert a new page after.", variant: "destructive"});
         return;
      }
      const newPageId = `blank-${crypto.randomUUID()}`;
      const blankPage: PDFPage = {
          id: -1, // Indicates a blank page
          uniqueId: newPageId,
          thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/epv2AAAAABJRU5ErkJggg==",
          rotation: 0
      };
      
      const newPages = [...pages];
      newPages.splice(selectedPageIndex + 1, 0, blankPage);
      setPages(newPages);
      setSelectedPageId(newPageId);
  }

  const handleAddImageClick = () => {
      imageInputRef.current?.click();
  }

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const imageFile = e.target.files?.[0];
      if (imageFile && fabricCanvasRef.current && fabricRef.current) {
          const fabric = fabricRef.current;
          const reader = new FileReader();
          reader.onload = (event) => {
              if(event.target?.result) {
                fabric.Image.fromURL(event.target.result as string, (img) => {
                    const canvas = fabricCanvasRef.current!;
                    img.scale(0.2);
                    img.set({
                        left: canvas.getWidth() / 2,
                        top: canvas.getHeight() / 2,
                        originX: 'center',
                        originY: 'center',
                    });
                    canvas.add(img);
                });
                toast({ title: "Image Added", description: "The image has been added to the page. You can move and resize it." });
              }
          };
          reader.readAsDataURL(imageFile);
      }
      if (e.target) {
        e.target.value = '';
      }
  }

  const handleAddText = () => {
    if (!fabricCanvasRef.current || !fabricRef.current) return;
    const fabric = fabricRef.current;
    const canvas = fabricCanvasRef.current;

    const text = new fabric.IText('Your Text Here', {
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        fontSize: 24,
        fill: 'black',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    toast({ title: "Text Added", description: "Click to edit the text. You can also move and resize it." });
  }

  const handleSave = async () => {
    if (!file || !pdfDocProxy || !fabricRef.current) return;

    const fabric = fabricRef.current;
    setIsProcessing(true);
    try {
        const originalPdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const newPdfDoc = await PDFDocument.create();

        // Save canvas state for the currently selected page before anything else
        if (fabricCanvasRef.current && selectedPageId) {
             const pageData = pages.find(p => p.uniqueId === selectedPageId);
             if (pageData) {
                 const json = fabricCanvasRef.current.toObject();
                 sessionStorage.setItem(pageData.uniqueId, JSON.stringify(json));
             }
        }
        
        for(const page of pages) {
            let newPage;
            if(page.id === -1) { // It's a blank page
                newPage = newPdfDoc.addPage();
            } else {
                const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [page.id - 1]);
                copiedPage.setRotation(degrees(page.rotation));
                newPage = newPdfDoc.addPage(copiedPage);
            }
            
            const savedStateJSON = sessionStorage.getItem(page.uniqueId);
            if (savedStateJSON) {
                const tempCanvas = new fabric.StaticCanvas(null);
                tempCanvas.setDimensions({width: newPage.getWidth(), height: newPage.getHeight()});

                const renderContext = new Promise<void>(resolve => {
                    tempCanvas.loadFromJSON(savedStateJSON, async () => {
                        const objects = tempCanvas.getObjects();
                        const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);

                        for (const obj of objects) {
                            const { scaleX = 1, scaleY = 1, left = 0, top = 0, angle = 0 } = obj;
                            const width = obj.getScaledWidth();
                            const height = obj.getScaledHeight();

                            if (obj.type === 'image' && obj instanceof fabric.Image) {
                                const imageElement = obj.getElement() as HTMLImageElement;
                                const imageBytes = await fetch(imageElement.src).then(res => res.arrayBuffer());
                                const isPng = imageElement.src.startsWith('data:image/png');
                                const pdfImage = isPng ? await newPdfDoc.embedPng(imageBytes) : await newPdfDoc.embedJpg(imageBytes);

                                newPage.drawImage(pdfImage, {
                                    x: left,
                                    y: newPage.getHeight() - top - height,
                                    width: width,
                                    height: height,
                                    rotate: degrees(-angle),
                                });
                            } else if (obj.type === 'i-text' && obj instanceof fabric.IText) {
                                const text = obj.text || '';
                                const fontSize = (obj.fontSize || 12) * (scaleY || 1);
                                newPage.drawText(text, {
                                    x: left,
                                    y: newPage.getHeight() - top - fontSize,
                                    font: helveticaFont,
                                    size: fontSize,
                                    color: rgb(0, 0, 0), // Simplification: assuming black text
                                    rotate: degrees(-angle),
                                });
                            }
                        }
                        resolve();
                    });
                });
                await renderContext;
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
    setPdfDocProxy(null);
    if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear();
    }
    sessionStorage.clear();
  };
  
  const selectedPageData = useMemo(() => pages.find(p => p.uniqueId === selectedPageId), [pages, selectedPageId]);

  const handlePageSelect = useCallback((newPageId: string) => {
    if (fabricCanvasRef.current && selectedPageId) {
        // Save current canvas state
        const oldPageData = pages.find(p => p.uniqueId === selectedPageId);
        if (oldPageData) {
            const json = fabricCanvasRef.current.toObject();
            if (json.objects.length > 0) {
              sessionStorage.setItem(oldPageData.uniqueId, JSON.stringify(json));
            } else {
              sessionStorage.removeItem(oldPageData.uniqueId);
            }
        }
    }
    
    setSelectedPageId(newPageId);

    // Load new canvas state
    if (fabricCanvasRef.current && newPageId) {
        const newPageData = pages.find(p => p.uniqueId === newPageId);
        if (newPageData) {
            const savedStateJSON = sessionStorage.getItem(newPageData.uniqueId);
            fabricCanvasRef.current.clear();
            
            drawCanvas().then(() => {
                if (savedStateJSON && fabricCanvasRef.current) {
                    fabricCanvasRef.current.loadFromJSON(savedStateJSON, () => {
                      fabricCanvasRef.current?.renderAll();
                    });
                }
            });
        }
    }
  }, [selectedPageId, pages, drawCanvas]);

  return (
    <div className="space-y-6">
      {!isEditing && <FileDropzone onFilesAdded={handleFileAdded} accept={{ 'application/pdf': ['.pdf'] }} multiple={false} />}
      
      <input type="file" ref={imageInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleImageSelected}/>

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
                <Button size="sm" onClick={handleInsertPage} disabled={isProcessing}>
                    <FilePlus className="mr-2"/> Insert Blank Page
                </Button>
                 <Button size="sm" onClick={handleAddImageClick} disabled={isProcessing || !selectedPageId || !isFabricReady}>
                    <ImageIcon className="mr-2"/> Insert Image
                </Button>
                <Button size="sm" onClick={handleAddText} disabled={isProcessing || !selectedPageId || !isFabricReady}>
                    <TextIcon className="mr-2"/> Insert Text
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
                            onClick={() => handlePageSelect(page.uniqueId)}
                           />
                        ))}
                      </div>
                    </ScrollArea>
                </SortableContext>
              </DndContext>
              
              <div className="flex-1 bg-muted/50 rounded-lg flex flex-col items-center justify-center relative p-4">
                <ScrollArea className="w-full h-full">
                  <div className="flex items-center justify-center w-full h-full p-4">
                    {selectedPageData ? (
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-lg" />
                    ) : (
                        <p className="text-muted-foreground">No page selected</p>
                    )}
                  </div>
                </ScrollArea>
                <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/80 border p-1 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.2, z-0.2))}><ZoomOut className="h-5 w-5"/></Button>
                    <span className="text-sm font-semibold w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z+0.2))}><ZoomIn className="h-5 w-5"/></Button>
                </div>
              </div>
            </div>
        </>
      )}

    </div>
  );
}
