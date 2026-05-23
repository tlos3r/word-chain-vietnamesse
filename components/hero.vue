<script lang="ts" setup>
import { toast } from "vue3-toastify";
import VueHcaptcha from "@hcaptcha/vue3-hcaptcha";

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const loading = ref(false);
const show = ref(true);
const id = ref("");
const anonymousPlayer = useAnonymousPlayer();
const captcha = ref<InstanceType<typeof VueHcaptcha> | null>(null);
const captchaToken = ref("");
const shouldShowCaptcha = computed(() => !anonymousPlayer.value?.id);

const normalizePlayerProfile = (profile: { id?: string; name?: string; image?: string }) => {
    const fallbackProfile = createAnonymousPlayerProfile(profile.id);

    return {
        id: profile.id || fallbackProfile.id,
        name: profile.name?.trim() || fallbackProfile.name,
        image: profile.image?.trim() || fallbackProfile.image,
    };
};

const rememberAnonymousPlayer = (currentUser: NonNullable<typeof user.value>) => {
    const profile = normalizePlayerProfile(usePlayerProfile(currentUser));
    const storedProfile = anonymousPlayer.value;

    if (storedProfile?.id === profile.id) {
        profile.name = storedProfile.name?.trim() || profile.name;
        profile.image = storedProfile.image?.trim() || profile.image;
    }

    if (!profile.id) {
        throw new Error("Anonymous user did not include an id.");
    }

    const nextProfile = {
        id: profile.id,
        name: profile.name,
        image: profile.image,
    };

    if (
        anonymousPlayer.value?.id !== nextProfile.id ||
        anonymousPlayer.value.name !== nextProfile.name ||
        anonymousPlayer.value.image !== nextProfile.image
    ) {
        anonymousPlayer.value = nextProfile;
    }

    return profile;
};

const setCaptchaToken = (token: string) => {
    captchaToken.value = token;
};

const resetCaptcha = () => {
    captchaToken.value = "";
    captcha.value?.reset();
};

const ensureUser = async () => {
    if (user.value) {
        rememberAnonymousPlayer(user.value);
        return user.value;
    }

    if (!captchaToken.value) {
        throw new Error("Hãy hoàn thành CAPTCHA trên trang web.");
    }

    const { data, error } = await supabase.auth.signInAnonymously({
        options: {
            captchaToken: captchaToken.value,
        },
    });

    if (error) {
        console.error("Anonymous sign-in error:", error);
        throw error;
    }
    if (!data.user) {
        throw new Error("Thông tin người dùng Anonymous không được trả về.");
    }

    rememberAnonymousPlayer(data.user);
    return data.user;
};

const ensurePlayerProfile = async () => {
    if (user.value) {
        return rememberAnonymousPlayer(user.value);
    }

    if (anonymousPlayer.value?.id) {
        const profile = normalizePlayerProfile(anonymousPlayer.value);
        if (
            anonymousPlayer.value?.id !== profile.id ||
            anonymousPlayer.value.name !== profile.name ||
            anonymousPlayer.value.image !== profile.image
        ) {
            anonymousPlayer.value = profile;
        }
        return profile;
    }

    const currentUser = await ensureUser();
    return rememberAnonymousPlayer(currentUser);
};

onMounted(async () => {
    try {
        const { data } = await supabase.auth.getUser();

        if (data.user) {
            rememberAnonymousPlayer(data.user);
        }
    } catch (error) {
        console.error("Failed to initialize anonymous user:", error);
    }
});

// watch(user, (value) => {
//     console.log("useSupabaseUser đã thay đổi:", value);
// });

const createRoom = async () => {
    const roomId = Math.random().toString(36).slice(2, 7);
    loading.value = true;
    try {
        const profile = await ensurePlayerProfile();

        await $fetch(`/api/create`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: {
                playerId: profile.id,
                roomId,
                name: profile.name,
                image: profile.image,
            },
        });

        return navigateTo(`/rooms/${roomId}`);
    } catch (error) {
        useHandleError(error);
    } finally {
        resetCaptcha();
        loading.value = false;
    }
};

const joinRoom = async () => {
    if (id.value.length === 0) {
        toast.error("Nhap ma phong truoc khi tham gia");
        return;
    }

    loading.value = true;
    try {
        await ensurePlayerProfile();
        return navigateTo(`/rooms/${id.value}`);
    } catch (error) {
        useHandleError(error);
    } finally {
        resetCaptcha();
        loading.value = false;
    }
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
                <button @click="show = !show" v-if="show" class="mb-5 btn btn-primary text-primary-content w-52">
                    Tham gia với mã phòng
                </button>
                <div class="flex gap-5 mb-5" v-else>
                    <input @keyup.enter="joinRoom" v-model="id" type="text" class="input input-primary" />
                    <button @click="joinRoom" class="btn btn-neutral text-neutral-content">Xác nhận</button>
                    <button @click="show = !show" class="btn btn-error text-error-content">x</button>
                </div>
                <vue-hcaptcha
                    v-if="shouldShowCaptcha"
                    ref="captcha"
                    sitekey="83382c0c-6216-4b4c-a1d6-2ea6a45c86f8"
                    @verify="setCaptchaToken"
                    @expired="captchaToken = ''"
                    @challenge-expired="captchaToken = ''"
                    @error="captchaToken = ''"
                ></vue-hcaptcha>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
