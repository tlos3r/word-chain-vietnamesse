/** @type {import('tailwindcss').Config} */
export default {
    content: [],
    theme: {
        extend: {
            container: {
                center: true,
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: ["wireframe", "dracula"],
        darkTheme: "dracula",
    },
};
