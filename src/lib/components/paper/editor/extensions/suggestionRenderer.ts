import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { JSONContent } from '@tiptap/core';

export interface SnippetItem {
	id: string;
	name: string;
	content: JSONContent;
}

interface RendererState {
	selectedIndex: number;
	items: SnippetItem[];
	command: ((item: SnippetItem) => void) | null;
}

/**
 * Creates a DaisyUI-styled dropdown element for snippet suggestions
 * Uses Floating UI for automatic positioning
 */
export function createSuggestionRenderer() {
	let popup: HTMLElement | null = null;
	let state: RendererState = {
		selectedIndex: 0,
		items: [],
		command: null
	};

	function createPopupElement(): HTMLElement {
		const el = document.createElement('div');
		el.className =
			'snippet-suggestion-popup fixed z-[9999] bg-base-100 rounded-box shadow-xl border border-base-300 min-w-[200px] max-w-[300px] overflow-hidden';
		el.style.visibility = 'hidden';
		el.style.top = '0';
		el.style.left = '0';
		document.body.appendChild(el);
		return el;
	}

	function renderItems(): void {
		if (!popup) return;

		if (state.items.length === 0) {
			popup.innerHTML = `
				<div class="px-3 py-2 text-base-content/50 text-sm">
					No snippets found
				</div>
			`;
			return;
		}

		const itemsHtml = state.items
			.map(
				(item, index) => `
			<button
				type="button"
				class="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer hover:bg-base-200 ${
					index === state.selectedIndex ? 'bg-primary text-primary-content' : ''
				}"
				data-index="${index}"
			>
				<i class="fa-sharp-duotone fa-solid fa-bookmark text-xs ${index === state.selectedIndex ? '' : 'text-primary'}"></i>
				<span class="truncate">${escapeHtml(item.name)}</span>
			</button>
		`
			)
			.join('');

		popup.innerHTML = `<div class="py-1">${itemsHtml}</div>`;

		// Add click handlers
		popup.querySelectorAll('button[data-index]').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
				selectItem(index);
			});
			btn.addEventListener('mouseenter', () => {
				const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
				state.selectedIndex = index;
				renderItems();
			});
		});
	}

	function selectItem(index: number): void {
		const item = state.items[index];
		if (item && state.command) {
			// Always call state.command which handles deleting the trigger text
			// and invokes the extension's onSelectSnippet if provided (see SnippetSuggestion.ts)
			state.command(item);
		}
	}

	async function updatePosition(
		clientRect: (() => DOMRect | null) | null | undefined
	): Promise<void> {
		if (!popup || !clientRect) return;

		const rect = clientRect();
		if (!rect) return;

		// Create a virtual element for Floating UI
		const virtualElement = {
			getBoundingClientRect: () => rect
		};

		// Use Floating UI for automatic positioning with collision detection
		const { x, y } = await computePosition(virtualElement, popup, {
			placement: 'bottom-start',
			strategy: 'fixed',
			middleware: [
				offset(4), // 4px gap from the cursor
				flip({ padding: 8 }), // Flip to top if no space below
				shift({ padding: 8 }) // Shift to stay within viewport
			]
		});

		popup.style.left = `${x}px`;
		popup.style.top = `${y}px`;
	}

	function moveSelection(index: number): void {
		state.selectedIndex = index;
		renderItems();
	}

	/** The keys the dropdown claims while it is open, and what each does. */
	const keyHandlers = new Map<string, () => void>([
		['ArrowUp', () => moveSelection(Math.max(0, state.selectedIndex - 1))],
		['ArrowDown', () => moveSelection(Math.min(state.items.length - 1, state.selectedIndex + 1))],
		[
			'Enter',
			() => {
				if (state.items.length > 0) selectItem(state.selectedIndex);
			}
		],
		['Escape', () => {}]
	]);

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	return {
		onStart(props: SuggestionProps<SnippetItem>): void {
			popup = createPopupElement();
			state.items = props.items;
			state.selectedIndex = 0;
			state.command = props.command;

			renderItems();
			updatePosition(props.clientRect).then(() => {
				if (popup) popup.style.visibility = 'visible';
			});
		},

		onUpdate(props: SuggestionProps<SnippetItem>): void {
			state.items = props.items;
			state.command = props.command;

			// Reset selection if items changed
			if (state.selectedIndex >= state.items.length) {
				state.selectedIndex = Math.max(0, state.items.length - 1);
			}

			renderItems();
			updatePosition(props.clientRect);
		},

		onKeyDown({ event }: SuggestionKeyDownProps): boolean {
			const handler = keyHandlers.get(event.key);
			if (!handler) return false;
			// Escape is claimed without preventing the default, so the editor still sees it
			if (event.key !== 'Escape') event.preventDefault();
			handler();
			return true;
		},

		onExit(): void {
			if (popup) {
				popup.remove();
				popup = null;
			}
			state = {
				selectedIndex: 0,
				items: [],
				command: null
			};
		}
	};
}
