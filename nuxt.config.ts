// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        head: {
            charset: "utf-8",
            viewport: "width=device-width, initial-scale=1",
        },
    },
    runtimeConfig: {
        public: {
            baseURL: process.env.BASE_URL || "http://localhost:3000",
        },
    },
    css: ["vue3-toastify/dist/index.css"],
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss", "@nuxtjs/supabase", "@vueuse/nuxt", "nuxt-icon", "dayjs-nuxt"],
    supabase: {
        redirect: false,
    },
});
