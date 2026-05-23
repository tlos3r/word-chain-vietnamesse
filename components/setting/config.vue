<script lang="ts" setup>
import { useStorage } from "@vueuse/core";
const soundEnabled = useStorage("soundEnabled", true);
const colorScheme = useStorage<"light" | "dark">("vueuse-color-scheme", "dark");
const isDark = computed({
    get: () => colorScheme.value !== "light",
    set: (value) => {
        colorScheme.value = value ? "dark" : "light";
    },
});
const supabase = useSupabaseClient();
const route = useRoute();
const user = useSupabaseUser();
const anonymousPlayer = useAnonymousPlayer();
const resettingSession = ref(false);
const themeControlReady = ref(false);

const applyTheme = () => {
    if (!import.meta.client) {
        return;
    }

    document.documentElement.setAttribute("data-theme", isDark.value ? "dracula" : "pastel");
};

const removeCurrentPlayerFromWaitingRoom = async (playerId: string) => {
    const roomId = route.params.id;

    if (route.path.split("/")[1] !== "rooms" || typeof roomId !== "string") {
        return;
    }

    const room: any = await $fetch(`/api/${roomId}/details`);

    if (room?.active !== false || !room.playerLists?.some((player: any) => player.id === playerId)) {
        return;
    }

    await $fetch(`/api/${roomId}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            leavePlayer: {
                id: playerId,
            },
        },
    });
};

const resetAnonymousSession = async () => {
    if (resettingSession.value) {
        return;
    }

    resettingSession.value = true;
    const currentPlayerId = user.value?.id ?? anonymousPlayer.value?.id ?? null;

    try {
        if (currentPlayerId) {
            await removeCurrentPlayerFromWaitingRoom(currentPlayerId);
        }
        resetAnonymousPlayerSession();
        await supabase.auth.signOut();
        await navigateTo("/");
    } finally {
        resettingSession.value = false;
    }
};

onMounted(() => {
    applyTheme();
    themeControlReady.value = true;
});
watch(isDark, applyTheme);
</script>

<template>
    <div class="dropdown dropdown-bottom dropdown-end">
        <button type="button" tabindex="0" class="m-1" aria-label="Settings">
            <Icon name="pixelarticons:settings-2" class="text-3xl" />
        </button>
        <div tabindex="0" class="dropdown-content z-[1] w-56 rounded-box bg-base-100 p-3 shadow">
            <label class="flex items-center justify-between gap-4 cursor-pointer">
                <span class="font-medium">Âm thanh</span>
                <input v-model="soundEnabled" type="checkbox" class="toggle toggle-primary" />
            </label>
            <label class="flex items-center justify-between gap-4 mt-3 cursor-pointer">
                <span class="font-medium">Giao diện</span>
                <span v-if="themeControlReady" class="flex items-center gap-2">
                    <Icon name="pixelarticons:sun" class="text-xl opacity-70" :class="{ 'opacity-100': !isDark }" />
                    <input v-model="isDark" type="checkbox" class="toggle toggle-primary" />
                    <Icon name="pixelarticons:moon" class="text-xl opacity-70" :class="{ 'opacity-100': isDark }" />
                </span>
                <span v-else class="flex items-center gap-2">
                    <Icon name="pixelarticons:sun" class="text-xl opacity-70" />
                    <input type="checkbox" class="toggle toggle-primary" disabled />
                    <Icon name="pixelarticons:moon" class="text-xl opacity-70" />
                </span>
            </label>
            <div class="my-2 divider"></div>
            <button type="button" class="w-full btn btn-md btn-error text-error-content" @click="resetAnonymousSession">
                <span v-if="resettingSession" class="loading loading-spinner loading-xs"></span>
                <span v-else>Reset thông tin người chơi</span>
            </button>
        </div>
    </div>
</template>

<style scoped></style>
