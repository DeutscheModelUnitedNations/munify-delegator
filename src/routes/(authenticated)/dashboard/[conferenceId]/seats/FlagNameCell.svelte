<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';

	interface Props {
		name: string;
		alpha2Code?: string;
		nsaIcon?: string | null;
		nsa?: boolean;
	}

	let { name, alpha2Code, nsaIcon, nsa = false }: Props = $props();
</script>

<div class="flex items-center gap-3 text-left">
	<Flag {alpha2Code} {nsa} icon={nsaIcon} size="xs" />
	<span class="font-medium">{name}</span>
</div>
