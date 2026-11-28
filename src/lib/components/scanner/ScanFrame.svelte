<script lang="ts">
	interface Props {
		/** Frames an upright A4 page instead of a square for the code alone. */
		page: boolean;
		/** The page lies as it should: the corners turn green. */
		ready?: boolean;
	}

	let { page, ready = false }: Props = $props();
	const corner = $derived(ready ? 'border-success' : 'border-white');

	/** Width over height of what is framed. */
	const aspect = $derived(page ? 210 / 297 : 1);
	/** How much of the picture's shorter fitting side the frame takes. */
	const share = $derived(page ? 88 : 60);
</script>

<!-- Crosshair: what to hold in view, as large as the picture allows either way; the rest dimmed -->
<div
	class="pointer-events-none absolute inset-0 flex items-center justify-center"
	style="container-type: size;"
>
	<div
		class="relative rounded-2xl shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]"
		style="aspect-ratio: {aspect}; width: min({share}cqw, {share * aspect}cqh);"
	>
		<span class="absolute top-0 left-0 size-8 rounded-tl-2xl border-t-4 border-l-4 {corner}"></span>
		<span class="absolute top-0 right-0 size-8 rounded-tr-2xl border-t-4 border-r-4 {corner}"
		></span>
		<span class="absolute bottom-0 left-0 size-8 rounded-bl-2xl border-b-4 border-l-4 {corner}"
		></span>
		<span class="absolute right-0 bottom-0 size-8 rounded-br-2xl border-r-4 border-b-4 {corner}"
		></span>
		<span class="absolute top-1/2 left-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-white/80"
		></span>
		<span class="absolute top-1/2 left-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-white/80"
		></span>
	</div>
</div>
