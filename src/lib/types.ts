export type Task = {
  id: string;
  name: string;
  date: string;
  details: string;
  status: 'completed' | 'failed';
};
