import './certificate/certificate';
import './auth/auth';
import './assignment/assignment';
import './attendanceEntry/attendanceEntry';
import './calendarDay/calendarDay';
import './calendarEntry/calendarEntry';
import './calendarTrack/calendarTrack';
import './committee/committee';
import './committeeAgendaItem/committeeAgendaItem';
import './conference/conference';
import './conferenceParticipantStatus/conferenceParticipantStatus';
import './conferenceSupervisor/conferenceSupervisor';
import './customConferenceRole/customConferenceRole';
import './delegation/delegation';
import './delegationMember/delegationMember';
import './flagCollection/flagCollection';
import './nation/nation';
import './nonStateActor/nonStateActor';
import './paper/paper';
import './paperReview/paperReview';
import './paperVersion/paperVersion';
import './paymentTransaction/paymentTransaction';
import './place/place';
import './possibleDuplicate/possibleDuplicate';
import './resolution/resolution';
import './reviewerSnippet/reviewerSnippet';
import './searchHistory/searchHistory';
import './roleApplication/roleApplication';
import './statistics/statistics';
import './participantsPage/participantsPage';
import './schoolSuggestion/schoolSuggestion';
import './scanLookup/scanLookup';
import './identityCode/identityCode';
import './seatPlanning/seatPlanning';
import './nametagBins/nametagBins';
import './sightingDeck/sightingDeck';
import './singleParticipant/singleParticipant';
import './surveyAnswer/surveyAnswer';
import './surveyOption/surveyOption';
import './surveyQuestion/surveyQuestion';
import './teamMember/teamMember';
import './teamMemberInvitation/teamMemberInvitation';
import './user/user';
import './userReferenceInPaymentTransaction/userReferenceInPaymentTransaction';
import './waitingListEntry/waitingListEntry';

import { building, dev } from '$app/environment';
import { clientCreator } from '$api/rumble';

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
}
