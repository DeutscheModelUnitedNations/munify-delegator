<script lang="ts">
	interface Props {
		/** FontAwesome icon class (e.g. 'fa-edit') */
		icon: string;
		label: string;
		/** Marks a destructive action */
		danger?: boolean;
		onclick: () => void;
	}

	let { icon, label, danger = false, onclick }: Props = $props();
</script>

<button class="btn btn-ghost {danger ? 'btn-error' : ''} btn-sm" aria-label={label} {onclick}>
	<i class="fas {icon}"></i>
</button>
