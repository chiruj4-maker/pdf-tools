import { PdfCompressor } from "@/components/features/pdf-compressor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PdfCompressorPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">PDF Compressor</CardTitle>
                <CardDescription>Reduce the file size of your PDF documents.</CardDescription>
            </CardHeader>
            <CardContent>
                <PdfCompressor />
            </CardContent>
        </Card>
    );
}
