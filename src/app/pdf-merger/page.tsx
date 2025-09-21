import { PdfMerger } from "@/components/features/pdf-merger";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PdfMergerPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">PDF Merger</CardTitle>
                <CardDescription>Combine multiple PDF files into a single document.</CardDescription>
            </CardHeader>
            <CardContent>
                <PdfMerger />
            </CardContent>
        </Card>
    );
}
