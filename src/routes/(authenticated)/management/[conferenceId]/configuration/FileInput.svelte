<script lang="ts">
	interface Props {
		label: string;
		file: string | null | undefined;
		changeFile: (value: string | null | undefined) => void;
	}

	let { label, file, changeFile }: Props = $props();
</script>

<label class="form-control w-full">
	<span class="label-text">{label}</span>
	<input
		type="file"
		class="file-input file-input-bordered w-full"
		accept=".png, .jpg, .jpeg, .tiff, .webp"
		multiple={false}
		onchange={(e) => {
			const reader = new FileReader();
			if (e.target?.files[0].size > 1000000) {
				alert('File size must be less than 1MB');
				return;
			}
			reader.onload = (e) => {
				const result = e.target?.result;
				changeFile(result as string);
			};
			reader.readAsDataURL(e.target?.files?.[0]);
			// reader.readAsArrayBuffer(e.target?.files?.[0]);
		}}
	/>
</label>

<div class="max-w-xs rounded-lg shadow-lg overflow-hidden">
	{#if file}
		<img src={file} alt="Preview" />
	{/if}
</div>
