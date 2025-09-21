import { PdfEditor } from "@/components/features/pdf-editor";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PdfEditorPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">PDF Editor</CardTitle>
                <CardDescription>Perform basic edits on your PDF documents like deleting, rotating, and reordering pages.</CardDescription>
            </CardHeader>
            <CardContent>
                <PdfEditor />
            </CardContent>
        </Card>
    );
}
