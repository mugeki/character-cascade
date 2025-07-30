<script lang="ts">
	import { page } from '$app/stores';
	import { waitLocale } from 'svelte-i18n';
	import '../app.css';

	let { children } = $props();

	export async function preload() {
		return waitLocale();
	}
</script>

<svelte:head>
	<title>Character Cascade</title>
	<meta name="description" content="A product of an insatiated Software Engineer's boredom" />
</svelte:head>

{@render children()}
