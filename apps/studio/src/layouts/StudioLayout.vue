<template>
  <header class="studio-header">
    <RouterLink :to="{ name: 'home' }" class="brand">Seamless</RouterLink>
    <nav>
      <RouterLink :to="{ name: 'review' }">Review</RouterLink>
      <RouterLink :to="{ name: 'timesheets' }">Timesheets</RouterLink>
      <RouterLink :to="{ name: 'team' }">Team</RouterLink>
      <RouterLink :to="{ name: 'settings' }">Settings</RouterLink>
    </nav>
  </header>
  <main class="studio-main">
    <RouterView />
  </main>
</template>

<style scoped>
.studio-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  align-items: baseline;
  padding: 1rem;
}

.brand {
  font-weight: 700;
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.studio-main {
  padding: 0 1rem 2rem;
}

@media print {
  .studio-header {
    display: none;
  }
}
</style>
