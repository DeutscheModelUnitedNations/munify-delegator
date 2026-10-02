/** What "save and next" writes for one scanned person. */
export interface AccessFlowSave {
	userId: string;
	statusId: string | undefined;
	/** The access card to store, if one was entered. */
	accessCardId: string | undefined;
	/** The occasion to record attendance for, if one is set. */
	occasion: string | undefined;
}

const nonBlank = (value: string) => value.trim() || undefined;

/** The save for the scanned person, or `undefined` when nobody is loaded. */
export function planAccessFlowSave(
	data: { user: { id: string } | null; status: { id: string } | null } | undefined,
	accessCardInput: string,
	occasion: string
): AccessFlowSave | undefined {
	if (!data?.user) return undefined;
	return {
		userId: data.user.id,
		statusId: data.status?.id,
		accessCardId: nonBlank(accessCardInput),
		occasion: nonBlank(occasion)
	};
}

/** Whether the save writes anything at all. */
export function savesAnything(save: AccessFlowSave) {
	return save.accessCardId !== undefined || save.occasion !== undefined;
}

type IdentityField = 'givenName' | 'familyName' | 'birthday';

/** The identity update that changes only `field`; a birthday is sent as a date. */
export function identityUpdate(field: IdentityField, value: string) {
	return {
		givenName: field === 'givenName' ? value : undefined,
		familyName: field === 'familyName' ? value : undefined,
		birthday: field === 'birthday' ? new Date(value) : undefined
	};
}
