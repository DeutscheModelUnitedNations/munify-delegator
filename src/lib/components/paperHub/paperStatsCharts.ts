import type { TooltipComponentFormatterCallbackParams } from 'echarts';
import type { PapertypeEnum } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';

type TooltipPoint = Extract<TooltipComponentFormatterCallbackParams, unknown[]>[number];

/** The bar color of each paper type in the status-by-type chart. */
export const paperTypeChartColors: Record<PapertypeEnum, string> = {
	POSITION_PAPER: '#3b82f6', // blue
	WORKING_PAPER: '#8b5cf6', // violet
	INTRODUCTION_PAPER: '#f59e0b' // amber
};

const paperTypeLabels: Record<PapertypeEnum, () => string> = {
	POSITION_PAPER: m.paperTypePositionPaper,
	WORKING_PAPER: m.paperTypeWorkingPaper,
	INTRODUCTION_PAPER: m.paperTypeIntroductionPaper
};

export function paperTypeLabel(type: PapertypeEnum) {
	return paperTypeLabels[type]();
}

const valueOf = (p: TooltipPoint) => (typeof p.value === 'number' ? p.value : 0);

/** One paper type's block of the tooltip: its total, then each status that has papers. */
function typeSection(points: TooltipPoint[], typeLabel: string) {
	const ofType = points.filter((p) => p.seriesName?.startsWith(typeLabel));
	const typeTotal = ofType.reduce((sum, p) => sum + valueOf(p), 0);
	if (typeTotal <= 0) return '';
	const lines = ofType
		.filter((p) => valueOf(p) > 0)
		.map((p) => `${p.marker} ${p.seriesName?.split(' - ')[1]}: ${p.value}<br/>`);
	return `<br/><strong>${typeLabel}: ${typeTotal}</strong><br/>${lines.join('')}`;
}

/**
 * The committee chart's tooltip: the committee, then per paper type (series are named
 * `<type label> - <status label>`) its total and its non-empty statuses.
 */
export function committeeTooltip(
	params: TooltipComponentFormatterCallbackParams,
	typeLabels: readonly string[]
) {
	if (!Array.isArray(params) || params.length === 0) return '';
	// Axis-triggered tooltips carry the category on every point; echarts' types omit it.
	const first = params[0];
	const committee = 'axisValue' in first ? first.axisValue : undefined;
	const sections = typeLabels.map((label) => typeSection(params, label));
	return `<strong>${committee}</strong><br/>${sections.join('')}`;
}
