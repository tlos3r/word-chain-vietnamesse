<script lang="ts" setup>
import { toast } from "vue3-toastify";
const user = useSupabaseUser();
const loading = ref(false);
const createRoom = async () => {
    const roomId = Math.random().toString(36).slice(2, 7);
    loading.value = true;
    if (!user.value) {
        toast.error("Bạn chưa đăng nhập nên chưa tạo phòng được");
        loading.value = false;
        return;
    }
    await $fetch(`/api/create`, {
        method: "POST",
        body: {
            playerId: user.value.id,
            roomId,
            playerInfo: [
                {
                    id: user.value.id,
                    name: "",
                },
            ],
        },
    })
        .catch((error) => {
            useHandleError(error);
            throw new Error(error);
        })
        .finally(() => {
            loading.value = false;
        });
    return navigateTo(`/rooms/${roomId}/waiting`);
};
</script>

<template>
    <div class="min-h-screen hero bg-base-200">
        <div class="text-center hero-content">
            <div class="max-w-md">
                <h1 class="text-5xl font-bold">Nối từ</h1>
                <p class="py-6 text-base">
                    Developed by
                    <a href="https://github.com/tlos3r" target="_blank" rel="noopener noreferrer" class="link">Fu</a>
                </p>
                <button class="btn btn-primary" @click="createRoom">
                    <span v-if="loading" class="loading loading-dots loading-lg"></span>
                    <span v-else>Tạo phòng</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
