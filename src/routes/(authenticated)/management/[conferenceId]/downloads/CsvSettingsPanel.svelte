<script lang="ts">
	import { browser } from '$app/environment';
	import { m } from '$lib/paraglide/messages';
	import {
		csvSettings,
		getDelimiterLabel,
		getEncodingLabel,
		type CsvDelimiter,
		type CsvEncoding
	} from '$lib/stores/csvSettings';

	const delimiters: CsvDelimiter[] = [';', ',', '\t', '|'];
	const encodings: CsvEncoding[] = ['utf-8', 'utf-8-bom', 'iso-8859-1'];

	// Only access the store on the client side
	let currentSettings = $state({ delimiter: ';' as CsvDelimiter, encoding: 'utf-8' as CsvEncoding });

	$effect(() => {
		if (browser) {
			const unsubscribe = csvSettings.subscribe((value) => {
				currentSettings = value;
			});
			return unsubscribe;
		}
	});

	const updateDelimiter = (delimiter: CsvDelimiter) => {
		if (browser) {
			csvSettings.update((s) => ({ ...s, delimiter }));
		}
	};

	const updateEncoding = (encoding: CsvEncoding) => {
		if (browser) {
			csvSettings.update((s) => ({ ...s, encoding }));
		}
	};
</script>

<div class="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
	<input type="checkbox" />
	<div class="collapse-title">
		<div class="flex items-center gap-3">
			<div class="bg-base-300/50 text-base-content/70 rounded-lg p-2">
				<i class="fas fa-cog text-lg"></i>
			</div>
			<div>
				<span class="font-medium">{m.csvExportSettings()}</span>
				<span class="text-sm text-base-content/60 ml-2">
					{getDelimiterLabel(currentSettings.delimiter)}, {getEncodingLabel(currentSettings.encoding)}
				</span>
			</div>
		</div>
	</div>
	<div class="collapse-content">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
			<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
				<legend class="fieldset-legend">{m.csvDelimiter()}</legend>
				<select
					class="select select-bordered w-full"
					value={currentSettings.delimiter}
					onchange={(e) => updateDelimiter(e.currentTarget.value as CsvDelimiter)}
				>
					{#each delimiters as delimiter}
						<option value={delimiter}>{getDelimiterLabel(delimiter)}</option>
					{/each}
				</select>
				<p class="text-xs text-base-content/50 mt-2">{m.csvDelimiterDescription()}</p>
			</fieldset>

			<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
				<legend class="fieldset-legend">{m.csvEncoding()}</legend>
				<select
					class="select select-bordered w-full"
					value={currentSettings.encoding}
					onchange={(e) => updateEncoding(e.currentTarget.value as CsvEncoding)}
				>
					{#each encodings as encoding}
						<option value={encoding}>{getEncodingLabel(encoding)}</option>
					{/each}
				</select>
				<p class="text-xs text-base-content/50 mt-2">{m.csvEncodingDescription()}</p>
			</fieldset>
		</div>
	</div>
</div>
