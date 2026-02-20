import api from './client';
import type { RoadmapCreate, RoadmapDetail, RoadmapListItem, RoadmapUpdate } from '../types';

export const getRoadmaps = async (): Promise<RoadmapListItem[]> => {
  const { data } = await api.get('/api/roadmaps');
  return data;
};

export const getRoadmap = async (id: string): Promise<RoadmapDetail> => {
  const { data } = await api.get(`/api/roadmaps/${id}`);
  return data;
};

export const createRoadmap = async (payload: RoadmapCreate): Promise<RoadmapListItem> => {
  const { data } = await api.post('/api/roadmaps', payload);
  return data;
};

export const updateRoadmap = async (id: string, payload: RoadmapUpdate): Promise<RoadmapListItem> => {
  const { data } = await api.patch(`/api/roadmaps/${id}`, payload);
  return data;
};

export const deleteRoadmap = async (id: string): Promise<void> => {
  await api.delete(`/api/roadmaps/${id}`);
};
