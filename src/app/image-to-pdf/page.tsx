import { ImageToPdfConverter } from "@/components/features/image-to-pdf-converter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ImageToPdfPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Image to PDF Converter</CardTitle>
                <CardDescription>Combine one or more images into a single PDF document.</CardDescription>
            </CardHeader>
            <CardContent>
                <ImageToPdfConverter />
            </CardContent>
        </Card>
    );
}
