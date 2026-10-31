import { describe, expect, test } from 'vitest';
import { findFileSource, formatMegabytes } from './fileSources';
import { rolesWithTeamPermission } from '#lib/helpers/teamRoles';

describe('findFileSource', () => {
	test('maps a route to its column, purpose, limits and caching', () => {
		expect(findFileSource({ kind: 'conference', field: 'logo' })).toMatchObject({
			kind: 'conference',
			field: 'logo',
			purpose: 'conference/logo',
			column: 'logoFileId',
			permission: 'manageConference'
		});
		expect(findFileSource({ kind: 'conference', field: 'certificate' })).toMatchObject({
			mimeTypes: ['application/pdf']
		});
		expect(findFileSource({ kind: 'resolution', field: 'content' })?.column).toBe('fileId');
	});

	test('lets the content roles upload templates, but only project management the pictures', () => {
		expect(findFileSource({ kind: 'conference', field: 'contract' })?.permission).toBe(
			'editConferenceContent'
		);
		expect(rolesWithTeamPermission('editConferenceContent')).toContain('CONTENT_LEAD');
		expect(findFileSource({ kind: 'conference', field: 'emblem' })?.permission).toBe(
			'manageConference'
		);
		expect(rolesWithTeamPermission('manageConference')).not.toContain('CONTENT_LEAD');
	});

	test('does not serve anything that is not listed', () => {
		expect(findFileSource({ kind: 'user', field: 'avatar' })).toBeUndefined();
		expect(findFileSource({ kind: 'conference', field: 'iban' })).toBeUndefined();
		expect(findFileSource({ kind: 'conference', field: 'constructor' })).toBeUndefined();
		expect(findFileSource({ kind: 'constructor', field: 'logo' })).toBeUndefined();
	});
});

describe('formatMegabytes', () => {
	test('rounds to a tenth', () => {
		expect(formatMegabytes(10_000_000)).toBe('10 MB');
		expect(formatMegabytes(1_250_000)).toBe('1.3 MB');
	});
});
