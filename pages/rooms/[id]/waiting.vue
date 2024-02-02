<script lang="ts" setup>
import type { rooms } from "@prisma/client";
import { useStorage } from "@vueuse/core";

definePageMeta({
    middleware: ["auth"],
});
const user = useSupabaseUser();
const route = useRoute();
const { data, pending, error } = await useAsyncData("rooms", () => $fetch(`/api/${route.params.id}/details`));
const refresh = () => refreshNuxtData("rooms");
const players = toRaw(data.value as rooms);

const playerInfo = useStorage("player", {
    id: user.value?.id,
    name: user.value?.id,
});
onMounted(async () => {
    const result = useArraySome(players.playerLists, (player: any) => player.id === playerInfo.value.id);
    if (!result.value) {
        await $fetch(`/api/${route.params.id}/add`, {
            method: "PUT",
            body: {
                player: {
                    id: user.value?.id,
                    name: user.value?.id,
                },
            },
        });
        refresh();
    }
});
</script>

<template>
    {{ data }}
    <div v-if="pending"><span class="loading loading-spinner loading-lg"></span></div>
    <div>đây là phòng chờ của {{ $route.params.id }}</div>
    <div class="container px-6 m-auto">
        <div class="grid grid-cols-4 gap-6 md:grid-cols-8 lg:grid-cols-12">
            <div class="flex flex-col items-center col-span-4 gap-5 lg:col-span-6 bg-neutral">
                <p v-for="player in players" class="text-neutral-content">abc</p>
            </div>
            <div class="col-span-4 lg:col-span-6">Column 2/2</div>
        </div>
        <button @click="refresh" class="btn btn-primary">refresh</button>
    </div>
</template>

<style scoped></style>
