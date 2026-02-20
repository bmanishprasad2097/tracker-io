import api from './client';
import type { Task, TaskCreate, TaskUpdate } from '../types';

export const createTask = async (topicId: string, payload: TaskCreate): Promise<Task> => {
  const { data } = await api.post(`/api/topics/${topicId}/tasks`, payload);
  return data;
};

export const updateTask = async (id: string, payload: TaskUpdate): Promise<Task> => {
  const { data } = await api.patch(`/api/tasks/${id}`, payload);
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/api/tasks/${id}`);
};
