import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import type { Audience, TemplateSlot } from '#lib/guide/outline';

/**
 * The arguments of the sidebar's single changes (`addGuideSection`, …), checked and turned into
 * the outline's shapes (`#lib/guide/outline`).
 */

const invalid = () => m.guideOutlineInvalid();
const id = z.string().min(1).max(100);

export const AUDIENCE_TYPES = [
	'everyone',
	'delegates',
	'nonStateActors',
	'customRoles',
	'supervisors'
] as const;

/** `{ type, roleIds }`: custom roles need at least one role, the others take none. */
export const audienceArgSchema = z
	.object({
		type: z.enum(AUDIENCE_TYPES),
		roleIds: z.array(id).max(100).nullish()
	})
	.transform((value, ctx): Audience => {
		if (value.type !== 'customRoles') return { type: value.type };
		const roleIds = [...new Set(value.roleIds ?? [])];
		if (roleIds.length === 0) {
			ctx.addIssue({ code: 'custom', message: invalid() });
			return z.NEVER;
		}
		return { type: 'customRoles', roleIds };
	});

export const SLOT_TYPES = ['page', 'committeePage', 'agendaItemPages'] as const;

const label = z.string().trim().max(200, { error: invalid });

/** A template slot: a page slot names its page; agenda item pages take no label. */
const slotArgSchema = z
	.object({ type: z.enum(SLOT_TYPES), pageId: id.nullish(), label: label.nullish() })
	.transform((value, ctx): TemplateSlot => {
		const named = value.label ? { label: value.label } : {};
		if (value.type === 'agendaItemPages') return { type: value.type };
		if (value.type === 'committeePage') return { type: value.type, ...named };
		if (!value.pageId) {
			ctx.addIssue({ code: 'custom', message: invalid() });
			return z.NEVER;
		}
		return { type: 'page', pageId: value.pageId, ...named };
	});

export const slotsArgSchema = z.array(slotArgSchema).max(100, { error: invalid });

export const titleArgSchema = z.string().trim().min(1, { error: invalid }).max(200, {
	error: invalid
});

/** An entry's label; empty means the page's own title. */
export const labelArgSchema = label;
