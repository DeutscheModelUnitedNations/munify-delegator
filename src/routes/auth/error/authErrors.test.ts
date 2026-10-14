import { describe, expect, test } from 'vitest';
import { m } from '$lib/paraglide/messages';
import {
	authErrorDescription,
	authErrorTitle,
	isAccessError,
	parseAuthErrorType,
	type AuthErrorType
} from './authErrors';

describe('parseAuthErrorType', () => {
	test('recognises the known error types', () => {
		expect(parseAuthErrorType('access_denied')).toBe('access_denied');
		expect(parseAuthErrorType('network_error')).toBe('network_error');
	});

	test('reports anything else as unknown', () => {
		expect(parseAuthErrorType(null)).toBe('unknown');
		expect(parseAuthErrorType('<script>')).toBe('unknown');
	});
});

describe('isAccessError', () => {
	test('is true for errors that keep the person out', () => {
		expect(isAccessError('access_denied')).toBe(true);
		expect(isAccessError('consent_required')).toBe(true);
		expect(isAccessError('login_required')).toBe(true);
		expect(isAccessError('server_error')).toBe(false);
		expect(isAccessError('unknown')).toBe(false);
	});
});

describe('authErrorTitle', () => {
	test.each<[AuthErrorType, string]>([
		['access_denied', m.authErrorAccessDeniedTitle()],
		['login_required', m.authErrorLoginRequiredTitle()],
		['consent_required', m.authErrorLoginRequiredTitle()],
		['server_error', m.authErrorProviderUnavailableTitle()],
		['temporarily_unavailable', m.authErrorProviderUnavailableTitle()],
		['token_exchange_failed', m.authErrorTechnicalTitle()],
		['state_mismatch', m.authErrorTechnicalTitle()],
		['network_error', m.authErrorTechnicalTitle()],
		['invalid_request', m.authErrorGenericTitle()],
		['unknown', m.authErrorGenericTitle()]
	])('%s', (type, title) => {
		expect(authErrorTitle(type)).toBe(title);
	});
});

describe('authErrorDescription', () => {
	test.each<[AuthErrorType, string]>([
		['access_denied', m.authErrorAccessDeniedDescription()],
		['login_required', m.authErrorLoginRequiredDescription()],
		['consent_required', m.authErrorLoginRequiredDescription()],
		['server_error', m.authErrorProviderUnavailableDescription()],
		['temporarily_unavailable', m.authErrorProviderUnavailableDescription()],
		['token_exchange_failed', m.authErrorTokenExchangeDescription()],
		['state_mismatch', m.authErrorStateMismatchDescription()],
		['network_error', m.authErrorNetworkDescription()],
		['invalid_request', m.authErrorGenericDescription()],
		['unknown', m.authErrorGenericDescription()]
	])('%s', (type, description) => {
		expect(authErrorDescription(type)).toBe(description);
	});
});
