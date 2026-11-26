import { m } from '#lib/paraglide/messages';
import type { StatusOption } from '#lib/components/userCard/ui/StateMenu.svelte';
import type { FieldState } from '#lib/paperScan/readPaper';

/** What a detail can be; `null` for nothing recorded, which takes no room. */
export const agreementStateOptions = (): StatusOption<FieldState | null>[] => [
	{ value: null, label: m.agreementStateUnknown(), short: '–', tone: 'neutral' },
	{ value: 'yes', label: m.agreementStateYes(), icon: 'check-circle', tone: 'success' },
	{ value: 'no', label: m.agreementStateNo(), icon: 'x-circle', tone: 'neutral' },
	{ value: 'unclear', label: m.agreementStateUnclear(), icon: 'question', tone: 'warning' }
];
