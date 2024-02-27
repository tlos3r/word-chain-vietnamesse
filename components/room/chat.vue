<script lang="ts" setup>
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { messages } from "@prisma/client";
const message: Ref<string> = ref("");
let realtimeChannel: RealtimeChannel;
const user = useSupabaseUser();
const route = useRoute();
const client = useSupabaseClient();
const loading = ref(false);
const { data: messages, refresh } = await useAsyncData<any>("messagesChat", () =>
    $fetch(`/api/${route.params.id}/message`)
);

const sendMessages = async () => {
    loading.value = true;
    try {
        await $fetch(`/api/${String(route.params.id)}/message`, {
            method: "PATCH",
            body: {
                userId: user.value?.id,
                name: user.value?.user_metadata.name,
                image: user.value?.user_metadata.avatar_url,
                roomId: route.params.id,
                message: message.value,
            },
            headers: useRequestHeaders(["cookie"]),
        })
            .catch((error) => {
                useHandleError(error);
            })
            .finally(() => {
                loading.value = false;
            });
        refresh();
        message.value = "";
    } catch (error) {
        useHandleError(error);
    }
};
onMounted(() => {
    realtimeChannel = client
        .channel(`${route.params.id}message`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
            refresh();
        });

    realtimeChannel.subscribe();
});
onUnmounted(() => {
    client.removeChannel(realtimeChannel);
});
</script>

<template>
    <div class="flex flex-col p-5 overflow-auto border max-h-96 border-primary rounded-xl">
        <p class="text-xl font-bold tracking-wide text-center">Góc tâm sự tuổi hồng</p>
        <div class="my-1 chat chat-start" v-for="message in messages" :key="message.id">
            <div class="chat-image avatar">
                <div class="w-10 rounded-full">
                    <img alt="chat bubble component display player in roooms" :src="message.image" />
                </div>
            </div>
            <div class="pl-3 chat-header">
                {{ message.name }}
                <time class="text-xs opacity-50">{{ $dayjs(message.created_at).format("HH:mm") }}</time>
            </div>
            <div class="chat-bubble">{{ message.message }}</div>
        </div>
        <form @submit.prevent="sendMessages" class="flex justify-center gap-5 mt-5">
            <input type="text" placeholder="Nhắn ở đây nè !" class="w-full input input-bordered" v-model="message" />
            <button class="btn">
                <span v-if="loading" class="loading loading-dots loading-lg"></span>
                <span v-else>Gửi</span>
            </button>
        </form>
    </div>
</template>

<style scoped></style>
