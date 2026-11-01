import { createContext } from 'svelte';
import { nextSwitchSelection, type SwitchMember, type SwitchSeat } from '#lib/helpers/seatSwitch';

/** Switch mode of the seats page: whether it is on, the member picked first and their target. */
function createSeatSwitch() {
	let enabled = $state(false);
	let selected = $state<SwitchMember>();
	let target = $state<SwitchSeat>();

	return {
		get enabled() {
			return enabled;
		},
		set enabled(value: boolean) {
			enabled = value;
			selected = undefined;
			target = undefined;
		},
		get selected() {
			return selected;
		},
		get target() {
			return target;
		},
		pick(seat: SwitchSeat) {
			({ selected, target } = nextSwitchSelection({ selected, seat }));
		},
		clearTarget() {
			target = undefined;
		},
		reset() {
			selected = undefined;
			target = undefined;
		}
	};
}

type SeatSwitchState = ReturnType<typeof createSeatSwitch>;

const [getSeatSwitch, setSeatSwitch] = createContext<SeatSwitchState>();

/** Called once by the seats page; every seat button and the switch modal read the same state. */
export function provideSeatSwitch() {
	return setSeatSwitch(createSeatSwitch());
}

export { getSeatSwitch };
