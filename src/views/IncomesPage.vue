<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { fetchIncomes, type IncomeItem } from '@/api/incomes'
import { BarChart } from 'vue-chart-3'
import 'chart.js/auto'

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const items = ref<IncomeItem[]>([])

function parseEnvNumber(raw: unknown, { min, max, fallback }: { min: number; max?: number; fallback: number }) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  const lower = Math.max(min, n)
  return max !== undefined ? Math.min(max, lower) : lower
}
const page = ref<number>(parseEnvNumber(import.meta.env.VITE_API_DEFAULT_PAGE, { min: 1, fallback: 1 }))
const limit = ref<number>(parseEnvNumber(import.meta.env.VITE_API_DEFAULT_LIMIT, { min: 1, max: 500, fallback: 100 }))

// Фильтры: brand, warehouse_name, category
const selectedBrand = ref<string>('')
const selectedWarehouse = ref<string>('')
const selectedCategory = ref<string>('')

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

const availableCategories = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) if (it.category) set.add(it.category)
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

// Клиентская фильтрация текущей страницы
const filteredItems = computed(() => {
  return items.value.filter(it => {
    const brandOk = !selectedBrand.value || it.brand === selectedBrand.value
    const whOk = !selectedWarehouse.value || it.warehouse_name === selectedWarehouse.value
    const catOk = !selectedCategory.value || it.category === selectedCategory.value
    return brandOk && whOk && catOk
  })
})

// Окно страниц для числовой пагинации (без знания total)
const pagesWindow = computed(() => {
  const windowSize = 5
  const half = Math.floor(windowSize / 2)
  const start = Math.max(1, page.value - half)
  const end = page.value + half
  const pages: number[] = []
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
})

const firstPageInWindow = computed<number>(() => (pagesWindow.value.length ? pagesWindow.value[0]! : 1))
const hasLeading = computed(() => firstPageInWindow.value > 1)

// Данные для графика: доходы по складам (по отфильтрованным данным)
const warehouseIncomesData = computed(() => {
  const totals = new Map<string, number>()
  for (const it of filteredItems.value) {
    const income = (Number(it.price) || 0) * (Number(it.quantity) || 0)
    const current = totals.get(it.warehouse_name) ?? 0
    totals.set(it.warehouse_name, current + income)
  }
  const entries = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return {
    labels: entries.map(([warehouse]) => warehouse),
    datasets: [
      {
        label: 'Доходы по складам',
        data: entries.map(([, sum]) => sum),
        backgroundColor: 'hsl(207, 70%, 40%)',
        hoverBackgroundColor: 'hsl(207, 82%, 42%)',
      },
    ],
  }
})

const chartOptions = computed(() => {
  const shownCount = warehouseIncomesData.value.labels.length
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        suggestedMin: 0,
        grid: {
          color: 'rgba(255,255,255,0.03)',
        },
        ticks: {
          precision: 0,
          callback: (value: number | string) => {
            const num = typeof value === 'string' ? Number(value) : value
            return Number.isFinite(num) ? `${num.toLocaleString()} ₽` : ''
          },
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: `Доходы по складам на текущей странице (показано ${shownCount} из 10)`,
        font: { size: 14, weight: '600' },
        padding: { top: 8, bottom: 12 },
      },
      subtitle: {
        display: true,
        text: 'Количество столбцов равно числу уникальных складов на текущей странице, но не больше 10',
        font: { size: 12, weight: '400' },
        padding: { bottom: 8 },
      },
      legend: {
        position: 'top',
        fullWidth: true,
        labels: {
          textAlign: 'left',
        },
      },
    },
  }
})

async function loadIncomes() {
  loading.value = true
  errorMessage.value = null
  try {
    const data = await fetchIncomes({
      dateFrom: dateFrom.value,
      page: page.value,
      limit: limit.value,
    })

    items.value = Array.isArray(data?.data) ? (data.data as IncomeItem[]) : (data as IncomeItem[])
  } catch (err: any) {
    errorMessage.value = err?.message ?? 'Failed to load incomes'
  } finally {
    loading.value = false
  }
}

function submitFilters() {
  page.value = 1
  loadIncomes()
}

function prevPage() {
  if (page.value > 1) {
    page.value -= 1
    loadIncomes()
  }
}

function nextPage() {
  page.value += 1
  loadIncomes()
}

function goToPage(p: number) {
  if (p < 1 || p === page.value) return
  page.value = p
  loadIncomes()
}

watch(limit, () => {
  page.value = 1
  loadIncomes()
})

onMounted(() => {
  loadIncomes()
})
</script>

<template>
  <section>
    <h1>Incomes</h1>

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
        category
        <select v-model="selectedCategory">
          <option value="">Все</option>
          <option v-for="c in availableCategories" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
      <label>
        limit
        <input type="number" v-model.number="limit" min="1" max="500" step="1" />
      </label>
      <button class="submit-btn" type="submit">Apply</button>
    </form>

    <div class="data-note">Доходы на сегодня</div>

    <div class="chart-wrap">
      <BarChart :chart-data="warehouseIncomesData" :options="chartOptions" />
    </div>

    <div class="actions">
      <button class="pg" :disabled="loading || page === 1" @click="prevPage">Prev</button>
      <div class="pages">
        <template v-if="hasLeading">
          <button class="pg" :disabled="loading || page === 1" @click="goToPage(1)">1</button>
          <span class="dots">...</span>
        </template>
        <button class="pg" v-for="p in pagesWindow" :key="p" :class="{ active: p === page }" :disabled="loading || p === page" @click="goToPage(p)">{{ p }}</button>
      </div>
      <button class="pg" :disabled="loading" @click="nextPage">Next</button>
    </div>

    <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    <div class="table-wrap">
      <div class="table-scroll" v-show="!errorMessage && filteredItems.length">
        <table class="data-table">
          <thead>
            <tr>
              <th>date</th>
              <th>last_change_date</th>
              <th>supplier_article</th>
              <th>tech_size</th>
              <th>barcode</th>
              <th>quantity</th>
              <th>price</th>
              <th>discount</th>
              <th>warehouse_name</th>
              <th>nm_id</th>
              <th>subject</th>
              <th>category</th>
              <th>brand</th>
              <th>sc_code</th>
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
              <td>{{ row.price }}</td>
              <td>{{ row.discount }}</td>
              <td>{{ row.warehouse_name }}</td>
              <td>{{ row.nm_id }}</td>
              <td>{{ row.subject }}</td>
              <td>{{ row.category }}</td>
              <td>{{ row.brand }}</td>
              <td>{{ row.sc_code }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="responsive-cards" v-show="!errorMessage && filteredItems.length">
        <article class="card" v-for="(row, idx) in filteredItems" :key="`c-` + idx">
          <div class="card-row"><span class="k">date</span><span class="v">{{ row.date }}</span></div>
          <div class="card-row"><span class="k">brand</span><span class="v">{{ row.brand }}</span></div>
          <div class="card-row"><span class="k">supplier_article</span><span class="v">{{ row.supplier_article }}</span></div>
          <div class="card-row"><span class="k">warehouse_name</span><span class="v">{{ row.warehouse_name }}</span></div>
          <div class="card-row"><span class="k">price</span><span class="v">{{ row.price }}</span></div>
          <div class="card-row"><span class="k">quantity</span><span class="v">{{ row.quantity }}</span></div>
          <div class="card-row"><span class="k">nm_id</span><span class="v">{{ row.nm_id }}</span></div>
          <div class="card-row"><span class="k">subject</span><span class="v">{{ row.subject }}</span></div>
        </article>
      </div>

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

.submit-btn {
  height: 22px;
  background-color:  #00bd7e;
  color: #FFFFFF;
  border: none;
}

.filters {
  display: grid;
  align-items: end;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
.actions .pages { display: inline-flex; align-items: center; gap: 0.25rem; }
.actions .pg {
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: inherit;
}
.actions .pg.active { background: var(--color-border); }
.actions .dots { opacity: 0.6; padding: 0 0.25rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
}
.data-table thead th {
  position: sticky;
  top: 0;
  background: var(--color-background);
  z-index: 2;
}
.data-table th:first-child,
.data-table td:first-child {
  position: sticky;
  left: 0;
  background: var(--color-background);
  z-index: 4;
  border-right: none;
  transform: translateX(-1px);
  background-clip: padding-box;
}
.data-table th:first-child { z-index: 5; }

.table-wrap {
  position: relative;
  min-height: 240px;
}

.table-scroll {
  overflow-x: auto;
  background: var(--color-background);
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

.responsive-cards { display: none; }
.responsive-cards .card {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.6rem 0.7rem;
  margin-top: 0.75rem;
}
.responsive-cards .card-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 0.5rem;
  padding: 0.15rem 0;
}
.responsive-cards .k { opacity: 0.8; }
.responsive-cards .v { text-align: right; }

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
  margin-top: 1.25rem;
  margin-bottom: 3rem;
}

.chart-wrap :deep(canvas) {
  display: block;
  position: relative !important;
  height: 100% !important;
}

@media (max-width: 768px) {
  .table-scroll { display: none; }
  .responsive-cards { display: block; }
}
</style>
