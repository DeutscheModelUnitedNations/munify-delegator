import { startTour } from '@deutschemodelunitednations/docs-kit/tour';
import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * Starts a tour on the current page, in the app's words. Loaded lazily: it brings driver.js and
 * its stylesheet.
 */
export function runTour(tour: Tour) {
	startTour({
		tour,
		labels: {
			next: m.tourNext(),
			previous: m.tourPrevious(),
			done: m.tourDone(),
			progress: m.tourProgress({ current: '{{current}}', total: '{{total}}' })
		}
	});
}
