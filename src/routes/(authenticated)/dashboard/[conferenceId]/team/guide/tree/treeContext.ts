import { createContext } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import type { PageTarget } from '#lib/guide/outlineEditing';
import type { WorkspacePage } from '#lib/guide/workspace';

/** What every part of the guide tree reads: the pages, their editor links and the open one. */
export type TreeContext = {
	pageOf: (pageId: string) => WorkspacePage | undefined;
	/** General pages for "add a page", marked when the guide lists them already. */
	readonly addable: readonly (WorkspacePage & { inGuide: boolean })[];
	hrefOf: (pageId: string) => ResolvedPathname;
	readonly activePageId: string | undefined;
	readonly roles: readonly { id: string; name: string }[];
	createPage: (target: PageTarget) => void;
};

export const [getTreeContext, setTreeContext] = createContext<TreeContext>();
