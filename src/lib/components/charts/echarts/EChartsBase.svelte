<script lang="ts">
	import * as echarts from 'echarts';
	import type { EChartsOption } from 'echarts';
	import { onMount } from 'svelte';
	import { chartTheme, themedChartOptions, type ThemeColors } from './chartOptions';

	interface Props {
		options: EChartsOption;
		class?: string;
		height?: string;
		loading?: boolean;
		notMerge?: boolean;
		lazyUpdate?: boolean;
	}

	let {
		options,
		class: className = '',
		height = '300px',
		loading = false,
		notMerge = false,
		lazyUpdate = false
	}: Props = $props();

	let chartContainer: HTMLDivElement;
	let chartInstance: echarts.ECharts | null = null;

	// Get theme colors from CSS custom properties
	function getThemeColors(): ThemeColors {
		if (typeof window === 'undefined') {
			return {
				textColor: '#374151',
				backgroundColor: 'transparent',
				borderColor: '#e5e7eb'
			};
		}

		// The page's own text color, so every daisyUI theme gets a readable chart.
		const textColor = getComputedStyle(chartContainer ?? document.body).color;

		return {
			textColor,
			backgroundColor: 'transparent',
			borderColor: `color-mix(in srgb, ${textColor} 20%, transparent)`
		};
	}

	// Color palette that works well in both light and dark modes
	const colorPalette = [
		'#3b82f6', // blue
		'#10b981', // emerald
		'#f59e0b', // amber
		'#ef4444', // red
		'#8b5cf6', // violet
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16' // lime
	];

	// Merge theme colors with options
	const themedOptions = $derived(themedChartOptions(options, getThemeColors(), colorPalette));

	onMount(() => {
		if (!chartContainer) return;

		chartInstance = echarts.init(chartContainer, chartTheme(getThemeColors()));
		chartInstance.setOption(themedOptions, { notMerge, lazyUpdate });

		// Handle resize
		const resizeObserver = new ResizeObserver(() => {
			chartInstance?.resize();
		});
		resizeObserver.observe(chartContainer);

		// Handle theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleThemeChange = () => {
			// The theme is fixed at init, so a theme change builds the chart anew
			chartInstance?.dispose();
			chartInstance = echarts.init(chartContainer, chartTheme(getThemeColors()));
			chartInstance.setOption(themedChartOptions(options, getThemeColors(), colorPalette), {
				notMerge: true
			});
		};
		mediaQuery.addEventListener('change', handleThemeChange);

		// Also watch for data-theme attribute changes
		const observer = new MutationObserver(handleThemeChange);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme']
		});

		return () => {
			resizeObserver.disconnect();
			mediaQuery.removeEventListener('change', handleThemeChange);
			observer.disconnect();
			chartInstance?.dispose();
		};
	});

	// Update chart when options change
	$effect(() => {
		if (chartInstance && themedOptions) {
			chartInstance.setOption(themedOptions, { notMerge, lazyUpdate });
		}
	});

	// Handle loading state
	$effect(() => {
		if (chartInstance) {
			if (loading) {
				chartInstance.showLoading('default', {
					text: '',
					maskColor: 'rgba(255, 255, 255, 0.1)',
					spinnerRadius: 20
				});
			} else {
				chartInstance.hideLoading();
			}
		}
	});

	export function getChartInstance(): echarts.ECharts | null {
		return chartInstance;
	}
</script>

<div bind:this={chartContainer} class="w-full {className}" style="height: {height};"></div>
