import { PdfToImageConverter } from "@/components/features/pdf-to-image-converter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PdfToImagePage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">PDF to Image Converter</CardTitle>
                <CardDescription>Convert pages from a PDF document into image files.</CardDescription>
            </CardHeader>
            <CardContent>
                <PdfToImageConverter />
            </CardContent>
        </Card>
    );
}
