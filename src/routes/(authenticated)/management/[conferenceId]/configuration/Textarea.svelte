<script lang="ts">
	interface Props {
		label: string;
		initialValue: string | null | undefined;
		stateValue: string;
		changeValue: (value: string) => void;
	}

	let { label, initialValue, stateValue, changeValue }: Props = $props();
</script>

<label class="form-control w-full">
	<span class="label-text">{label}</span>
	<textarea
		class="input input-bordered {initialValue !== stateValue && 'input-success border-4'}"
		value={stateValue}
		onchange={(e) => {
			changeValue((e.target as HTMLTextAreaElement)?.value || '');
		}}
	></textarea>
</label>
