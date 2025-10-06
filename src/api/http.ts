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
    const params = new URLSearchParams(config.params as Record<string, string> | undefined);

    if (!params.has('key') && apiKey) params.set('key', apiKey);
    if (!params.has('page')) params.set('page', String(defaultPage));
    if (!params.has('limit')) params.set('limit', String(defaultLimit));

    config.params = Object.fromEntries(params.entries());
    return config;
  });

  return instance;
}

export const http = createHttpClient();