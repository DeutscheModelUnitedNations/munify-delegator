import { describe, expect, test } from 'vitest';
import { dropFailedFetches, isFailedFetch } from './sentryNoise';

describe('isFailedFetch', () => {
	test('takes cancelled and unsent fetches', () => {
		expect(isFailedFetch(new DOMException('Fetch is aborted', 'AbortError'))).toBe(true);
		expect(isFailedFetch(new TypeError('Load failed'))).toBe(true);
		expect(isFailedFetch(new TypeError('Failed to fetch'))).toBe(true);
		expect(isFailedFetch(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
			true
		);
	});

	test('keeps everything else', () => {
		expect(isFailedFetch(new TypeError('can\'t access property "id", x is undefined'))).toBe(false);
		expect(isFailedFetch(new TypeError('Failed to fetch dynamically imported module: x.js'))).toBe(
			false
		);
		expect(isFailedFetch(new Error('Load failed'))).toBe(false);
		expect(isFailedFetch('Load failed')).toBe(false);
	});
});

describe('dropFailedFetches', () => {
	test('drops the event of a failed fetch and passes the others', () => {
		const event = { event_id: '1' };
		expect(dropFailedFetches(event, { originalException: new TypeError('Load failed') })).toBe(
			null
		);
		expect(dropFailedFetches(event, { originalException: new Error('boom') })).toBe(event);
	});
});
