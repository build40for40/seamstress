import { createRouter, createWebHashHistory } from 'vue-router'
import { memberKey } from './composables/useMemberKey'
import WorkroomLayout from './layouts/WorkroomLayout.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/k/:key', name: 'key', component: () => import('./views/KeyView.vue'), meta: { public: true } },
    { path: '/no-key', name: 'no-key', component: () => import('./views/NoKeyView.vue'), meta: { public: true } },
    {
      path: '/',
      component: WorkroomLayout,
      children: [
        { path: '', name: 'my-orders', component: () => import('./views/MyOrdersView.vue') },
        { path: 'garments/:id', name: 'garment', component: () => import('./views/GarmentView.vue'), props: true },
        { path: 'timesheet', name: 'timesheet', component: () => import('./views/TimesheetView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !memberKey()) return { name: 'no-key', replace: true }
})
