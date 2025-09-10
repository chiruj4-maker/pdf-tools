'use client';
import { UploadCloud } from "lucide-react";
import React, { useCallback } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  className?: string;
}

export function FileDropzone({ onFilesAdded, accept, multiple = false, className }: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    onFilesAdded(acceptedFiles);
    if(fileRejections.length > 0) {
        console.warn('Some files were rejected:', fileRejections);
    }
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
        "border-border hover:border-primary",
        isDragActive && "border-primary bg-primary/10",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <UploadCloud className="w-10 h-10" />
        {isDragActive ? (
          <p className="font-semibold text-primary">Drop the files here ...</p>
        ) : (
          <p>Drag & drop some files here, or <span className="font-semibold text-primary">click to select files</span></p>
        )}
      </div>
    </div>
  );
}
