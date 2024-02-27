<script setup lang="ts">
const user = useSupabaseUser();

watch(
    user,
    () => {
        if (user.value) {
            return navigateTo("/");
        }
    },
    { immediate: true }
);
</script>

<template>
    <div>
        <p class="mt-5 text-2xl text-center text-bold">Đang đăng nhập...</p>
    </div>
</template>
