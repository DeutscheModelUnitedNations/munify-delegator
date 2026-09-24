<script lang="ts">
	import * as echarts from 'echarts';
	import type { EChartsOption, SetOptionOpts } from 'echarts';
	import { onMount } from 'svelte';

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
	function getThemeColors(): {
		textColor: string;
		backgroundColor: string;
		borderColor: string;
	} {
		if (typeof window === 'undefined') {
			return {
				textColor: '#374151',
				backgroundColor: 'transparent',
				borderColor: '#e5e7eb'
			};
		}

		const isDark =
			document.documentElement.getAttribute('data-theme')?.includes('dark') ||
			window.matchMedia('(prefers-color-scheme: dark)').matches;

		return {
			textColor: isDark ? '#e5e7eb' : '#374151',
			backgroundColor: 'transparent',
			borderColor: isDark ? '#374151' : '#e5e7eb'
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
	const themedOptions = $derived.by(() => {
		const theme = getThemeColors();
		return {
			...options,
			color: options.color || colorPalette,
			backgroundColor: options.backgroundColor || theme.backgroundColor,
			textStyle: {
				color: theme.textColor,
				...(options.textStyle || {})
			}
		} as EChartsOption;
	});

	onMount(() => {
		if (!chartContainer) return;

		chartInstance = echarts.init(chartContainer);
		chartInstance.setOption(themedOptions, { notMerge, lazyUpdate });

		// Handle resize
		const resizeObserver = new ResizeObserver(() => {
			chartInstance?.resize();
		});
		resizeObserver.observe(chartContainer);

		// Handle theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleThemeChange = () => {
			if (chartInstance) {
				// Recompute themed options with fresh theme colors
				const theme = getThemeColors();
				const freshThemedOptions = {
					...options,
					color: options.color || colorPalette,
					backgroundColor: options.backgroundColor || theme.backgroundColor,
					textStyle: {
						color: theme.textColor,
						...(options.textStyle || {})
					}
				} as EChartsOption;
				chartInstance.setOption(freshThemedOptions, { notMerge: true });
			}
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
