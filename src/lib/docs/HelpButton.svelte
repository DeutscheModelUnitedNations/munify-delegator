<script lang="ts">
	import { page } from '$app/state';
	import { HelpMenu } from '@deutschemodelunitednations/docs-kit/components';
	import { m } from '#lib/paraglide/messages';
	import { DOCS_ICON_PREFIX } from './render';
	import { helpForRoute, takeTour } from './help';

	/**
	 * The header's help button: the manual page of the route on screen and, where there is one,
	 * its guided tour. Only the route id is read from `page`, never its params.
	 */
	const help = $derived(helpForRoute(page.route.id));

	const tour = $derived(help.tour);
</script>

<HelpMenu
	manualHref={help.manualHref}
	labels={{
		help: m.help(),
		manual: help.specific ? m.helpManualForPage() : m.helpManual(),
		tour: m.tourStart()
	}}
	onTour={tour ? () => takeTour(tour) : undefined}
	iconPrefix={DOCS_ICON_PREFIX}
/>
