<script lang="ts">
	import { page } from '$app/state';
	import { HelpMenu } from '@deutschemodelunitednations/docs-kit/components';
	import { m } from '#lib/paraglide/messages';
	import { DOCS_ICON_PREFIX } from './render';
	import { helpForRoute } from './help';

	/**
	 * The header's help button: the manual page of the route on screen and, where there is one,
	 * its guided tour. Only the route id is read from `page`, never its params.
	 */
	const help = $derived(helpForRoute(page.route.id));

	async function takeTour() {
		if (!help.tour) return;
		// driver.js and its styles load only when a tour actually starts
		const [{ runTour }, tour] = await Promise.all([import('./runTour'), help.tour()]);
		runTour(tour);
	}
</script>

<HelpMenu
	manualHref={help.manualHref}
	labels={{
		help: m.help(),
		manual: help.specific ? m.helpManualForPage() : m.helpManual(),
		tour: m.tourStart()
	}}
	onTour={help.tour ? takeTour : undefined}
	iconPrefix={DOCS_ICON_PREFIX}
/>
