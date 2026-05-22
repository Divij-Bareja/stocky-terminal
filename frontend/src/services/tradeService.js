import api from './api.js';

export async function buyStock(stockId, quantity, userId) {
  if (userId == null) {
    throw new Error('Authenticated user is required');
  }
  const { data } = await api.post('/trade/buy', {
    userId,
    stockId,
    quantity,
  });
  return data;
}

export async function sellStock(stockId, quantity, userId) {
  if (userId == null) {
    throw new Error('Authenticated user is required');
  }
  const { data } = await api.post('/trade/sell', {
    userId,
    stockId,
    quantity,
  });
  return data;
}
