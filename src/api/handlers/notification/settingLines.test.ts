import { describe, expect, it } from 'vitest';
import { settingLines, type SettingsMember } from './settingLines';

const chair: SettingsMember = {
	id: 'tm1',
	userId: 'u1',
	role: 'PARTICIPANT_CARE',
	functions: [
		{
			id: 'f-ga',
			committeeId: 'ga',
			kind: 'CHAIR',
			committee: { abbreviation: 'GA', name: 'Generalversammlung' }
		}
	]
};

describe('settingLines', () => {
	it('lists a line per topic with the defaults', () => {
		const lines = settingLines({ member: chair, preferences: [], mailByDefault: true });
		expect(lines).toEqual([
			{
				id: 'tm1:PARTICIPANT_CARE:',
				topic: 'PARTICIPANT_CARE',
				teamFunctionId: null,
				functionKind: null,
				committeeAbbreviation: null,
				committeeName: null,
				roleName: null,
				email: true,
				slack: true
			},
			{
				id: 'tm1:COMMITTEE_INBOX:f-ga',
				topic: 'COMMITTEE_INBOX',
				teamFunctionId: 'f-ga',
				functionKind: 'CHAIR',
				committeeAbbreviation: 'GA',
				committeeName: 'Generalversammlung',
				roleName: null,
				email: true,
				slack: true
			},
			expect.objectContaining({ id: 'tm1:CHAT_GROUP:f-ga', topic: 'CHAT_GROUP' }),
			{
				id: 'tm1:COMMITTEE_PAPERS:f-ga',
				topic: 'COMMITTEE_PAPERS',
				teamFunctionId: 'f-ga',
				functionKind: 'CHAIR',
				committeeAbbreviation: 'GA',
				committeeName: 'Generalversammlung',
				roleName: null,
				email: true,
				slack: true
			},
			expect.objectContaining({ id: 'tm1:CHAT_REPORT:', topic: 'CHAT_REPORT' }),
			expect.objectContaining({ id: 'tm1:SCAN_PROBLEM:', topic: 'SCAN_PROBLEM' })
		]);
	});

	it('shows the stored choices on their own line and channel', () => {
		const lines = settingLines({
			member: chair,
			preferences: [
				{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-ga', channel: 'SLACK', enabled: false },
				{ topic: 'CHAT_REPORT', teamFunctionId: null, channel: 'EMAIL', enabled: false }
			],
			mailByDefault: true
		});
		expect(lines.map(({ topic, email, slack }) => ({ topic, email, slack }))).toEqual([
			{ topic: 'PARTICIPANT_CARE', email: true, slack: true },
			{ topic: 'COMMITTEE_INBOX', email: true, slack: false },
			{ topic: 'CHAT_GROUP', email: true, slack: true },
			{ topic: 'COMMITTEE_PAPERS', email: true, slack: true },
			{ topic: 'CHAT_REPORT', email: false, slack: true },
			{ topic: 'SCAN_PROBLEM', email: true, slack: true }
		]);
	});

	it('starts with mail off for whoever switched the unread mails off before', () => {
		const lines = settingLines({ member: chair, preferences: [], mailByDefault: false });
		expect(lines.every((line) => !line.email && line.slack)).toBe(true);
	});

	it("names the custom role a support function looks after on its inbox's and group's line", () => {
		const support: SettingsMember = {
			id: 'tm3',
			userId: 'u3',
			role: 'MEMBER',
			functions: [
				{
					id: 'f-press',
					committeeId: null,
					roleId: 'press',
					kind: 'ROLE_SUPPORT',
					role: { name: 'Presse' }
				}
			]
		};
		expect(
			settingLines({ member: support, preferences: [], mailByDefault: true }).map(
				({ topic, roleName }) => ({ topic, roleName })
			)
		).toEqual([
			{ topic: 'ROLE_INBOX', roleName: 'Presse' },
			{ topic: 'CHAT_GROUP', roleName: 'Presse' }
		]);
	});

	it('is empty for a member who answers nothing', () => {
		const plain = { id: 'tm2', userId: 'u2', role: 'MEMBER', functions: [] };
		expect(settingLines({ member: plain, preferences: [], mailByDefault: true })).toEqual([]);
	});

	it('names a function whose committee was not loaded by its kind alone', () => {
		const bare: SettingsMember = {
			...chair,
			role: 'MEMBER',
			functions: [{ id: 'f-sc', committeeId: 'sc', kind: 'CONSULTANT' }]
		};
		const nameless = expect.objectContaining({
			functionKind: 'CONSULTANT',
			committeeAbbreviation: null,
			committeeName: null
		});
		expect(settingLines({ member: bare, preferences: [], mailByDefault: true })).toEqual([
			nameless,
			nameless
		]);
	});
});
