import { QrCodeGenerator } from "@/components/features/qr-code-generator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function QrCodeGeneratorPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">QR Code Generator</CardTitle>
                <CardDescription>Generate a QR code from any URL for easy sharing.</CardDescription>
            </CardHeader>
            <CardContent>
                <QrCodeGenerator />
            </CardContent>
        </Card>
    );
}
