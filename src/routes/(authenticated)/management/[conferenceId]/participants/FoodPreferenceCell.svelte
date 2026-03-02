<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		value: string | null;
	}

	let { value }: Props = $props();

	const config = $derived.by(() => {
		switch (value) {
			case 'OMNIVORE':
				return { label: m.omnivore(), icon: 'fa-drumstick-bite', color: 'text-amber-700' };
			case 'VEGETARIAN':
				return { label: m.vegetarian(), icon: 'fa-leaf', color: 'text-green-600' };
			case 'VEGAN':
				return { label: m.vegan(), icon: 'fa-seedling', color: 'text-emerald-500' };
			default:
				return null;
		}
	});
</script>

{#if config}
	<span class="flex items-center gap-1.5">
		<i class="fa-solid {config.icon} {config.color} text-xs"></i>
		{config.label}
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
