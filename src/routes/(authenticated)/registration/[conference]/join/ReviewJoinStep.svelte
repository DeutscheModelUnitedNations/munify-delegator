<script lang="ts">
	import ReviewTable from '$lib/components/ReviewTable.svelte';

	interface Props {
		code: string;
		prevStep: () => void;
	}

	let { code, prevStep }: Props = $props();
</script>
