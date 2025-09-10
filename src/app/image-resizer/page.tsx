import { ImageResizer } from "@/components/features/image-resizer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ImageResizerPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Image Resizer</CardTitle>
                <CardDescription>Resize images by specifying dimensions or percentage.</CardDescription>
            </CardHeader>
            <CardContent>
                <ImageResizer />
            </CardContent>
        </Card>
    );
}
