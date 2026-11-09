<script lang="ts">
	interface Props {
		/** Phosphor icon class (e.g. 'ph-pencil-simple') */
		icon: string;
		label: string;
		/** Marks a destructive action */
		danger?: boolean;
		onclick: () => void;
	}

	let { icon, label, danger = false, onclick }: Props = $props();
</script>

<button class="btn btn-ghost {danger ? 'btn-error' : ''} btn-sm" aria-label={label} {onclick}>
	<i aria-hidden="true" class="ph-fill {icon}"></i>
</button>
