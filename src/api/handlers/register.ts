import './certificate';
import './auth';
import './assignment';
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
import './paper';
import './paperReview';
import './paperVersion';
import './paymentTransaction';
import './place';
import './reviewerSnippet';
import './roleApplication';
import './statistics';
import './search';
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
		apiUrl: '/api/graphql2',
		useExternalUrqlClient: '../client',
		removeExisting: false,
		autoIncludeIdField: false
	});
}
