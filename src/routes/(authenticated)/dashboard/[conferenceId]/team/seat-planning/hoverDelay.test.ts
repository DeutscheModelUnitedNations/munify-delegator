import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHoverDelay } from './hoverDelay';

describe('createHoverDelay', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	const setup = () => {
		const onShow = vi.fn<(value: string) => void>();
		const onHide = vi.fn();
		const delay = createHoverDelay({ showDelay: 250, hideDelay: 150, onShow, onHide });
		return { delay, onShow, onHide };
	};

	it('shows after the delay', () => {
		const { delay, onShow } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(249);
		expect(onShow).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onShow).toHaveBeenCalledWith('AFG');
	});

	it('shows only the last of several rows swept over', () => {
		const { delay, onShow } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(100);
		delay.show('EGY');
		vi.advanceTimersByTime(250);
		expect(onShow).toHaveBeenCalledTimes(1);
		expect(onShow).toHaveBeenCalledWith('EGY');
	});

	it('does not show when the pointer leaves before the delay', () => {
		const { delay, onShow } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(100);
		delay.hide();
		vi.advanceTimersByTime(1000);
		expect(onShow).not.toHaveBeenCalled();
	});

	it('hides while the pointer keeps moving outside', () => {
		const { delay, onHide } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(250);
		// a pointer move every 50 ms, each asking to hide
		for (let move = 0; move < 3; move++) {
			delay.hide();
			vi.advanceTimersByTime(50);
		}
		expect(onHide).toHaveBeenCalledTimes(1);
	});

	it('stays open when the pointer comes back in time', () => {
		const { delay, onHide } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(250);
		delay.hide();
		vi.advanceTimersByTime(100);
		delay.stay();
		vi.advanceTimersByTime(1000);
		expect(onHide).not.toHaveBeenCalled();
	});

	it('moving on to another row keeps the popover until that one shows', () => {
		const { delay, onShow, onHide } = setup();
		delay.show('AFG');
		vi.advanceTimersByTime(250);
		delay.hide();
		delay.show('EGY');
		vi.advanceTimersByTime(250);
		expect(onHide).not.toHaveBeenCalled();
		expect(onShow).toHaveBeenLastCalledWith('EGY');
	});

	it('dispose cancels whatever is waiting', () => {
		const { delay, onShow, onHide } = setup();
		delay.show('AFG');
		delay.dispose();
		vi.advanceTimersByTime(1000);
		expect(onShow).not.toHaveBeenCalled();
		expect(onHide).not.toHaveBeenCalled();
	});
});
