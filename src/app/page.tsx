import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SmartTaskSuggester } from "@/components/features/smart-task-suggester";
import Link from "next/link";
import { FileImage, Scaling, QrCode, FilePlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tools = [
  {
    title: "PDF to Image",
    href: "/pdf-to-image",
    icon: FileImage,
    description: "Convert PDF pages into high-quality images."
  },
  {
    title: "Image Resizer",
    href: "/image-resizer",
    icon: Scaling,
    description: "Easily resize your images to any dimension."
  },
  {
    title: "QR Code Generator",
    href: "/qr-code-generator",
    icon: QrCode,
    description: "Create QR codes from URLs for quick sharing."
  },
  {
    title: "Image to PDF",
    href: "/image-to-pdf",
    icon: FilePlus,
    description: "Combine multiple images into a single PDF."
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Welcome to TaskMate</h1>
        <p className="text-muted-foreground">Your all-in-one productivity toolbox.</p>
      </div>
      
      <SmartTaskSuggester />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-headline">Tools</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool) => (
            <Card key={tool.title} className="flex flex-col hover:border-primary transition-colors">
              <CardHeader className="flex-row items-center gap-4 space-y-0 pb-2">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <tool.icon className="w-6 h-6" />
                </div>
                <CardTitle className="font-headline">{tool.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
              <CardFooter>
                 <Button asChild variant="ghost" className="w-full justify-start text-primary hover:text-primary">
                    <Link href={tool.href}>
                        Open Tool <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                 </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
