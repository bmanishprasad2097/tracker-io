import api from './client';
import type { Topic, TopicCreate, TopicUpdate } from '../types';

export const createTopic = async (roadmapId: string, payload: TopicCreate): Promise<Topic> => {
  const { data } = await api.post(`/api/roadmaps/${roadmapId}/topics`, payload);
  return data;
};

export const updateTopic = async (id: string, payload: TopicUpdate): Promise<Topic> => {
  const { data } = await api.patch(`/api/topics/${id}`, payload);
  return data;
};

export const deleteTopic = async (id: string): Promise<void> => {
  await api.delete(`/api/topics/${id}`);
};
