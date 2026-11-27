import type { Bar3DChartData } from '#lib/components/charts/echarts/bar3DOptions';

/** One role's wishes as the `roleWishes` statistics block returns them. */
export interface RoleWishes {
	roleId: string;
	kind: 'NATION' | 'NON_STATE_ACTOR' | 'CUSTOM';
	nationAlpha3Code?: string | null;
	name?: string | null;
	total: number;
	granted: number;
	byRank: Array<{ rank: number; count: number; granted: number }>;
}

/** How many roles the chart shows at most: more labels than this overlap on the axis. */
export const ROLE_WISH_CHART_LIMIT = 15;

/**
 * The 3D chart of the wishes for the roles of one kind: the most wanted roles (the server's
 * order) along the front, wish places in depth, and per bar the delegations that got the role
 * stacked under those that did not.
 */
export function roleWishChart({
	roles,
	kind,
	limit = ROLE_WISH_CHART_LIMIT,
	labels
}: {
	roles: RoleWishes[];
	kind: RoleWishes['kind'];
	limit?: number;
	labels: {
		role: (role: RoleWishes) => string;
		rank: (rank: number) => string;
		roles: string;
		ranks: string;
		delegations: string;
		granted: string;
		notGranted: string;
	};
}): Bar3DChartData {
	const shown = roles.filter((role) => role.kind === kind).slice(0, limit);
	const maxRank = Math.max(0, ...shown.flatMap((role) => role.byRank.map((wish) => wish.rank)));
	const cells = (value: (wish: RoleWishes['byRank'][number]) => number) =>
		shown.flatMap((role, x) =>
			role.byRank.map((wish) => ({ x, y: wish.rank - 1, value: value(wish) }))
		);

	return {
		xLabels: shown.map(labels.role),
		yLabels: Array.from({ length: maxRank }, (_, index) => labels.rank(index + 1)),
		xName: labels.roles,
		yName: labels.ranks,
		zName: labels.delegations,
		series: [
			{ name: labels.granted, color: '#22c55e', data: cells((wish) => wish.granted) },
			{
				name: labels.notGranted,
				color: '#3b82f6',
				data: cells((wish) => wish.count - wish.granted)
			}
		]
	};
}

/** Whether any role of the kind was wished for, so the kind's tab is worth offering. */
export function hasWishesOfKind({
	roles,
	kind
}: {
	roles: RoleWishes[];
	kind: RoleWishes['kind'];
}) {
	return roles.some((role) => role.kind === kind && role.total > 0);
}
