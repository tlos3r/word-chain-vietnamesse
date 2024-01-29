<script lang="ts" setup>
const route = useRoute();
const { data, pending, error, refresh } = await useAsyncData("rooms", () => $fetch(`/api/${route.params.id}/details`));
</script>

<template>
    {{ data }}
    <div>đây là phòng chờ của {{ $route.params.id }}</div>
</template>

<style scoped></style>
