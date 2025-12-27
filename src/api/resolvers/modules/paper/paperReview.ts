import {
	PaperReviewCommentsFieldObject,
	PaperReviewCreatedAtFieldObject,
	PaperReviewIdFieldObject,
	PaperReviewReviewerFieldObject,
	PaperReviewPaperVersionFieldObject
} from '$db/generated/graphql/PaperReview';
import { builder } from '../../builder';

builder.prismaObject('PaperReview', {
	fields: (t) => ({
		id: t.field(PaperReviewIdFieldObject),
		comments: t.field(PaperReviewCommentsFieldObject),
		paperVersion: t.relation('paperVersion', PaperReviewPaperVersionFieldObject),
		reviewer: t.relation('reviewer', PaperReviewReviewerFieldObject),
		createdAt: t.field(PaperReviewCreatedAtFieldObject)
	})
});
