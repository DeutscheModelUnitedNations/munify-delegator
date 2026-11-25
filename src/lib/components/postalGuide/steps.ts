import type { Component } from 'svelte';
import { m } from '#lib/paraglide/messages';
import Codes from './scenes/Codes.svelte';
import Crumple from './scenes/Crumple.svelte';
import Intro from './scenes/Intro.svelte';
import Order from './scenes/Order.svelte';
import PaperKind from './scenes/PaperKind.svelte';
import SingleSided from './scenes/SingleSided.svelte';
import Sleeve from './scenes/Sleeve.svelte';
import Staple from './scenes/Staple.svelte';
import { SCENE_MS } from './timing';

interface GuideStep {
	id: string;
	scene: Component;
	title: () => string;
	text: () => string;
	/** What the list at the end says of it; nothing for the introduction. */
	done?: readonly { icon: string; text: () => string; dont?: boolean }[];
}

/** What the postal guide goes through, in this order. */
export const GUIDE_STEPS: readonly GuideStep[] = [
	{
		id: 'intro',
		scene: Intro,
		title: m.postalGuideIntroTitle,
		text: m.postalGuideIntroText
	},
	{
		id: 'staple',
		scene: Staple,
		title: m.postalGuideStapleTitle,
		text: m.postalGuideStapleText,
		done: [{ icon: 'paperclip', text: m.postalGuideDoneLoose }]
	},
	{
		id: 'sleeve',
		scene: Sleeve,
		title: m.postalGuideSleeveTitle,
		text: m.postalGuideSleeveText,
		done: [{ icon: 'folder-open', text: m.postalGuideDoneSleeve }]
	},
	{
		id: 'crumple',
		scene: Crumple,
		title: m.postalGuideCrumpleTitle,
		text: m.postalGuideCrumpleText,
		done: [{ icon: 'envelope-simple', text: m.postalGuideDoneFlat }]
	},
	{
		id: 'paper',
		scene: PaperKind,
		title: m.postalGuidePaperTitle,
		text: m.postalGuidePaperText,
		done: [{ icon: 'file', text: m.postalGuideDonePaper }]
	},
	{
		id: 'single-sided',
		scene: SingleSided,
		title: m.postalGuideSingleSidedTitle,
		text: m.postalGuideSingleSidedText,
		done: [{ icon: 'printer', text: m.postalGuideDoneSingleSided }]
	},
	{
		id: 'codes',
		scene: Codes,
		title: m.postalGuideCodesTitle,
		text: m.postalGuideCodesText,
		done: [{ icon: 'qr-code', text: m.postalGuideDoneCodes }]
	},
	{
		id: 'order',
		scene: Order,
		title: m.postalGuideOrderTitle,
		text: m.postalGuideOrderText,
		done: [
			{ icon: 'stack', text: m.postalGuideDoneOrder },
			{ icon: 'x-circle', text: m.postalGuideDoneTerms, dont: true }
		]
	}
];

/** How long each step has to be watched: as long as its scene plays. */
export const GUIDE_DURATIONS = GUIDE_STEPS.map(() => SCENE_MS);
