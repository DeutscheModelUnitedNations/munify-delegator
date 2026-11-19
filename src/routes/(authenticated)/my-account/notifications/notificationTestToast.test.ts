import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { notificationTestToast } from './notificationTestToast';

describe('notificationTestToast', () => {
	test('says where to look once a test is sent', () => {
		expect(notificationTestToast({ channel: 'EMAIL', result: 'SENT' })).toEqual({
			success: true,
			message: m.notificationTestEmailSent()
		});
		expect(notificationTestToast({ channel: 'SLACK', result: 'SENT' })).toEqual({
			success: true,
			message: m.slackTestSent()
		});
	});

	test('says why a test did not go out', () => {
		expect(notificationTestToast({ channel: 'EMAIL', result: 'UNAVAILABLE' })).toEqual({
			success: false,
			message: m.notificationTestEmailFailed()
		});
		expect(notificationTestToast({ channel: 'EMAIL', result: undefined }).success).toBe(false);
		expect(notificationTestToast({ channel: 'SLACK', result: 'NOT_FOUND' }).message).toBe(
			m.slackNotFoundShort()
		);
		expect(notificationTestToast({ channel: 'SLACK', result: 'UNAVAILABLE' }).message).toBe(
			m.slackUnavailable()
		);
		expect(notificationTestToast({ channel: 'SLACK', result: undefined }).message).toBe(
			m.slackUnavailable()
		);
	});
});
