<!-- What the guide highlights. -->
<script lang="ts">
	let { text }: { text: string } = $props();
</script>

<div class="alert alert-warning mt-4 text-left">
	<i aria-hidden="true" class="ph-duotone ph-warning text-xl"></i>
	<span class="font-semibold">{text}</span>
</div>
