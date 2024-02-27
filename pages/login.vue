<script setup lang="ts">
import { toast } from "vue3-toastify";
useHead({
    title: "Đăng nhập",
});
const user = useSupabaseUser();
const loading = ref(false);
const supabase = useSupabaseClient();

const login = async () => {
    loading.value = true;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
    });
    if (error) {
        toast.error("Có lỗi gì đó xảy ra khi đăng nhập với google");
        console.error(error);
        return;
    }
    loading.value = false;
};
watchEffect(() => {
    if (user.value) {
        return navigateTo("/");
    }
});
</script>

<template>
    <section class="flex flex-col items-center justify-center gap-5">
        <h1 class="mt-20 mb-10 text-3xl font-bold">Đăng nhập</h1>
        <button class="btn btn-wide" @click="login">
            <span v-if="loading" class="loading loading-dots loading-lg"></span>
            <span v-else> <Icon name="logos:google-icon" class="mr-1 text-2xl" /> Google</span>
        </button>
        <button
            class="btn btn-wide"
            @click="toast.info('Á à bắt qua tang có tài khoản lưu phim hiền tài nhá ! Nút này làm cho vui thôi 😀')"
        >
            <span><Icon name="game-icons:cat" class="mr-1 text-2xl text-black" />IHentai</span>
        </button>
    </section>
</template>

<style scoped></style>
