import './certificate/certificate';
import './auth/auth';
import './agreementDetail/agreementDetail';
import './announcement/announcement';
import './assignment/assignment';
import './attendanceEntry/attendanceEntry';
import './calendar/calendarDay';
import './calendar/calendarEntry';
import './calendar/calendarTrack';
import './calendarFeed/calendarFeed';
import './collectiveGroup/collectiveGroup';
import './committee/committee';
import './committeeAgendaItem/committeeAgendaItem';
import './chat/chat';
import './chatReport/chatReport';
import './chaseLink/chaseLink';
import './chasePresence/chasePresence';
import './conference/conference';
import './conferenceParticipant/conferenceParticipant';
import './conferenceRole/conferenceRole';
import './conferenceSeries/conferenceSeries';
import './conferenceSupervisor/conferenceSupervisor';
import './delegation/delegation';
import './delegationMember/delegationMember';
import './email/email';
import './flagCollection/flagCollection';
import './guidePage/guidePage';
import './guideOutline/guideOutline';
import './guideOutline/guideOutlineTools';
import './nation/nation';
import './notification/notification';
import './paper/paper';
import './paperReview/paperReview';
import './paperReviewDraft/paperReviewDraft';
import './paperVersion/paperVersion';
import './paymentTransaction/paymentTransaction';
import './place/place';
import './possibleDuplicate/possibleDuplicate';
import './postalScan/postalScan';
import './resolution/resolution';
import './reviewerSnippet/reviewerSnippet';
import './searchHistory/searchHistory';
import './roleApplication/roleApplication';
import './statistics/statistics';
import './dataTable/dataTable';
import './plausibility/plausibility';
import './school/school';
import './schoolSuggestion/schoolSuggestion';
import './mcpAuditEntry/mcpAuditEntry';
import './messagingTerms/messagingTerms';
import './scanLookup/scanLookup';
import './scannerAccess/scannerAccess';
import './signedCode/signedCode';
import './nsaCard/nsaCard';
import './seatPlanning/seatPlanning';
import './nametagBins/nametagBins';
import './sightingDeck/sightingDeck';
import './singleParticipant/singleParticipant';
import './storedFile/storedFile';
import './surveyAnswer/surveyAnswer';
import './surveyOption/surveyOption';
import './surveyQuestion/surveyQuestion';
import './tableView/tableView';
import './teamFunction/teamFunction';
import './teamMember/teamMember';
import './teamMemberInvitation/teamMemberInvitation';
import './user/user';
import './userReferenceInPaymentTransaction/userReferenceInPaymentTransaction';
import './waitingListEntry/waitingListEntry';

import { building, dev } from '$app/env';
import { buildSchema, clientCreator } from '#api/rumble';
import { writeSchemaFile } from '#api/services/schemaFile';

if (dev || building) {
	await clientCreator({
		outputPath: 'src/lib/api/rumbleClient',
		apiUrl: '/api/graphql',
		useExternalUrqlClient: '../client',
		removeExisting: false,
		// Graphcache can only normalize an entity whose key it was given; without one it stores the
		// selection embedded and overwrites the link other queries of the same field hold.
		autoIncludeIdField: true
	});
	// The linked CHASE generates its client of this API from it (`bun run link:client` there).
	await writeSchemaFile({ schema: buildSchema(), path: 'schema.graphql' });
}
