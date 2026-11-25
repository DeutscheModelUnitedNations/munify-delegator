<script lang="ts" module>
	export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
</script>

<script lang="ts">
	/** The icon a section or row of the user card starts with, as wide as every other one. */
	interface Props {
		/** Phosphor icon name, with or without the `ph-` prefix */
		icon: string;
		tone?: Tone;
		/** Within a line of text rather than in front of a row */
		small?: boolean;
	}

	let { icon, tone = 'neutral', small = false }: Props = $props();
</script>

<i
	aria-hidden="true"
	class="ph-duotone ph-{icon.replace(/^ph-/, '')} shrink-0 text-center {small
		? 'text-base'
		: 'w-6 text-xl'} {tone}"
></i>

<style>
	/* Pulled towards the text color: the light theme's status colors are too pale for a glyph */
	i {
		color: color-mix(in oklab, var(--tone) 70%, var(--color-base-content));
	}

	.primary {
		--tone: var(--color-primary);
	}

	.success {
		--tone: var(--color-success);
	}

	.warning {
		--tone: var(--color-warning);
	}

	.error {
		--tone: var(--color-error);
	}

	.neutral {
		color: color-mix(in oklab, var(--color-base-content) 55%, transparent);
	}
</style>
