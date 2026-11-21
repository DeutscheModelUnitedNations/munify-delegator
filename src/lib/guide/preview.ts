/**
 * Whose guide the team previews (`team/guide-sidebar`): a choice of the preview's select,
 * `DELEGATE:<committeeId>`, `CUSTOM_ROLE:<roleId>` or a plain audience, as `myGuide`'s arguments.
 */

const AUDIENCES = [
	'EVERYTHING',
	'DELEGATE',
	'NON_STATE_ACTOR',
	'CUSTOM_ROLE',
	'SUPERVISOR'
] as const;
type PreviewAudience = (typeof AUDIENCES)[number];

export function previewArgsOf({ choice, draft }: { choice: string; draft: boolean }) {
	const [kind, id] = choice.split(':');
	const previewAs: PreviewAudience =
		AUDIENCES.find((audience) => audience === kind) ?? 'EVERYTHING';
	return {
		previewAs,
		committeeId: previewAs === 'DELEGATE' ? id : undefined,
		roleId: previewAs === 'CUSTOM_ROLE' ? id : undefined,
		draft
	};
}
