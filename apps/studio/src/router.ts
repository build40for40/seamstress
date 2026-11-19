import { createRouter, createWebHistory } from 'vue-router'
import StudioLayout from './layouts/StudioLayout.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
