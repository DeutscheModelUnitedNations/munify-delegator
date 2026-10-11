import './certificate/certificate';
import './auth';
import './assignment/assignment';
import './attendanceEntry';
import './calendarDay';
import './calendarEntry';
import './calendarTrack';
import './committee';
import './committeeAgendaItem';
import './conference';
import './conferenceParticipantStatus';
import './conferenceSupervisor';
import './customConferenceRole';
import './delegation';
import './delegationMember';
import './flagCollection';
import './nation';
import './nonStateActor';
import './paper/paper';
import './paperReview';
import './paperVersion';
import './paymentTransaction';
import './place';
import './possibleDuplicate/possibleDuplicate';
import './resolution';
import './reviewerSnippet';
import './searchHistory';
import './roleApplication';
import './statistics/statistics';
import './participantsPage/participantsPage';
import './schoolSuggestion/schoolSuggestion';
import './scanLookup';
import './identityCode/identityCode';
import './seatPlanning';
import './nametagBins/nametagBins';
import './sightingDeck/sightingDeck';
import './singleParticipant';
import './surveyAnswer';
import './surveyOption';
import './surveyQuestion';
import './teamMember';
import './teamMemberInvitation';
import './user';
import './userReferenceInPaymentTransaction';
import './waitingListEntry';

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
