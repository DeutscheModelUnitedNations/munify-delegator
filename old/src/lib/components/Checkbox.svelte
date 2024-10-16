<script lang="ts">
	interface Props {
		label: string;
		checked: boolean;
	}

	let { label, checked = $bindable() }: Props = $props();
</script>

<div class="form-control">
	<label class="label flex cursor-pointer justify-start">
		<input type="checkbox" bind:checked class="checkbox" />
		<span class="label-text ml-3">{label}</span>
	</label>
</div>
