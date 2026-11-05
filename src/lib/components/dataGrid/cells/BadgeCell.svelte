<script lang="ts">
	interface Props {
		label: string;
		/** DaisyUI badge modifier, e.g. `badge-success` */
		variant?: string;
		title?: string;
	}

	let { label, variant = 'badge-ghost', title }: Props = $props();
</script>

<span class="badge {variant}" {title}>{label}</span>
