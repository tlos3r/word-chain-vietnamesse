<script lang="ts" setup>
const isDark = useDark({
    selector: "html",
    attribute: "data-theme",
    valueDark: "night",
    valueLight: "cupcake",
});
const toggleDark = useToggle(isDark);
</script>

<template>
    <label class="swap swap-rotate">
        <input type="checkbox" @change="toggleDark()" />

        <!-- sun icon -->
        <Icon name="pixelarticons:sun" class="text-3xl swap-on" />

        <!-- moon icon -->
        <Icon name="pixelarticons:moon" class="text-3xl swap-off" />
    </label>
</template>

<style scoped></style>
