import { createRouter, createWebHistory } from 'vue-router'
import StocksPage from '../views/StocksPage.vue'
import IncomesPage from '../views/IncomesPage.vue'
import SalesPage from '../views/SalesPage.vue'
import OrdersPage from '../views/OrdersPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: { name: 'stocks' } },
    {
      path: '/stocks',
      name: 'stocks',
      component: StocksPage,
    },
    {
      path: '/incomes',
      name: 'incomes',
      component: IncomesPage,
    },
    {
      path: '/sales',
      name: 'sales',
      component: SalesPage,
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrdersPage,
    },
  ],
})

export default router
