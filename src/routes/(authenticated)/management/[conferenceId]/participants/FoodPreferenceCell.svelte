<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		value: string | null;
	}

	let { value }: Props = $props();

	const config = $derived.by(() => {
		switch (value) {
			case 'OMNIVORE':
				return { label: m.omnivore(), icon: 'fa-drumstick-bite', color: 'badge-error' };
			case 'VEGETARIAN':
				return { label: m.vegetarian(), icon: 'fa-leaf', color: 'badge-warning' };
			case 'VEGAN':
				return { label: m.vegan(), icon: 'fa-seedling', color: 'badge-success' };
			default:
				return null;
		}
	});
</script>

{#if config}
	<span class="badge badge-soft badge-sm {config.color}">
		<i class="fa-solid {config.icon} text-xs"></i>
		{config.label}
	</span>
{:else}
	<span class="text-base-content/30">—</span>
{/if}
