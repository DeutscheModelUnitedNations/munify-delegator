import { nextSwitchSelection, type SwitchMember, type SwitchSeat } from '$lib/services/seatSwitch';

let enabled = $state(false);
let selected = $state<SwitchMember>();
let target = $state<SwitchSeat>();

export const seatSwitch = {
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
		({ selected, target } = nextSwitchSelection(selected, seat));
	},
	clearTarget() {
		target = undefined;
	},
	reset() {
		selected = undefined;
		target = undefined;
	}
};
