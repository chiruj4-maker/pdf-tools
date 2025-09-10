'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSmartSuggestions } from '@/lib/actions';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

type SuggestionState = {
  suggestedActions: string[];
  reasoning: string;
} | null;

export function SmartTaskSuggester() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestionState>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await getSmartSuggestions({ input: inputValue });

    if (response.success && response.data) {
      setResult({
        suggestedActions: response.data.suggestedActions,
        reasoning: response.data.reasoning,
      });
    } else {
      setError(response.error || 'An unknown error occurred.');
    }

    setIsLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            <CardTitle className="font-headline">Smart Task Suggester</CardTitle>
        </div>
        <CardDescription>
          Paste a URL or type a file name (e.g., "my_document.pdf") and let AI suggest what you can do.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="e.g., https://example.com or presentation.pptx"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} className="w-full sm:w-auto">
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles className="mr-2" />
            )}
            Suggest
          </Button>
        </form>
        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {result && (
            <div className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
                <div>
                    <h3 className="font-semibold mb-2">Suggested Actions:</h3>
                    <div className="flex flex-wrap gap-2">
                        {result.suggestions.map((action, index) => (
                            <Badge key={index} variant="secondary" className="text-base px-3 py-1 bg-primary/10 text-primary-foreground border-primary/20">
                                {action}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Reasoning:</h3>
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md border">
                        {result.reasoning}
                    </p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
