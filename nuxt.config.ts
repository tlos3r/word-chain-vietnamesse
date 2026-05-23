// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineNuxtConfig({
    app: {
        head: {
            charset: "utf-8",
            viewport: "width=device-width, initial-scale=1",
            htmlAttrs: {
                "data-theme": "dracula",
            },
            script: [
                {
                    innerHTML: `
                        (() => {
                            try {
                                const mode = localStorage.getItem("vueuse-color-scheme");
                                const theme = mode === "light" ? "pastel" : "dracula";
                                document.documentElement.setAttribute("data-theme", theme);
                            } catch {
                                document.documentElement.setAttribute("data-theme", "dracula");
                            }
                        })();
                    `,
                    tagPosition: "head",
                },
            ],
        },
    },
    runtimeConfig: {
        public: {
            baseURL: process.env.BASE_URL,
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_KEY,
        },
    },

    css: ["vue3-toastify/dist/index.css"],
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss", "@nuxtjs/supabase", "@vueuse/nuxt", "nuxt-icon", "dayjs-nuxt"],
    supabase: {
        redirect: false,
    },
    vite: {
        define: {},
        plugins: [nodePolyfills()],
    },
});
