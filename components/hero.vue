<script lang="ts" setup>
import { toast } from "vue3-toastify";
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const loading = ref(false);
const show = ref(true);
const id = ref("");

const createRoom = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    console.log(data);
    // const roomId = Math.random().toString(36).slice(2, 7);
    // loading.value = true;
    // if (!user.value) {
    //     toast.error("Bạn chưa đăng nhập nên chưa tạo phòng được");
    //     loading.value = false;
    //     return;
    // }
    // await $fetch(`/api/create`, {
    //     method: "POST",
    //     headers: {
    //         "Content-type": "application/json",
    //     },
    //     body: {
    //         playerId: user.value.id,
    //         roomId,
    //         name: user.value?.user_metadata.name,
    //         image: user.value?.user_metadata.avatar_url,
    //     },
    //     onRequestError({ error }) {
    //         useHandleError(error);
    //     },
    //     onResponse() {
    //         loading.value = false;
    //     },
    // });
    // return navigateTo(`/rooms/${roomId}`);
};
const joinRoom = () => {
    if (id.value.length === 0) {
        toast.error("Đã nhập cái chó gì đâu mà đòi tham gia vào chơi game ???");
        return;
    }
    return navigateTo(`/rooms/${id.value}`);
};
</script>

<template>
    <div class="min-h-screen hero bg-base-200">
        <div class="text-center hero-content">
            <div class="flex flex-col items-center max-w-md">
                <h1 class="text-5xl font-bold">Nối từ</h1>

                <p class="py-6 text-base">
                    Developed by
                    <a href="https://github.com/tlos3r" target="_blank" rel="noopener noreferrer" class="link">Fu</a>
                </p>
                <button class="mb-5 btn btn-primary text-primary-content w-52" @click="createRoom">
                    <span v-if="loading" class="loading loading-dots loading-lg"></span>
                    <span v-else>Tạo phòng</span>
                </button>
                <button @click="show = !show" v-if="show" class="btn btn-primary text-primary-content w-52">
                    Tham gia với mã mời
                </button>
                <div class="flex gap-5" v-else>
                    <input @keyup.enter="joinRoom" v-model="id" type="text" class="input input-primary" />
                    <button @click="joinRoom" class="btn btn-neutral text-neutral-content">Xác nhận</button>
                    <button @click="show = !show" class="btn btn-error text-error-content">✕</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
