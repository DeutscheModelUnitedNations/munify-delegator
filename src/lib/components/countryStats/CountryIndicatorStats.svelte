<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { getLocale } from '#lib/paraglide/runtime';
	import { indicatorCards } from '#lib/countryStats/indicatorCards';

	let { countryCode }: { countryCode: string } = $props();

	// The World Bank's figures, fetched and cached by the server: they change once a year, so a
	// one-shot query is enough
	const figures = $derived(
		await client.query.countryIndicators({
			__args: { alpha3Code: countryCode },
			indicator: true,
			value: true,
			year: true
		})
	);

	const stats = $derived(indicatorCards({ figures, locale: getLocale() }));
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
	{#each stats as stat (stat.code)}
		<div class="stats bg-base-200 shadow">
			<div class="stat">
				<div class="stat-figure text-primary">
					<i aria-hidden="true" class="ph-duotone ph-{stat.icon} text-3xl"></i>
				</div>
				<div class="stat-title">{stat.title}</div>
				<div class="stat-value text-2xl">{stat.value}</div>
				<div class="stat-desc whitespace-normal">{stat.desc}</div>
			</div>
		</div>
	{/each}
</div>
