import api from './api.js';

export async function fetchStocks() {
  const { data } = await api.get('/stocks');
  return data;
}
