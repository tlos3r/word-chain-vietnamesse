<script setup lang="ts">
import { toast } from "vue3-toastify";
useHead({
    title: "Đăng nhập",
});
const loading = ref(false);
const supabase = useSupabaseClient();
const loginInfo = ref({
    email: "",
    password: "",
});
const login = async () => {
    loading.value = true;
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: loginInfo.value.email,
            password: loginInfo.value.password,
        });
        if (error) {
            toast.error("Tài khoản hoặc mật khẩu không đúng");
            console.error(error);
            return;
        }
        toast.success("Đăng nhập thành công");
        navigateTo("/");
        loading.value = false;
    } catch (error) {
        useHandleError(error);
        loading.value = false;
    }
};
</script>

<template>
    <form @submit.prevent="login" class="flex flex-col items-center justify-center">
        <h1 class="mt-20 mb-10 text-5xl font-bold">Đăng nhập</h1>
        <label class="w-full max-w-xs form-control">
            <div class="label">
                <span class="label-text">Email</span>
            </div>
        </label>
        <input autofocus type="email" class="w-full max-w-xs input input-bordered" v-model="loginInfo.email" />
        <label class="w-full max-w-xs form-control">
            <div class="label">
                <span class="label-text">Mật khẩu</span>
            </div>
        </label>
        <input type="password" class="w-full max-w-xs input input-bordered" v-model="loginInfo.password" />
        <div class="mt-5">
            <button class="btn btn-primary">
                <span v-if="loading" class="loading loading-dots loading-lg"></span>
                <span v-else>Xác nhận</span>
            </button>
        </div>
    </form>
</template>

<style scoped></style>
