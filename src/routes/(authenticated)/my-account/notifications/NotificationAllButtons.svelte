<!--
	@component
	The two buttons switching every notification of a list on or off; each is disabled while
	everything already is where it would put it.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		settings: { email: boolean; slack: boolean }[];
		enableLabel: string;
		disableLabel: string;
		/** A switch of everything is underway. */
		busy: boolean;
		onset: (enabled: boolean) => void;
	}

	let { settings, enableLabel, disableLabel, busy, onset }: Props = $props();

	/** Whether every switch is already where `enabled` would put it. */
	const allAre = (enabled: boolean) =>
		settings.every((setting) => setting.email === enabled && setting.slack === enabled);
</script>

<div class="join">
	<button
		type="button"
		class="btn btn-xs join-item"
		aria-label={enableLabel}
		disabled={busy || allAre(true)}
		onclick={() => onset(true)}
	>
		<i aria-hidden="true" class="ph-duotone ph-bell-ringing"></i>
		{m.notificationsEnableAll()}
	</button>
	<button
		type="button"
		class="btn btn-xs join-item"
		aria-label={disableLabel}
		disabled={busy || allAre(false)}
		onclick={() => onset(false)}
	>
		<i aria-hidden="true" class="ph-duotone ph-bell-slash"></i>
		{m.notificationsDisableAll()}
	</button>
</div>
