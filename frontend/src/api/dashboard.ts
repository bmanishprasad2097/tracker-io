import api from './client';
import type { DashboardStats } from '../types';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get('/api/dashboard/stats');
  return data;
};
