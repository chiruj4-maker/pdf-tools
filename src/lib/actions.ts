'use server';

import { suggestTasks, SuggestTasksInput } from '@/ai/flows/smart-task-suggestion';

export async function getSmartSuggestions(input: SuggestTasksInput) {
    try {
        const result = await suggestTasks(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error getting smart suggestions:", error);
        return { success: false, error: "Failed to get suggestions from AI." };
    }
}
