/** The inline style of a cell: its width, and where it sticks when it is pinned. */
export function cellStyle({
	width,
	left,
	right
}: {
	width: number;
	left?: number;
	right?: boolean;
}) {
	const position =
		left !== undefined
			? `position:sticky;left:${left}px;z-index:1;`
			: right
				? 'position:sticky;right:0;z-index:1;'
				: '';
	return `width:${width}px;min-width:${width}px;max-width:${width}px;${position}`;
}
