import { docsSuite, tourAnchorsSuite } from '@deutschemodelunitednations/docs-kit/testing';
import { nav } from './nav';
import { renderDelegatorDoc } from './render';
import { routeHelp } from './routeHelp';

// Keeps the manual consistent: every page is in the sidebar and in both languages, links,
// sections, screenshots and help targets point at things that exist, and every screenshot in the
// shot list is used. Links are checked without the locale prefix the app adds for English.
docsSuite({
	locales: ['de', 'en'],
	nav,
	render: renderDelegatorDoc,
	shotsManifest: 'scripts/docs-screenshots/shots.ts',
	helpTargets: Object.fromEntries(
		Object.entries(routeHelp).map(([route, help]) => [route, help?.docs])
	)
});

// Fails when a component loses a `data-tour` anchor that a tour still points at
tourAnchorsSuite();
