<script lang="ts" setup>
import { toast } from "vue3-toastify";

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const logOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        toast.error("Có lỗi xảy ra khi đăng xuất");
        console.log(error);
        return;
    }
    toast.success("Đăng xuất thành công !");
};
</script>

<template>
    <div class="dropdown dropdown-bottom dropdown-end">
        <div tabindex="0" role="button" class="m-1"><Icon name="lucide:user" class="text-3xl" /></div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <div v-if="!user">
                <li><NuxtLink to="/login">Đăng nhập</NuxtLink></li>
                <li><NuxtLink to="/register">Đăng ký</NuxtLink></li>
            </div>
            <div v-else>
                <li><NuxtLink>Bạn đã đăng nhập rồi !</NuxtLink></li>
                <li @click="logOut"><NuxtLink>Đăng xuất</NuxtLink></li>
            </div>
        </ul>
    </div>
</template>

<style scoped></style>
