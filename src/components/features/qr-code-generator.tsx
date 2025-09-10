'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTaskHistory } from '@/hooks/use-task-history';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { QrCode, Download, Link as LinkIcon, Check, Loader2 } from 'lucide-react';

export function QrCodeGenerator() {
  const [url, setUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addTask } = useTaskHistory();
  const { toast } = useToast();

  const generateQrCode = () => {
    if (!url.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a URL.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const generatedUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    
    // The API is fast, but simulating a load gives better UX
    setTimeout(() => {
        setQrCodeUrl(generatedUrl);
        addTask({
            name: 'QR Code Generation',
            details: `Generated for URL: ${url.substring(0, 50)}${url.length > 50 ? '...' : ''}`,
            status: 'completed',
        });
        toast({
            title: 'Success!',
            description: 'QR Code generated.',
            action: <div className="p-1 rounded-md bg-primary text-primary-foreground"><Check /></div>
        })
        setIsLoading(false);
    }, 500);
  };

  const handleDownload = async () => {
    if (!qrCodeUrl) return;
    try {
        const response = await fetch(qrCodeUrl);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `qrcode-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        toast({
            title: 'Download Failed',
            description: 'Could not download the QR code.',
            variant: 'destructive',
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-grow">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button onClick={generateQrCode} disabled={isLoading || !url.trim()} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <QrCode className="mr-2 h-4 w-4" />}
            {isLoading ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {(isLoading || qrCodeUrl) && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in-50 duration-500">
            <Card className="p-4 inline-block shadow-lg bg-card">
                {isLoading ? (
                    <div className="w-[250px] h-[250px] flex items-center justify-center bg-muted rounded-md">
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Image
                        src={qrCodeUrl}
                        alt="Generated QR Code"
                        width={250}
                        height={250}
                        className="rounded-md"
                        unoptimized // QR server doesn't need optimization
                        data-ai-hint="qr code"
                    />
                )}
            </Card>
            <Button onClick={handleDownload} variant="secondary" disabled={isLoading || !qrCodeUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download PNG
            </Button>
        </div>
      )}
    </div>
  );
}
