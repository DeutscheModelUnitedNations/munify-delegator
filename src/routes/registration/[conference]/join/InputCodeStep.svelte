<script lang="ts">
	export let code: string = '';
	export let changeCode: (code: string) => void;
	export let changeStep: (step: number) => void;

	let showTooltip = false;
</script>

<div class="flex flex-col items-center">
	<p class="mb-10 max-ch-sm">Überprüfe die Angaben und bestätige den Beitritt zur Delegation.</p>
	<div class="join">
		<div
			class="tooltip {showTooltip && 'tooltip-open'} tooltip-bottom"
			data-tip="Einladungscode eingeben"
		>
			<input
				type="text"
				placeholder="Code"
				value={code}
				class="input input-bordered input-lg w-full max-w-xs tracking-[0.8rem] uppercase join-item font-mono"
				on:change={(e) => {
					changeCode(e.target?.value);
					code = e.target?.value;
				}}
			/>
		</div>
		<button
			class="btn btn-lg btn-primary join-item"
			on:click={() => {
				console.log(code);
				if (code.length === 0) {
					showTooltip = true;
					return;
				}
				changeStep(2);
			}}
		>
			Senden
		</button>
	</div>
	<a class="btn btn-warning mt-16" href=".">Zurück</a>
</div>
