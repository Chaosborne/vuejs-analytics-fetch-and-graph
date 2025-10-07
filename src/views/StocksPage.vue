<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { fetchStocks } from '@/api/stocks'
import { BarChart } from 'vue-chart-3'
import 'chart.js/auto'

type StockItem = {
  date: string
  last_change_date: string
  supplier_article: string
  tech_size: string
  barcode: number
  quantity: number
  is_supply: boolean
  is_realization: boolean
  quantity_full: number
  warehouse_name: string
  in_way_to_client: number
  in_way_from_client: number
  nm_id: number
  subject: string
  category: string
  brand: string
  sc_code: number
  price: string 
  discount: string
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const items = ref<StockItem[]>([])

function parseEnvNumber(raw: unknown, { min, max, fallback }: { min: number; max?: number; fallback: number }) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  const lower = Math.max(min, n)
  return max !== undefined ? Math.min(max, lower) : lower
}
const page = ref<number>(parseEnvNumber(import.meta.env.VITE_API_DEFAULT_PAGE, { min: 1, fallback: 1 }))
const limit = ref<number>(parseEnvNumber(import.meta.env.VITE_API_DEFAULT_LIMIT, { min: 1, max: 500, fallback: 100 }))

// key убран

// Фильтры: brand и warehouse_name
const selectedBrand = ref<string>('')
const selectedWarehouse = ref<string>('')

function formatDateToYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const today = new Date()
const dateFrom = ref<string>(formatDateToYmd(today))

// Доступные значения для фильтров
const availableBrands = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) if (it.brand) set.add(it.brand)
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const availableWarehouses = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) if (it.warehouse_name) set.add(it.warehouse_name)
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

// Клиентская фильтрация текущей страницы
const filteredItems = computed(() => {
  return items.value.filter(it => {
    const brandOk = !selectedBrand.value || it.brand === selectedBrand.value
    const whOk = !selectedWarehouse.value || it.warehouse_name === selectedWarehouse.value
    return brandOk && whOk
  })
})

// Данные для графика: брендов по сумме quantity_full (по отфильтрованным данным)
const topBrandsData = computed(() => {
  const totals = new Map<string, number>()
  for (const it of filteredItems.value) {
    const current = totals.get(it.brand) ?? 0
    totals.set(it.brand, current + (Number(it.quantity_full) || 0))
  }
  const entries = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return {
    labels: entries.map(([brand]) => brand),
    datasets: [
      {
        label: 'Quantity by Brand',
        data: entries.map(([, sum]) => sum),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  }
})

const chartOptions = computed(() => {
  const shownCount = topBrandsData.value.labels.length
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMin: 0,
        ticks: {
          precision: 0,
          stepSize: 1,
          callback: (value: number | string) => {
            const num = typeof value === 'string' ? Number(value) : value
            return Number.isInteger(num) ? num : ''
          },
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: `Топ брендов по quantity_full на текущей странице (показано ${shownCount} из 10)` ,
        font: { size: 14, weight: '600' },
        padding: { top: 8, bottom: 12 },
        // align: 'start',
      },
      subtitle: {
        display: true,
        text: 'Количество столбцов равно числу уникальных брендов на текущей странице, но не больше 10',
        font: { size: 12, weight: '400' },
        padding: { bottom: 8 },
        // align: 'start',
      },
      legend: {
        position: 'top',
        // align: 'start',
        fullWidth: true,
        labels: {
          textAlign: 'left',
        },
      },
    },
  }
})

async function loadStocks() {
  loading.value = true
  errorMessage.value = null
  try {
    const data = await fetchStocks({
      dateFrom: dateFrom.value,
      page: page.value,
      limit: limit.value,
    })

    items.value = Array.isArray(data?.data) ? (data.data as StockItem[]) : (data as StockItem[])
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Failed to load stocks'
  } finally {
    loading.value = false
  }
}

function submitFilters() {
  page.value = 1
  loadStocks()
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
    loadStocks()
  }
}

function nextPage() {
  page.value += 1
  loadStocks()
}

watch(limit, () => {
  page.value = 1
  loadStocks()
})

onMounted(() => {
  loadStocks()
})
</script>

<template>
  <section>
    <h1>Stocks</h1>

    <form class="filters" @submit.prevent="submitFilters">
      
      <label>
        brand
        <select v-model="selectedBrand">
          <option value="">Все</option>
          <option v-for="b in availableBrands" :key="b" :value="b">{{ b }}</option>
        </select>
      </label>
      <label>
        warehouse
        <select v-model="selectedWarehouse">
          <option value="">Все</option>
          <option v-for="w in availableWarehouses" :key="w" :value="w">{{ w }}</option>
        </select>
      </label>
      <label>
        limit
        <input type="number" v-model.number="limit" min="1" max="500" step="1" />
      </label>
      <button type="submit">Apply</button>
    </form>

    <div class="data-note">Данные на сегодня</div>

    <div class="chart-wrap">
      <BarChart :chart-data="topBrandsData" :options="chartOptions" />
    </div>

    <div class="actions">
      <button :disabled="loading || page === 1" @click="prevPage">Prev</button>
      <span>Page: {{ page }}</span>
      <button :disabled="loading" @click="nextPage">Next</button>
    </div>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div class="table-wrap">
      <table v-show="!errorMessage && filteredItems.length" class="data-table">
      <thead>
        <tr>
          <th>date</th>
          <th>last_change_date</th>
          <th>supplier_article</th>
          <th>tech_size</th>
          <th>barcode</th>
          <th>quantity</th>
          <th>quantity_full</th>
          <th>warehouse_name</th>
          <th>in_way_to_client</th>
          <th>in_way_from_client</th>
          <th>nm_id</th>
          <th>subject</th>
          <th>category</th>
          <th>brand</th>
          <th>price</th>
          <th>discount</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in filteredItems" :key="idx">
          <td>{{ row.date }}</td>
          <td>{{ row.last_change_date }}</td>
          <td>{{ row.supplier_article }}</td>
          <td>{{ row.tech_size }}</td>
          <td>{{ row.barcode }}</td>
          <td>{{ row.quantity }}</td>
          <td>{{ row.quantity_full }}</td>
          <td>{{ row.warehouse_name }}</td>
          <td>{{ row.in_way_to_client }}</td> 
          <td>{{ row.in_way_from_client }}</td>
          <td>{{ row.nm_id }}</td>
          <td>{{ row.subject }}</td>
          <td>{{ row.category }}</td>
          <td>{{ row.brand }}</td>
          <td>{{ row.price }}</td>
          <td>{{ row.discount }}</td>
        </tr>
      </tbody>
      </table>

      <p v-show="!errorMessage && !filteredItems.length" class="no-data">Нет данных</p>

      <div v-if="loading" class="loading-overlay">Loading...</div>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.filters label {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
}
.table-wrap {
  position: relative;
  min-height: 240px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.08);
  font-weight: 600;
  pointer-events: none;
}

.no-data {
  margin-top: 1rem;
}


.data-table th,
.data-table td {
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.5rem;
  font-size: 0.9rem;
}

.error {
  color: #b00020;
  margin-bottom: 0.5rem;
}

.data-note {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0.25rem 0 0.25rem;
}

.chart-wrap {
  position: relative;
  height: 390px;
  margin: 1.25rem 0;
}

/* гарантируем, что canvas не абсолютный и занимает высоту контейнера */
.chart-wrap :deep(canvas) {
  display: block;
  position: relative !important;
  height: 100% !important;
}
</style>


