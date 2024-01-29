<script lang="ts" setup>
const user = useSupabaseUser();
console.log(user.value);

watch(
    user,
    async () => {
        if (user.value) {
            await $fetch("/api/player/create", {
                method: "POST",
                body: {
                    userId: user.value?.id,
                },
            });
        }
        return navigateTo("/");
    },
    {
        immediate: true,
    }
);
</script>

<template>
    <div class="min-h-screen hero bg-base-200">
        <div class="text-center hero-content">
            <div class="max-w-md">
                <p class="text-2xl">Đợi trong lúc chúng tôi chuyển hướng bạn sang trang chủ</p>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
