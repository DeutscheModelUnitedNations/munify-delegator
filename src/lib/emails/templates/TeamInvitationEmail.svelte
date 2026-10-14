<script lang="ts">
	import {
		Html,
		Head,
		Body,
		Container,
		Section,
		Text,
		Link,
		Hr
	} from '@better-svelte-email/components';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		recipientEmail: string;
		conferenceTitle: string;
		roleName: string;
		inviterName: string;
		inviteUrl: string;
		expiresAt: string;
	}

	let { recipientEmail, conferenceTitle, roleName, inviterName, inviteUrl, expiresAt }: Props =
		$props();
</script>

<Html lang={getLocale()}>
	<Head>
		<title>{m.emailTeamInvitationTitle()}</title>
	</Head>
	<Body
		style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
	>
		<Container
			style="background-color: #ffffff; margin: 40px auto; padding: 20px; border-radius: 8px; max-width: 600px;"
		>
			<Section>
				<Text style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 24px;">
					{m.emailTeamInvitationTitle()}
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;"
					>{m.emailGreetingAnonymous()}</Text
				>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{m.emailTeamInvitationBody({ inviterName, conferenceTitle, roleName })}
				</Text>

				<Text style="font-size: 16px; color: #374151; line-height: 1.6;">
					{m.emailTeamInvitationInstruction()}
				</Text>

				<Section style="text-align: center; margin: 32px 0;">
					<Link
						href={inviteUrl}
						style="background-color: #3d7dd2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
					>
						{m.emailTeamInvitationButton()}
					</Link>
				</Section>

				<Text style="font-size: 14px; color: #6b7280; line-height: 1.6;">
					{m.emailTeamInvitationExpiry({ expiresAt, inviterName })}
				</Text>

				<Hr style="border-color: #e5e7eb; margin: 24px 0;" />

				<Text style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
					{m.emailLinkFallback()}
				</Text>
				<Text style="font-size: 12px; color: #6b7280; word-break: break-all;">
					{inviteUrl}
				</Text>

				<Hr style="border-color: #e5e7eb; margin: 24px 0;" />

				<Text style="font-size: 12px; color: #9ca3af; line-height: 1.6;">
					{m.emailSentTo({ email: recipientEmail })}
					{m.emailTeamInvitationIgnore()}
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
