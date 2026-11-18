import { SvelteMap } from 'svelte/reactivity';
import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import type { ConfigChange } from '../configuration/changePreview';
import { emailKindTexts } from '#lib/helpers/emailKindTexts';

/** An automatic mail switched on or off on the page, not saved yet. */
export interface EmailChange {
	kind: EmailkindEnum;
	enabled: boolean;
	/** Switching on: whether those it already applies to (`openCount`) get it once saved. */
	notifyExisting: boolean;
	openCount: number;
}

/** The sending pace changed on the page, not saved yet; `null` lifts the limit. */
export interface EmailsPerSecondChange {
	before: number | null;
	after: number | null;
}

/**
 * The switches and the sending pace of the e-mail page, held until its save button. `revision`
 * counts the saves, for whatever is worked out from the log.
 */
export function createEmailChanges() {
	const staged = new SvelteMap<EmailkindEnum, EmailChange>();
	let pace = $state<EmailsPerSecondChange>();
	let revision = $state(0);

	return {
		get list() {
			return [...staged.values()];
		},
		get pace() {
			return pace;
		},
		/** What the pace field shows: the staged value, else what is stored. */
		paceOf: (stored: number | null) => (pace ? pace.after : stored),
		/** Going back to what is stored drops the change. */
		stagePace(change: EmailsPerSecondChange) {
			pace = change.after === change.before ? undefined : change;
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
		/**
		 * Drops the changes that were saved. One staged while the save was on its way is a change of
		 * its own, and stays for the next save.
		 */
		saved(done: { pace: EmailsPerSecondChange | undefined; switches: readonly EmailChange[] }) {
			for (const change of done.switches) {
				if (staged.get(change.kind) === change) staged.delete(change.kind);
			}
			if (pace === done.pace) pace = undefined;
			revision++;
		}
	};
}

export type EmailChanges = ReturnType<typeof createEmailChanges>;

const paceLabel = (value: number | null) =>
	value === null ? m.emailsPerSecondUnlimited() : m.emailsPerSecondValue({ count: value });

/** The staged pace and switches as entries of the save preview. */
export function emailConfigChanges({
	switches,
	pace
}: {
	switches: readonly EmailChange[];
	pace: EmailsPerSecondChange | undefined;
}): ConfigChange[] {
	const paceChange: ConfigChange[] = pace
		? [
				{
					key: 'email:pace',
					group: 'emails',
					label: m.emailsPerSecondTitle(),
					before: paceLabel(pace.before),
					after: paceLabel(pace.after),
					isFile: false,
					highImpact: false
				}
			]
		: [];
	return [...paceChange, ...switchChanges(switches)];
}

function switchChanges(changes: readonly EmailChange[]): ConfigChange[] {
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
