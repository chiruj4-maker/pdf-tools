import { TaskHistory } from '@/components/features/task-history';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function HistoryPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Task History</CardTitle>
                <CardDescription>A record of all tasks you have performed.</CardDescription>
            </CardHeader>
            <CardContent>
                <TaskHistory />
            </CardContent>
        </Card>
    );
}
