<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import {
		csvSettings,
		getDelimiterLabel,
		getEncodingLabel,
		type CsvDelimiter,
		type CsvEncoding
	} from '$lib/state/csvSettings';

	const delimiters: CsvDelimiter[] = [';', ',', '\t', '|'];
	const encodings: CsvEncoding[] = ['utf-8', 'utf-8-bom', 'iso-8859-1'];

	const currentSettings = $derived(csvSettings.current);

	const updateDelimiter = (delimiter: CsvDelimiter) => {
		csvSettings.current = { ...csvSettings.current, delimiter };
	};

	const updateEncoding = (encoding: CsvEncoding) => {
		csvSettings.current = { ...csvSettings.current, encoding };
	};
</script>

<div class="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
	<input type="checkbox" />
	<div class="collapse-title p-6">
		<div class="flex items-center gap-3">
			<div
				class="bg-base-300/50 text-base-content/70 rounded-box p-3 w-12 h-12 flex justify-center items-center"
			>
				<i class="fas fa-cog text-lg"></i>
			</div>
			<div>
				<span class="font-medium">{m.csvExportSettings()}</span>
				<span class="text-sm text-base-content/60 ml-2">
					{getDelimiterLabel(currentSettings.delimiter)}, {getEncodingLabel(
						currentSettings.encoding
					)}
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
					{#each delimiters as delimiter (delimiter)}
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
					{#each encodings as encoding (encoding)}
						<option value={encoding}>{getEncodingLabel(encoding)}</option>
					{/each}
				</select>
				<p class="text-xs text-base-content/50 mt-2">{m.csvEncodingDescription()}</p>
			</fieldset>
		</div>
	</div>
</div>
