<script lang="ts">
	let rawFile = $state<File | null>(null);

	$effect(() => {
		if (rawFile) {
			console.log(rawFile);
		}
	});
</script>

<div class="flex w-full flex-col items-center gap-4 p-10">
	<input type="file" class="file-input file-input-bordered w-full" bind:value={rawFile} />
</div>
