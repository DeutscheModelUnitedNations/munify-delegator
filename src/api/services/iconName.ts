import { icons } from '@phosphor-icons/core';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

const PHOSPHOR_ICON_NAMES = new Set<string>(icons.map((icon) => icon.name));

/** Whether `name` is a Phosphor icon (without the `ph-` prefix). */
export const isPhosphorIcon = (name: string) => PHOSPHOR_ICON_NAMES.has(name);

/** An icon argument: a Phosphor name, or empty, `null` or left out where the field may be cleared. */
export const iconArgSchema = z
	.string()
	.refine((name) => name === '' || isPhosphorIcon(name), { error: () => m.unknownIcon() })
	.nullish();
