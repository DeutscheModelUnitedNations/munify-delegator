/** An action in a tree menu; `indent` sets it under the item before it (the target sections). */
export type TreeMenuItem = {
	label: string;
	icon?: string;
	indent?: boolean;
	danger?: boolean;
	disabled?: boolean;
	onSelect?: () => void;
};
