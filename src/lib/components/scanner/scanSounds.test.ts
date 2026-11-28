import { afterEach, describe, expect, test, vi } from 'vitest';
import { createScanSounds } from './scanSounds';

/** An audio context that records the tones it was asked for. */
function fakeAudio(state: 'running' | 'suspended' = 'running') {
	const tones: number[] = [];
	const resume = vi.fn(async () => undefined);
	const param = () => ({
		setValueAtTime: vi.fn(),
		exponentialRampToValueAtTime: vi.fn()
	});
	class FakeContext {
		state = state;
		currentTime = 0;
		destination = {};
		resume = resume;
		createGain = () => ({ gain: param(), connect: (to: unknown) => to });
		createOscillator() {
			const frequency = { ...param(), setValueAtTime: (value: number) => tones.push(value) };
			return { type: '', frequency, connect: (to: unknown) => to, start: vi.fn(), stop: vi.fn() };
		}
	}
	vi.stubGlobal('AudioContext', FakeContext);
	return { tones, resume };
}

afterEach(() => vi.unstubAllGlobals());

describe('createScanSounds', () => {
	test('beeps high once for a page done with, low twice for a problem', () => {
		const { tones } = fakeAudio();
		const sounds = createScanSounds();
		sounds.success();
		expect(tones).toEqual([1760]);
		sounds.problem();
		expect(tones).toEqual([1760, 440, 294]);
	});

	test('wakes a context the browser held back', () => {
		const { resume } = fakeAudio('suspended');
		createScanSounds().unlock();
		expect(resume).toHaveBeenCalled();
	});

	test('stays quiet where the browser has no audio', () => {
		vi.stubGlobal('AudioContext', undefined);
		expect(() => createScanSounds().success()).not.toThrow();
	});
});
