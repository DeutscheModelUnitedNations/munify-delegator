import { SvelteMap } from 'svelte/reactivity';
import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import type { ConfigChange } from '../changePreview';
import { emailKindTexts } from '#lib/helpers/emailKindTexts';

/** An automatic mail switched on or off on the page, not saved yet. */
export interface EmailChange {
	kind: EmailkindEnum;
	enabled: boolean;
	/** Switching on: whether those it already applies to (`openCount`) get it once saved. */
	notifyExisting: boolean;
	openCount: number;
}

/**
 * The switches of the e-mail page, held until its save button. `revision` counts the saves, for
 * whatever is worked out from the log.
 */
export function createEmailChanges() {
	const staged = new SvelteMap<EmailkindEnum, EmailChange>();
	let revision = $state(0);

	return {
		get list() {
			return [...staged.values()];
		},
		get revision() {
			return revision;
		},
		has: (kind: EmailkindEnum) => staged.has(kind),
		/** What the switch shows: the staged value, else what is stored. */
		enabledOf: (kind: EmailkindEnum, stored: boolean) => staged.get(kind)?.enabled ?? stored,
		/** Switching back to what is stored drops the change. */
		stage({ change, stored }: { change: EmailChange; stored: boolean }) {
			if (change.enabled === stored) staged.delete(change.kind);
			else staged.set(change.kind, change);
		},
		saved() {
			staged.clear();
			revision++;
		}
	};
}

export type EmailChanges = ReturnType<typeof createEmailChanges>;

/** The staged switches as entries of the save preview. */
export function emailConfigChanges(changes: readonly EmailChange[]): ConfigChange[] {
	return changes.map((change) => {
		const sendsNow = change.enabled && change.notifyExisting && change.openCount > 0;
		return {
			key: `email:${change.kind}`,
			group: 'emails',
			label: emailKindTexts(change.kind).title,
			before: change.enabled ? m.off() : m.on(),
			after: change.enabled ? m.on() : m.off(),
			isFile: false,
			highImpact: sendsNow,
			note: !change.enabled
				? undefined
				: sendsNow
					? m.emailChangeSendsNow({ count: change.openCount })
					: change.openCount > 0
						? m.emailChangeFutureOnly({ count: change.openCount })
						: undefined
		};
	});
}
