import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { ApiError } from './composables/useApi'
import { currentUser } from './composables/useAuth'
import { clearSession, loadSession } from './composables/useSession'
import StudioLayout from './layouts/StudioLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/signin', name: 'signin', component: () => import('./views/SignInView.vue'), meta: { public: true } },
    { path: '/setup', name: 'setup', component: () => import('./views/SetupView.vue') },
    {
      path: '/',
      component: StudioLayout,
      children: [
        { path: '', name: 'home', component: () => import('./views/HomeView.vue') },
        { path: 'orders/new', name: 'new-order', component: () => import('./views/NewOrderView.vue') },
        { path: 'orders/:id', name: 'order', component: () => import('./views/OrderView.vue'), props: true },
        { path: 'review', name: 'review', component: () => import('./views/ReviewView.vue') },
        { path: 'invoices/:id', name: 'invoice', component: () => import('./views/InvoiceView.vue'), props: true },
        { path: 'timesheets', name: 'timesheets', component: () => import('./views/TimesheetsView.vue') },
        { path: 'team', name: 'team', component: () => import('./views/TeamView.vue') },
        { path: 'settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
  ],
})

export async function studioGuard(to: RouteLocationNormalized) {
  if (to.meta.public) return true
  const toSignIn = { name: 'signin', query: { next: to.fullPath } }
  if (!(await currentUser())) return toSignIn

  try {
    const session = await loadSession()
    if (!session.team && to.name !== 'setup') return { name: 'setup' }
    if (session.team && to.name === 'setup') return { name: 'home' }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSession()
      return toSignIn
    }
    return { name: 'signin', query: { next: to.fullPath, failed: '1' } }
  }
  return true
}

router.beforeEach(studioGuard)
