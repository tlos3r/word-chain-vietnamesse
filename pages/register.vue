<script lang="ts" setup>
import { toast } from "vue3-toastify";
definePageMeta({
    layout: "auth",
});
useHead({
    title: "Register",
});
const supabase = useSupabaseClient();
const loading = ref(false);
const registerInfo = ref({
    email: "",
    password: "",
    repeatPassword: "",
});

const register = async () => {
    loading.value = true;
    if (registerInfo.value.password !== registerInfo.value.repeatPassword) {
        toast.error("Mật khẩu không trùng khớp với nhau");
        loading.value = false;
        return;
    }
    try {
        const { error } = await supabase.auth.signUp({
            email: registerInfo.value.email,
            password: registerInfo.value.password,
        });
        if (error) {
            toast.error("Mật khẩu phải 6 ký tự hoặc là định dạng email chưa đúng");
            console.error(error.message);
            loading.value = false;
            return;
        }
        navigateTo("/login");
        loading.value = false;
        toast.success("Đăng ký thành công");
    } catch (error) {
        useHandleError(error);
        loading.value = false;
    }
};
</script>

<template>
    <form @submit.prevent="register" class="flex flex-col items-center justify-center">
        <h1 class="mt-20 mb-10 text-5xl font-bold">Đăng ký</h1>
        <label class="w-full max-w-xs form-control">
            <div class="label">
                <span class="label-text">Email</span>
            </div>
        </label>
        <input autofocus type="email" class="w-full max-w-xs input input-bordered" v-model="registerInfo.email" />
        <label class="w-full max-w-xs form-control">
            <div class="label">
                <span class="label-text">Mật khẩu</span>
            </div>
        </label>
        <input type="password" class="w-full max-w-xs input input-bordered" v-model="registerInfo.password" />
        <label class="w-full max-w-xs form-control">
            <div class="label">
                <span class="label-text">Nhập lại mật khẩu</span>
            </div>
        </label>
        <input type="password" class="w-full max-w-xs input input-bordered" v-model="registerInfo.repeatPassword" />
        <div class="mt-5">
            <button class="btn">
                <span v-if="loading" class="loading loading-dots loading-lg"></span>
                <span v-else>Xác nhận</span>
            </button>
        </div>
    </form>
</template>

<style scoped></style>
