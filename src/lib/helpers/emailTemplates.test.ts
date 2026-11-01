import { describe, expect, test } from 'vitest';
import { defaultEmailText, placeholdersOf } from './emailTemplates';
import { EMAIL_GROUPS } from './emailKinds';

describe('the default texts', () => {
	test.each(['de', 'en'] as const)('use only the placeholders their kind offers (%s)', (locale) => {
		for (const kind of EMAIL_GROUPS.flatMap((group) => group.kinds)) {
			const text = defaultEmailText({ kind, locale });
			const used = [...`${text.subject} ${text.heading} ${text.body}`.matchAll(/\{(\w+)\}/g)].map(
				(match) => match[1]
			);
			for (const placeholder of used) {
				expect(placeholdersOf(kind)).toContain(placeholder);
			}
		}
	});

	test('offer no name to an invitation, which goes to someone without an account', () => {
		expect(placeholdersOf('TEAM_INVITATION')).not.toContain('name');
		expect(placeholdersOf('TEAM_INVITATION')).toEqual(
			expect.arrayContaining(['conference', 'role', 'inviter', 'date'])
		);
		expect(placeholdersOf('TEAM_WELCOME')).toContain('name');
	});
});
