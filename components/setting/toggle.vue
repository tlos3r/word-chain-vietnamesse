<script lang="ts" setup></script>

<template>
    <label class="swap swap-rotate">
        <!-- this hidden checkbox controls the state -->
        <input type="checkbox" class="theme-controller" value="light" />

        <!-- sun icon -->
        <Icon name="pixelarticons:sun" class="text-3xl swap-on" />

        <!-- moon icon -->
        <Icon name="pixelarticons:moon" class="text-3xl swap-off" />
    </label>
</template>

<style scoped></style>
