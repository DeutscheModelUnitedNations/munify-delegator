import type { Component } from 'svelte';
import { m } from '#lib/paraglide/messages';
import Codes from './scenes/Codes.svelte';
import Crumple from './scenes/Crumple.svelte';
import FillIn from './scenes/FillIn.svelte';
import Intro from './scenes/Intro.svelte';
import Order from './scenes/Order.svelte';
import PaperKind from './scenes/PaperKind.svelte';
import Print from './scenes/Print.svelte';
import Read from './scenes/Read.svelte';
import Signature from './scenes/Signature.svelte';
import Sleeve from './scenes/Sleeve.svelte';
import Staple from './scenes/Staple.svelte';
import { SCENE_MS } from './timing';

/** One step of an animated guide (`PostalGuide`, and the payment guide that shares its frame). */
export interface GuideStep {
	id: string;
	/** The looping animation (`scenes/Scene`). */
	scene: Component;
	title: () => string;
	text: () => string;
	/** Highlighted below the text. */
	warning?: () => string;
	/** Marked by a big exclamation mark. */
	important?: boolean;
	/** What the list at the end says of it; nothing for the introduction. */
	done?: readonly { icon: string; text: () => string; dont?: boolean }[];
}

/** What the postal guide goes through, in the order it is done: from reading to the envelope. */
export const GUIDE_STEPS: readonly GuideStep[] = [
	{
		id: 'read',
		scene: Read,
		title: m.postalGuideReadTitle,
		text: m.postalGuideReadText,
		warning: m.postalGuideReadWarning,
		done: [{ icon: 'book-open-text', text: m.postalGuideDoneRead }]
	},
	{
		id: 'fill-in',
		scene: FillIn,
		title: m.postalGuideFillInTitle,
		text: m.postalGuideFillInText,
		warning: m.postalGuideFillInWarning,
		done: [{ icon: 'pencil-line', text: m.postalGuideDoneFillIn }]
	},
	{
		id: 'print',
		scene: Print,
		title: m.postalGuidePrintTitle,
		text: m.postalGuidePrintText,
		done: [
			{ icon: 'printer', text: m.postalGuideDoneActualSize },
			{ icon: 'x-circle', text: m.postalGuideDoneTerms, dont: true }
		]
	},
	{
		id: 'paper',
		scene: PaperKind,
		title: m.postalGuidePaperTitle,
		text: m.postalGuidePaperText,
		done: [{ icon: 'file', text: m.postalGuideDonePaper }]
	},
	{
		id: 'signature',
		scene: Signature,
		title: m.postalGuideSignatureTitle,
		text: m.postalGuideSignatureText,
		important: true,
		done: [{ icon: 'signature', text: m.postalGuideDoneSignature }]
	},
	{
		id: 'intro',
		scene: Intro,
		title: m.postalGuideIntroTitle,
		text: m.postalGuideIntroText,
		warning: m.postalGuideWarning
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
		done: [{ icon: 'stack', text: m.postalGuideDoneOrder }]
	}
];

/** How long each step has to be watched: as long as its scene plays. */
export const GUIDE_DURATIONS = GUIDE_STEPS.map(() => SCENE_MS);
