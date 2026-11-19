<template>
  <div class="tape" aria-hidden="true"></div>
</template>

<style scoped>
.tape {
  height: 14px;
  background-color: var(--ink);
  background-image:
    repeating-linear-gradient(90deg, var(--ground) 0 1.5px, transparent 1.5px 40px),
    repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 8px);
  background-size:
    100% 10px,
    100% 5px;
  background-repeat: no-repeat;
  background-position:
    left bottom,
    left bottom;
}

@media print {
  .tape {
    display: none;
  }
}
</style>
