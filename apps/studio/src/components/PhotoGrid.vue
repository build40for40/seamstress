<template>
  <div class="photo-grid"><slot /></div>
</template>

<style scoped>
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.75rem;
}
</style>
