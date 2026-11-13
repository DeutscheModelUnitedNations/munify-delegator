<!--
	@component
	The files that come with an announcement, each a link straight to the bucket.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	let { attachments }: { attachments: { id: string; fileName?: string | null; url: string }[] } =
		$props();
</script>

{#if attachments.length > 0}
	<ul class="flex flex-wrap gap-2" aria-label={m.announcementAttachments()}>
		{#each attachments as attachment (attachment.id)}
			<li>
				<a
					class="btn btn-sm btn-outline"
					href={attachment.url}
					target="_blank"
					rel="external noopener noreferrer"
				>
					<i aria-hidden="true" class="ph-duotone ph-paperclip"></i>
					{attachment.fileName ?? m.announcementAttachment()}
				</a>
			</li>
		{/each}
	</ul>
{/if}
