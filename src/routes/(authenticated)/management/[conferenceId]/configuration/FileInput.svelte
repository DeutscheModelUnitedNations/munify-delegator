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
		class="file-input file-input-bordered w-full {file != undefined && 'input-success border-4'}"
		accept=".png, .jpg, .jpeg, .tiff, .webp"
		multiple={false}
		onchange={(e) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result;
				changeFile(result as string);
			};
			reader.readAsDataURL(e.target?.files?.[0]);
			// reader.readAsArrayBuffer(e.target?.files?.[0]);
		}}
	/>
</label>

<img src={file ? file : ''} alt="Preview" class="mt-2" />
