<script lang="ts">
	import type { ECharts } from 'echarts';
	import { onMount, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { logger } from '#lib/logger';
	import { bar3DOptions, type Bar3DChartData } from './bar3DOptions';
	import type { ThemeColors } from './chartOptions';

	// A stacked 3D bar chart (echarts-gl, WebGL). echarts-gl is loaded on first use, so pages
	// without a 3D chart do not carry it. The canvas says nothing to screen readers: `label`
	// names the chart, and the page beside it offers the figures as a table.
	interface Props {
		data: Bar3DChartData;
		/** What the chart shows, for screen readers. */
		label: string;
		height?: string;
		/** Shown instead of the chart where the browser has no WebGL. */
		fallback?: Snippet;
	}

	let { data, label, height = '420px', fallback }: Props = $props();

	let container: HTMLDivElement;
	let chart: ECharts | undefined;
	let unsupported = $state(false);
	let reducedMotion = $state(false);

	function theme(): ThemeColors {
		const textColor = getComputedStyle(container).color;
		return {
			textColor,
			backgroundColor: 'transparent',
			borderColor: `color-mix(in srgb, ${textColor} 20%, transparent)`
		};
	}

	function hasWebGL() {
		try {
			return !!document.createElement('canvas').getContext('webgl');
		} catch {
			return false;
		}
	}

	function render() {
		chart?.setOption(bar3DOptions({ data, theme: theme(), reducedMotion }), { notMerge: true });
	}

	onMount(() => {
		if (!hasWebGL()) {
			unsupported = true;
			return;
		}
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = motion.matches;
		let disposed = false;

		void Promise.all([
			import('echarts'),
			import('echarts-gl/lib/chart/bar3D.js'),
			import('echarts-gl/lib/component/grid3D.js')
		])
			.then(([echarts]) => {
				if (disposed) return;
				chart = echarts.init(container);
				render();
			})
			.catch((error: unknown) => {
				logger.warn('The 3D chart could not start', error);
				unsupported = true;
			});

		const resize = new ResizeObserver(() => chart?.resize());
		resize.observe(container);
		const onMotionChange = () => {
			reducedMotion = motion.matches;
		};
		motion.addEventListener('change', onMotionChange);
		// Axis and label colours follow the theme.
		const themeObserver = new MutationObserver(() => render());
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme', 'data-contrast']
		});

		return () => {
			disposed = true;
			resize.disconnect();
			motion.removeEventListener('change', onMotionChange);
			themeObserver.disconnect();
			chart?.dispose();
		};
	});

	// New figures (a live update, another filter) animate the bars to their new height.
	$effect(() => {
		void data;
		void reducedMotion;
		render();
	});
</script>

{#if unsupported}
	{#if fallback}
		{@render fallback()}
	{:else}
		<p class="text-sm text-base-content/60">{m.chart3dUnsupported()}</p>
	{/if}
{/if}
<div
	bind:this={container}
	class="w-full"
	class:hidden={unsupported}
	style="height: {height};"
	role="img"
	aria-label={label}
></div>
