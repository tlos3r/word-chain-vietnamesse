// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        head: {
            charset: "utf-8",
            viewport: "width=device-width, initial-scale=1",
        },
    },
    css: ["vue3-toastify/dist/index.css"],
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss", "@nuxtjs/supabase", "@vueuse/nuxt", "nuxt-icon"],
    supabase: {
        redirect: false,
    },
});
