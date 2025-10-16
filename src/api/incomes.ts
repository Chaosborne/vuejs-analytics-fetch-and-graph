import { http } from './http';

export type IncomesParams = {
  dateFrom?: string; // 'YYYY-MM-DD'
  dateTo?: string;   // опционально, incomes обычно за текущий день
  page?: number;
  limit?: number;
  key?: string;
};

export type IncomeItem = {
  date: string
  last_change_date: string
  supplier_article: string
  tech_size: string
  barcode: number
  quantity: number
  price: string
  discount: string
  warehouse_name: string
  nm_id: number
  subject: string
  category: string
  brand: string
  sc_code: number
}

export async function fetchIncomes(params: IncomesParams = {}) {
  // Временно используем stocks endpoint для демонстрации функциональности
  // TODO: Разобраться с правильными параметрами для incomes API
  const response = await http.get('/api/stocks', { params });
  return response.data;
}
