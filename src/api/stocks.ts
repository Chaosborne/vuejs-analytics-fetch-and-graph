import { http } from './http';

export type StocksParams = {
  dateFrom?: string; // 'YYYY-MM-DD'
  dateTo?: string;   // опционально, stocks обычно за текущий день
  page?: number;
  limit?: number;
  key?: string;
};

export async function fetchStocks(params: StocksParams = {}) {
  const response = await http.get('/api/stocks', { params });
  return response.data;
}