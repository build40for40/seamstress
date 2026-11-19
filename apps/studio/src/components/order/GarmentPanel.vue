<script setup lang="ts">
import { GARMENT_STATUSES, type GarmentStatus } from '@seamless/shared'
import { computed, ref } from 'vue'
import type { GarmentCard, OrderDetail, OrderMember, OwnerPhoto } from '@/api-types'
import AssigneePicker from '@/components/AssigneePicker.vue'
import MemberInitials from '@/components/MemberInitials.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import PhotoTile from '@/components/PhotoTile.vue'
import PhotoUploadButton from '@/components/PhotoUploadButton.vue'
import { api, errorMessage } from '@/composables/useApi'
import { toast } from '@/composables/useToast'
import { formatMinutes } from '@/lib/format'
import { GARMENT_STAGE_LABELS } from '@/lib/labels'

const props = defineProps<{ garment: GarmentCard; photos: OwnerPhoto[]; members: OrderMember[] }>()
const emit = defineEmits<{ changed: [detail: OrderDetail]; photo: [photo: OwnerPhoto] }>()

const editingPeople = ref(false)
const editingBrief = ref(false)
const people = ref<string[]>([])
const brief = ref('')
const busy = ref(false)

const activeMembers = computed(() => props.members.filter((member) => !member.removed))
const memberName = (id: string) => props.members.find((member) => member.id === id)?.name

async function save(request: () => Promise<OrderDetail>, done?: () => void) {
  busy.value = true
  try {
    emit('changed', await request())
    done?.()
  } catch (error) {
    toast(errorMessage(error), { tone: 'error' })
  } finally {
    busy.value = false
  }
}

function setStage(event: Event) {
  const status = (event.target as HTMLSelectElement).value as GarmentStatus
  void save(() => api<OrderDetail>(`/garments/${props.garment.id}`, { method: 'PATCH', json: { status } }))
}

function startPeople() {
  people.value = props.garment.assignees.map((assignee) => assignee.memberId)
  editingPeople.value = true
}

function savePeople() {
  void save(
    () => api<OrderDetail>(`/garments/${props.garment.id}/assignees`, { method: 'PUT', json: { memberIds: people.value } }),
    () => (editingPeople.value = false),
  )
}

function startBrief() {
  brief.value = props.garment.description
  editingBrief.value = true
}

function saveBrief() {
  if (!brief.value.trim()) return
  void save(
    () => api<OrderDetail>(`/garments/${props.garment.id}`, { method: 'PATCH', json: { description: brief.value.trim() } }),
    () => (editingBrief.value = false),
  )
}
</script>

<template>
  <article class="card stack garment">
    <div class="spread">
      <div class="row">
        <span class="sewn-label">{{ garment.ref }}</span>
        <span class="small muted num">{{ formatMinutes(garment.minutes) }} logged</span>
      </div>
      <label class="stage">
        <span class="visually-hidden">Stage of {{ garment.ref }}</span>
        <select :value="garment.status" :disabled="busy" @change="setStage">
          <option v-for="stage in GARMENT_STATUSES" :key="stage" :value="stage">{{ GARMENT_STAGE_LABELS[stage] }}</option>
        </select>
      </label>
    </div>

    <div v-if="editingBrief" class="stack">
      <textarea v-model="brief" :aria-label="`What ${garment.ref} needs`"></textarea>
      <div class="row">
        <button type="button" class="btn btn-small" :disabled="busy || !brief.trim()" @click="saveBrief">Save</button>
        <button type="button" class="btn-link small" @click="editingBrief = false">Cancel</button>
      </div>
    </div>
    <div v-else class="brief">
      <p>{{ garment.description }}</p>
      <button type="button" class="btn-link small" @click="startBrief">Edit</button>
    </div>

    <div class="stack people">
      <div class="spread">
        <div class="row">
          <MemberInitials :names="garment.assignees.map((assignee) => assignee.name)" />
          <span class="small">{{ garment.assignees.map((assignee) => assignee.name).join(', ') }}</span>
        </div>
        <button v-if="!editingPeople" type="button" class="btn-link small" @click="startPeople">Change who</button>
      </div>
      <template v-if="editingPeople">
        <AssigneePicker v-model="people" :members="activeMembers" />
        <div class="row">
          <button type="button" class="btn btn-small" :disabled="busy" @click="savePeople">Save</button>
          <button type="button" class="btn-link small" @click="editingPeople = false">Cancel</button>
        </div>
      </template>
    </div>

    <PhotoGrid v-if="photos.length">
      <PhotoTile v-for="photo in photos" :key="photo.id" :photo="photo" :by="memberName(photo.memberId)" show-review />
    </PhotoGrid>
    <PhotoUploadButton :garment-id="garment.id" @uploaded="emit('photo', $event)" />
  </article>
</template>

<style scoped>
.stage select {
  width: auto;
  min-width: 9rem;
}

.brief {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.brief p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.people {
  padding-top: 0.5rem;
  border-top: 2px dashed var(--line-soft);
}
</style>
