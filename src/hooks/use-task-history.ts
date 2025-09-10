'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task } from '@/lib/types';

const HISTORY_KEY = 'taskmate-history';

export function useTaskHistory() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(HISTORY_KEY);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error("Failed to load task history:", error);
    }
    setIsLoaded(true);
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'date'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    setTasks(prevTasks => {
      const updatedTasks = [newTask, ...prevTasks];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedTasks));
      } catch (error) {
        console.error("Failed to save task history:", error);
      }
      return updatedTasks;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setTasks([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Failed to clear task history:", error);
    }
  }, []);

  return { tasks, addTask, clearHistory, isLoaded };
}
