import { describe, expect, it } from 'vitest';
import { inboxChoice } from './inboxChoice';

describe('inboxChoice', () => {
	it('has nothing to write from when no inbox reaches the person', () => {
		expect(inboxChoice([])).toEqual({ kind: 'none' });
	});

	it('opens the chat right away with one inbox', () => {
		expect(inboxChoice(['care'])).toEqual({ kind: 'one', option: 'care' });
	});

	it('leaves the choice with several, as a copy', () => {
		const reaching = ['care', 'chair'];
		const choice = inboxChoice(reaching);
		expect(choice).toEqual({ kind: 'several', options: ['care', 'chair'] });
		expect(choice.kind === 'several' && choice.options).not.toBe(reaching);
	});
});
