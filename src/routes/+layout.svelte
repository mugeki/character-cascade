<script lang="ts">
	import { waitLocale } from 'svelte-i18n'
	import '../app.css';

	let { children } = $props();
	
	export async function preload() {    
		return waitLocale()
	}
</script>

{@render children()}
