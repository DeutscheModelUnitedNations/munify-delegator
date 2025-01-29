<script lang="ts">
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	//@ts-expect-error – numeral does not have type definitions
	import numeral from 'numeral';
	import SingleStatFromWb from './SingleStatFromWB.svelte';

	interface Props {
		countryCode: string;
	}

	let { countryCode }: Props = $props();

	const stats = [
		{
			icon: 'users',
			title: 'Bevölkerung',
			desc: 'Einwohnerzahl',
			wbIndicator: 'SP.POP.TOTL',
			formatter: (value: number) => {
				if (value >= 10 ** 9) {
					return numeral(value / 10 ** 9).format('0.0a') + ' Mrd.';
				} else if (value >= 10 ** 6) {
					return numeral(value / 10 ** 6).format('0.0a') + ' Mio.';
				} else {
					return numeral(value).format('0.0a');
				}
			}
		},
		{
			icon: 'chart-line-up',
			title: 'Bruttoinlandsprodukt (BIP)',
			desc: 'US-Dollar',
			wbIndicator: 'NY.GDP.MKTP.CD',
			formatter: (value: number) => {
				if (value >= 10 ** 12) {
					return numeral(value / 10 ** 12).format('0.0a') + ' Bio.';
				} else if (value >= 10 ** 9) {
					return numeral(value / 10 ** 9).format('0.0a') + ' Mrd.';
				} else if (value >= 10 ** 6) {
					return numeral(value / 10 ** 6).format('0.0a') + ' Mio.';
				} else {
					return numeral(value).format('0.0a');
				}
			}
		},
		{
			icon: 'chart-line-up',
			title: 'BIP pro Kopf',
			desc: 'US-Dollar',
			wbIndicator: 'NY.GDP.PCAP.CD',
			formatter: (value: number) => {
				return numeral(value).format('0.0a');
			}
		},
		{
			icon: 'heart-pulse',
			title: 'Lebenserwartung',
			desc: 'Jahre bei Geburt',
			wbIndicator: 'SP.DYN.LE00.IN',
			formatter: (value: number) => {
				return numeral(value).format('0.0a');
			}
		},

		{
			icon: 'school-circle-check',
			title: 'Alphabetisierungsrate',
			desc: 'Anteil der Lesefähigen',
			wbIndicator: 'SE.ADT.LITR.ZS',
			formatter: (value: number) => {
				return numeral(value).format('0.0a') + ' %';
			}
		},
		{
			icon: 'file-contract',
			title: 'Arbeitslosenquote',
			desc: 'der Erwerbsfähigen',
			wbIndicator: 'SL.UEM.TOTL.ZS',
			formatter: (value: number) => {
				return numeral(value).format('0.0a') + ' %';
			}
		}
	];
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
	<div class="stats col-span-1 shadow md:col-span-2 xl:col-span-3">
		<div class="stat bg-base-200">
			<div class="stat-figure text-primary">
				<i class="fa-duotone fa-flag text-3xl"></i>
			</div>
			<div class="stat-title">Offizieller Landesname</div>
			<div class="stat-value">{getFullTranslatedCountryNameFromISO3Code(countryCode)}</div>
		</div>
	</div>
	{#each stats as stat}
		<SingleStatFromWb {...stat} {countryCode} />
	{/each}
</div>
<h5 class="mt-4 text-xs">
	Die Daten stammen zum großen Teil von der offenen Datenschnittstelle (API) der World Bank. Da es
	sich um einen Drittanbieterdienst handelt, kann das Abrufen kann manchmal etwas Zeit in Anspruch
	nehmen und die Daten sind nicht immer aktuell. Es gibt keine Garantie für Richtigkeit. Wir freuen
	uns über Anregungen, welche weiteren Daten wir hier anzeigen sollen.
</h5>
