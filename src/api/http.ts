import axios from 'axios';
import type { AxiosInstance } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL as string;
const apiKey = import.meta.env.VITE_API_KEY as string;
const defaultPage = Number(import.meta.env.VITE_API_DEFAULT_PAGE ?? 1);
const defaultLimit = Number(import.meta.env.VITE_API_DEFAULT_LIMIT ?? 100);

function createHttpClient(): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
  });

  instance.interceptors.request.use((config) => {
    const rawParams = (config.params ?? {}) as Record<string, unknown>

    // Собираем финальные параметры, отфильтровывая undefined/пустые строки
    const finalParams: Record<string, string> = {}
    for (const [k, v] of Object.entries(rawParams)) {
      if (v === undefined || v === null) continue
      const str = String(v)
      if (str === '' || str === 'undefined' || str === 'null') continue
      finalParams[k] = str
    }

    // Гарантируем наличие ключевых параметров
    if (!('key' in finalParams) && apiKey) finalParams.key = apiKey
    if (!('page' in finalParams)) finalParams.page = String(defaultPage)
    if (!('limit' in finalParams)) finalParams.limit = String(defaultLimit)

    config.params = finalParams
    return config;
  });

  return instance;
}

export const http = createHttpClient();