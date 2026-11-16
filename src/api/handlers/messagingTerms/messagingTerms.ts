import { schemaBuilder } from '#api/rumble';
import { getLocale } from '#lib/paraglide/runtime';
import { assertCanAcceptTerms } from './messagingTermsPermissions';
import {
	acceptCurrentTermsArgsSchema,
	acceptMessagingTerms,
	termsFor
} from './messagingTermsService';

/**
 * The message service's terms, as the app ships them (`terms/*.yaml`), and agreeing to them. A
 * participant agrees before their first message (`assertAcceptedTerms` in the chat handler).
 */

type Terms = ReturnType<typeof termsFor>;
type TermsSection = Terms['sections'][number];
type TermsConfirmation = Terms['confirmations'][number];

/** Graphcache keys every object by its id; a section's or confirmation's own is `key`. */
const cacheId = ({ terms, key }: { terms: Terms; key: string }) =>
	`${terms.version}.${terms.revision}.${terms.locale}.${key}`;

const TermsSectionRef = schemaBuilder.objectRef<{ terms: Terms; section: TermsSection }>(
	'MessagingTermsSection'
);
TermsSectionRef.implement({
	description: 'One section of the terms: a title, its gist and its full text.',
	fields: (t) => ({
		id: t.id({ resolve: ({ terms, section }) => cacheId({ terms, key: section.id }) }),
		key: t.string({
			description: "The section's id in the terms file, the same in every locale.",
			resolve: ({ section }) => section.id
		}),
		icon: t.string({
			description: 'A Phosphor icon name.',
			resolve: ({ section }) => section.icon
		}),
		title: t.string({ resolve: ({ section }) => section.title }),
		summary: t.string({
			description: 'The section in one sentence, shown before its full text.',
			resolve: ({ section }) => section.summary
		}),
		paragraphs: t.stringList({ resolve: ({ section }) => section.paragraphs }),
		callout: t.string({
			nullable: true,
			description: 'A warning shown apart from the paragraphs.',
			resolve: ({ section }) => section.callout
		})
	})
});

const TermsConfirmationRef = schemaBuilder.objectRef<{
	terms: Terms;
	confirmation: TermsConfirmation;
}>('MessagingTermsConfirmation');
TermsConfirmationRef.implement({
	description: 'A statement the reader ticks to agree to the terms.',
	fields: (t) => ({
		id: t.id({ resolve: ({ terms, confirmation }) => cacheId({ terms, key: confirmation.id }) }),
		key: t.string({
			description: 'What `acceptMessagingTerms` names in `confirmationIds`.',
			resolve: ({ confirmation }) => confirmation.id
		}),
		text: t.string({ resolve: ({ confirmation }) => confirmation.text })
	})
});

const TermsRef = schemaBuilder.objectRef<Terms>('MessagingTerms');
TermsRef.implement({
	description: "The message service's terms as they stand, in the reader's locale.",
	fields: (t) => ({
		id: t.id({ resolve: (terms) => cacheId({ terms, key: 'terms' }) }),
		version: t.int({ resolve: (terms) => terms.version }),
		revision: t.int({ resolve: (terms) => terms.revision }),
		locale: t.string({ resolve: (terms) => terms.locale }),
		contentHash: t.string({
			description: 'The hash of exactly this text, which `acceptMessagingTerms` names.',
			resolve: (terms) => terms.contentHash
		}),
		intro: t.string({ resolve: (terms) => terms.intro }),
		sections: t.field({
			type: [TermsSectionRef],
			resolve: (terms) => terms.sections.map((section) => ({ terms, section }))
		}),
		confirmations: t.field({
			type: [TermsConfirmationRef],
			resolve: (terms) => terms.confirmations.map((confirmation) => ({ terms, confirmation }))
		})
	})
});

schemaBuilder.queryFields((t) => ({
	messagingTerms: t.field({
		description: "The message service's terms as they stand, in the caller's locale.",
		type: TermsRef,
		resolve: () => termsFor(getLocale())
	})
}));

schemaBuilder.mutationFields((t) => ({
	acceptMessagingTerms: t.field({
		description:
			"The caller agrees to the message service's terms, which a participant has to before they write. It names what it was shown (`messagingTerms`: `version`, `revision`, `contentHash`) and every confirmation's `key`; INVALID_INPUT when that is not the terms as they stand, so nobody accepts a text they have not seen. FORBIDDEN for an AI assistant.",
		type: 'Boolean',
		args: t.validate(
			{
				version: t.arg.int({ required: true }),
				revision: t.arg.int({ required: true }),
				contentHash: t.arg.string({ required: true }),
				confirmationIds: t.arg.stringList({ required: true })
			},
			acceptCurrentTermsArgsSchema
		),
		resolve: async (_root, { shown, confirmationIds }, ctx) => {
			const userId = assertCanAcceptTerms(ctx);
			await acceptMessagingTerms({ userId, shown, confirmationIds });
			return true;
		}
	})
}));
