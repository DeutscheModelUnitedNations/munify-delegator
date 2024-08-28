<script lang="ts">
	import ProfileButtonAbsolute from '$lib/components/ProfileButton/ProfileButtonAbsolute.svelte';
	let { children } = $props();
</script>

<ProfileButtonAbsolute />
{@render children()}
