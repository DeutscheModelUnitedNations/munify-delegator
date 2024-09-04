<script lang="ts">
	let idsToAdd: string[] = $state([]);

	let input: string = $state('');

	let addId = () => {
		if (input.length > 0) {
			idsToAdd.push(input);
			input = '';
		}
	};
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">Anmeldung für Betreuer*innen</h1>
		<p class="max-ch-md mb-2">
			Als Betreuer*in können Sie mehrere Delegationen überwachen. Erfragen Sie dafür bei den
			Delegationsleiter*innen den Code der Delegation. Bitte beachten Sie, dass Sie keine
			Delegationen selbstständig für Ihre Schüler*innen anlegen können. Sie können sich nur nach
			Erhalt des Codes einer Delegation anschließen.
		</p>
		<p class="max-ch-md"></p>
		<a class="btn btn-warning mt-6" href=".">Zurück</a>
	</hero>

	<main>
		<section class="w-full flex flex-col justify-center items-center gap-8 flex-wrap">
			<div class="join">
				<input
					class="join-item input input-bordered input-lg max-w-xs w-full uppercase tracking-[0.6rem] font-mono"
					type="text"
					placeholder="Code"
					bind:value={input}
					onkeydown={(e) => e.key === 'Enter' && addId()}
				/>
				<button class="join-item btn btn-lg btn-primary" onclick={addId}
					><i class="fas fa-check"></i></button
				>
			</div>
			<div class="flex flex-wrap gap-4 items-center justify-center">
				{#each idsToAdd as id}
					<div
						class="flex justify-center items-center bg-primary text-white gap-2 rounded-full pl-2 pr-6 py-1 uppercase"
					>
						<button
							class="btn btn-sm btn-ghost btn-circle"
							onclick={() => (idsToAdd = idsToAdd.filter((i) => i !== id))}
						>
							<i class="fas fa-times"></i>
						</button>
						<p class="text-lg font-bold font-mono tracking-widest">{id}</p>
					</div>
				{/each}
			</div>
			{#if idsToAdd.length > 0}
				<button class="btn btn-lg btn-primary" onclick={() => alert('#TODO')}>Beitreten</button>
			{/if}
		</section>
	</main>
</div>
