import api from './api.js';

export async function fetchPortfolio(userId) {
  if (userId == null) {
    throw new Error('Authenticated user is required');
  }
  const { data } = await api.get(`/portfolio/${userId}`);
  return data;
}
