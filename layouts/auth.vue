<script lang="ts" setup></script>

<template>
    <Setting />
    <div class="container px-6 m-auto">
        <div class="grid grid-cols-4 gap-6 md:grid-cols-8 lg:grid-cols-12">
            <div class="col-span-4 md:col-span-8 lg:col-span-12">
                <slot />
            </div>
        </div>
    </div>
</template>

<style scoped></style>
