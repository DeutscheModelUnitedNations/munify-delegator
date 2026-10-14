type IdentityField = 'givenName' | 'familyName' | 'birthday';

/** The identity update that changes only `field`; a birthday is sent as a date. */
export function identityUpdate(field: IdentityField, value: string) {
	return {
		givenName: field === 'givenName' ? value : undefined,
		familyName: field === 'familyName' ? value : undefined,
		birthday: field === 'birthday' ? new Date(value) : undefined
	};
}
