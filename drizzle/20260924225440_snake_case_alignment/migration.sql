ALTER TYPE "AdministrativeStatus" RENAME TO "administrative_status";--> statement-breakpoint
ALTER TYPE "CalendarEntryColor" RENAME TO "calendar_entry_color";--> statement-breakpoint
ALTER TYPE "ConferenceState" RENAME TO "conference_state";--> statement-breakpoint
ALTER TYPE "FoodPreference" RENAME TO "food_preference";--> statement-breakpoint
ALTER TYPE "Gender" RENAME TO "gender";--> statement-breakpoint
ALTER TYPE "MediaConsentStatus" RENAME TO "media_consent_status";--> statement-breakpoint
ALTER TYPE "PaperStatus" RENAME TO "paper_status";--> statement-breakpoint
ALTER TYPE "PaperType" RENAME TO "paper_type";--> statement-breakpoint
ALTER TYPE "ReviewHelpStatus" RENAME TO "review_help_status";--> statement-breakpoint
ALTER TYPE "TeamRole" RENAME TO "team_role";--> statement-breakpoint
ALTER TABLE "AttendanceEntry" RENAME TO "attendance_entry";--> statement-breakpoint
ALTER TABLE "CalendarDay" RENAME TO "calendar_day";--> statement-breakpoint
ALTER TABLE "CalendarEntry" RENAME TO "calendar_entry";--> statement-breakpoint
ALTER TABLE "CalendarTrack" RENAME TO "calendar_track";--> statement-breakpoint
ALTER TABLE "Committee" RENAME TO "committee";--> statement-breakpoint
ALTER TABLE "CommitteeAgendaItem" RENAME TO "committee_agenda_item";--> statement-breakpoint
ALTER TABLE "_CommitteeToNation" RENAME TO "committee_to_nation";--> statement-breakpoint
ALTER TABLE "Conference" RENAME TO "conference";--> statement-breakpoint
ALTER TABLE "ConferenceParticipantStatus" RENAME TO "conference_participant_status";--> statement-breakpoint
ALTER TABLE "ConferenceSupervisor" RENAME TO "conference_supervisor";--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToDelegationMember" RENAME TO "conference_supervisor_to_delegation_member";--> statement-breakpoint
ALTER TABLE "_ConferenceSupervisorToSingleParticipant" RENAME TO "conference_supervisor_to_single_participant";--> statement-breakpoint
ALTER TABLE "CustomConferenceRole" RENAME TO "custom_conference_role";--> statement-breakpoint
ALTER TABLE "_CustomConferenceRoleToSingleParticipant" RENAME TO "custom_conference_role_to_single_participant";--> statement-breakpoint
ALTER TABLE "Delegation" RENAME TO "delegation";--> statement-breakpoint
ALTER TABLE "DelegationMember" RENAME TO "delegation_member";--> statement-breakpoint
ALTER TABLE "Nation" RENAME TO "nation";--> statement-breakpoint
ALTER TABLE "NonStateActor" RENAME TO "non_state_actor";--> statement-breakpoint
ALTER TABLE "Paper" RENAME TO "paper";--> statement-breakpoint
ALTER TABLE "PaperReview" RENAME TO "paper_review";--> statement-breakpoint
ALTER TABLE "PaperVersion" RENAME TO "paper_version";--> statement-breakpoint
ALTER TABLE "PaymentTransaction" RENAME TO "payment_transaction";--> statement-breakpoint
ALTER TABLE "Place" RENAME TO "place";--> statement-breakpoint
ALTER TABLE "ReviewerSnippet" RENAME TO "reviewer_snippet";--> statement-breakpoint
ALTER TABLE "RoleApplication" RENAME TO "role_application";--> statement-breakpoint
ALTER TABLE "SingleParticipant" RENAME TO "single_participant";--> statement-breakpoint
ALTER TABLE "SurveyAnswer" RENAME TO "survey_answer";--> statement-breakpoint
ALTER TABLE "SurveyOption" RENAME TO "survey_option";--> statement-breakpoint
ALTER TABLE "SurveyQuestion" RENAME TO "survey_question";--> statement-breakpoint
ALTER TABLE "TeamMember" RENAME TO "team_member";--> statement-breakpoint
ALTER TABLE "TeamMemberInvitation" RENAME TO "team_member_invitation";--> statement-breakpoint
ALTER TABLE "User" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "UserReferenceInPaymentTransaction" RENAME TO "user_reference_in_payment_transaction";--> statement-breakpoint
ALTER TABLE "WaitingListEntry" RENAME TO "waiting_list_entry";--> statement-breakpoint
ALTER TABLE "attendance_entry" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "attendance_entry" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "attendance_entry" RENAME COLUMN "conferenceParticipantStatusId" TO "conference_participant_status_id";--> statement-breakpoint
ALTER TABLE "attendance_entry" RENAME COLUMN "recordedById" TO "recorded_by_id";--> statement-breakpoint
ALTER TABLE "calendar_day" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "calendar_day" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "calendar_day" RENAME COLUMN "sortOrder" TO "sort_order";--> statement-breakpoint
ALTER TABLE "calendar_day" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "startTime" TO "start_time";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "endTime" TO "end_time";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "fontAwesomeIcon" TO "font_awesome_icon";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "calendarDayId" TO "calendar_day_id";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "calendarTrackId" TO "calendar_track_id";--> statement-breakpoint
ALTER TABLE "calendar_entry" RENAME COLUMN "placeId" TO "place_id";--> statement-breakpoint
ALTER TABLE "calendar_track" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "calendar_track" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "calendar_track" RENAME COLUMN "sortOrder" TO "sort_order";--> statement-breakpoint
ALTER TABLE "calendar_track" RENAME COLUMN "calendarDayId" TO "calendar_day_id";--> statement-breakpoint
ALTER TABLE "committee" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "committee" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "committee" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "committee" RENAME COLUMN "numOfSeatsPerDelegation" TO "num_of_seats_per_delegation";--> statement-breakpoint
ALTER TABLE "committee" RENAME COLUMN "resolutionHeadline" TO "resolution_headline";--> statement-breakpoint
ALTER TABLE "committee_agenda_item" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "committee_agenda_item" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "committee_agenda_item" RENAME COLUMN "teaserText" TO "teaser_text";--> statement-breakpoint
ALTER TABLE "committee_agenda_item" RENAME COLUMN "committeeId" TO "committee_id";--> statement-breakpoint
ALTER TABLE "committee_agenda_item" RENAME COLUMN "reviewHelpStatus" TO "review_help_status";--> statement-breakpoint
ALTER TABLE "committee_to_nation" RENAME COLUMN "A" TO "a";--> statement-breakpoint
ALTER TABLE "committee_to_nation" RENAME COLUMN "B" TO "b";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "longTitle" TO "long_title";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "endConference" TO "end_conference";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "startAssignment" TO "start_assignment";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "startConference" TO "start_conference";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "imageDataURL" TO "image_data_url";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "linkToPreparationGuide" TO "link_to_preparation_guide";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "accountHolder" TO "account_holder";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "bankName" TO "bank_name";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "feeAmount" TO "fee_amount";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "guardianConsentContent" TO "guardian_consent_content";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "mediaConsentContent" TO "media_consent_content";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalApartment" TO "postal_apartment";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalCity" TO "postal_city";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalCountry" TO "postal_country";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalName" TO "postal_name";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalStreet" TO "postal_street";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "postalZip" TO "postal_zip";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "termsAndConditionsContent" TO "terms_and_conditions_content";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "unlockPayments" TO "unlock_payments";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "unlockPostals" TO "unlock_postals";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "linkToPaperInbox" TO "link_to_paper_inbox";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "contractContent" TO "contract_content";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "certificateContent" TO "certificate_content";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "registrationDeadlineGracePeriodMinutes" TO "registration_deadline_grace_period_minutes";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "isOpenPaperSubmission" TO "is_open_paper_submission";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "emblemDataURL" TO "emblem_data_url";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "showInfoExpanded" TO "show_info_expanded";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "linkToServicesPage" TO "link_to_services_page";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "linkToTeamWiki" TO "link_to_team_wiki";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "logoDataURL" TO "logo_data_url";--> statement-breakpoint
ALTER TABLE "conference" RENAME COLUMN "showCalendar" TO "show_calendar";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "paymentStatus" TO "payment_status";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "didAttend" TO "did_attend";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "guardianConsent" TO "guardian_consent";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "mediaConsent" TO "media_consent";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "termsAndConditions" TO "terms_and_conditions";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "mediaConsentStatus" TO "media_consent_status";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "assigendDocumentNumber" TO "assigend_document_number";--> statement-breakpoint
ALTER TABLE "conference_participant_status" RENAME COLUMN "accessCardId" TO "access_card_id";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "plansOwnAttendenceAtConference" TO "plans_own_attendence_at_conference";--> statement-breakpoint
ALTER TABLE "conference_supervisor" RENAME COLUMN "connectionCode" TO "connection_code";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" RENAME COLUMN "A" TO "a";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" RENAME COLUMN "B" TO "b";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" RENAME COLUMN "A" TO "a";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" RENAME COLUMN "B" TO "b";--> statement-breakpoint
ALTER TABLE "custom_conference_role" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "custom_conference_role" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "custom_conference_role" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "custom_conference_role" RENAME COLUMN "fontAwesomeIcon" TO "font_awesome_icon";--> statement-breakpoint
ALTER TABLE "custom_conference_role" RENAME COLUMN "seatAmount" TO "seat_amount";--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" RENAME COLUMN "A" TO "a";--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" RENAME COLUMN "B" TO "b";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "entryCode" TO "entry_code";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "assignedNationAlpha3Code" TO "assigned_nation_alpha3_code";--> statement-breakpoint
ALTER TABLE "delegation" RENAME COLUMN "assignedNonStateActorId" TO "assigned_non_state_actor_id";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "delegationId" TO "delegation_id";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "isHeadDelegate" TO "is_head_delegate";--> statement-breakpoint
ALTER TABLE "delegation_member" RENAME COLUMN "assignedCommitteeId" TO "assigned_committee_id";--> statement-breakpoint
ALTER TABLE "nation" RENAME COLUMN "alpha3Code" TO "alpha3_code";--> statement-breakpoint
ALTER TABLE "nation" RENAME COLUMN "alpha2Code" TO "alpha2_code";--> statement-breakpoint
ALTER TABLE "nation" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "nation" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "non_state_actor" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "non_state_actor" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "non_state_actor" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "non_state_actor" RENAME COLUMN "fontAwesomeIcon" TO "font_awesome_icon";--> statement-breakpoint
ALTER TABLE "non_state_actor" RENAME COLUMN "seatAmount" TO "seat_amount";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "authorId" TO "author_id";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "delegationId" TO "delegation_id";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "agendaItemId" TO "agenda_item_id";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "paper" RENAME COLUMN "firstSubmittedAt" TO "first_submitted_at";--> statement-breakpoint
ALTER TABLE "paper_review" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "paper_review" RENAME COLUMN "reviewerId" TO "reviewer_id";--> statement-breakpoint
ALTER TABLE "paper_review" RENAME COLUMN "paperVersionId" TO "paper_version_id";--> statement-breakpoint
ALTER TABLE "paper_review" RENAME COLUMN "statusAfter" TO "status_after";--> statement-breakpoint
ALTER TABLE "paper_review" RENAME COLUMN "statusBefore" TO "status_before";--> statement-breakpoint
ALTER TABLE "paper_version" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "paper_version" RENAME COLUMN "paperId" TO "paper_id";--> statement-breakpoint
ALTER TABLE "payment_transaction" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "payment_transaction" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "payment_transaction" RENAME COLUMN "recievedAt" TO "recieved_at";--> statement-breakpoint
ALTER TABLE "payment_transaction" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "payment_transaction" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "websiteUrl" TO "website_url";--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "sitePlanDataURL" TO "site_plan_data_url";--> statement-breakpoint
ALTER TABLE "place" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "reviewer_snippet" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "reviewer_snippet" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "reviewer_snippet" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "role_application" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "role_application" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "role_application" RENAME COLUMN "nationId" TO "nation_id";--> statement-breakpoint
ALTER TABLE "role_application" RENAME COLUMN "nonStateActorId" TO "non_state_actor_id";--> statement-breakpoint
ALTER TABLE "role_application" RENAME COLUMN "delegationId" TO "delegation_id";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "assignedRoleId" TO "assigned_role_id";--> statement-breakpoint
ALTER TABLE "single_participant" RENAME COLUMN "assignmentDetails" TO "assignment_details";--> statement-breakpoint
ALTER TABLE "survey_answer" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "survey_answer" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "survey_answer" RENAME COLUMN "questionId" TO "question_id";--> statement-breakpoint
ALTER TABLE "survey_answer" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "survey_answer" RENAME COLUMN "optionId" TO "option_id";--> statement-breakpoint
ALTER TABLE "survey_option" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "survey_option" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "survey_option" RENAME COLUMN "questionId" TO "question_id";--> statement-breakpoint
ALTER TABLE "survey_option" RENAME COLUMN "upperLimit" TO "upper_limit";--> statement-breakpoint
ALTER TABLE "survey_question" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "survey_question" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "survey_question" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "survey_question" RENAME COLUMN "showSelectionOnDashboard" TO "show_selection_on_dashboard";--> statement-breakpoint
ALTER TABLE "team_member" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "team_member" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "team_member" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "team_member" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "expiresAt" TO "expires_at";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "usedAt" TO "used_at";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "revokedAt" TO "revoked_at";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "invitedById" TO "invited_by_id";--> statement-breakpoint
ALTER TABLE "team_member_invitation" RENAME COLUMN "acceptedById" TO "accepted_by_id";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "foodPreference" TO "food_preference";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "wantsToReceiveGeneralInformation" TO "wants_to_receive_general_information";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "wantsJoinTeamInformation" TO "wants_join_team_information";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "emergencyContacts" TO "emergency_contacts";--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "globalNotes" TO "global_notes";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" RENAME COLUMN "paymentTransactionId" TO "payment_transaction_id";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" RENAME COLUMN "conferenceId" TO "conference_id";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER INDEX "CalendarDay_conferenceId_sortOrder_key" RENAME TO "calendar_day_conference_id_sort_order_key";--> statement-breakpoint
ALTER INDEX "CalendarTrack_calendarDayId_sortOrder_key" RENAME TO "calendar_track_calendar_day_id_sort_order_key";--> statement-breakpoint
ALTER INDEX "_CommitteeToNation_B_index" RENAME TO "committee_to_nation_b_index";--> statement-breakpoint
ALTER INDEX "ConferenceParticipantStatus_conferenceId_assigendDocumentNu_key" RENAME TO "conference_participant_status_conference_id_doc_number_key";--> statement-breakpoint
ALTER INDEX "ConferenceParticipantStatus_userId_conferenceId_key" RENAME TO "conference_participant_status_user_id_conference_id_key";--> statement-breakpoint
ALTER INDEX "ConferenceSupervisor_conferenceId_connectionCode_key" RENAME TO "conference_supervisor_conference_id_connection_code_key";--> statement-breakpoint
ALTER INDEX "ConferenceSupervisor_conferenceId_userId_key" RENAME TO "conference_supervisor_conference_id_user_id_key";--> statement-breakpoint
ALTER INDEX "_ConferenceSupervisorToDelegationMember_B_index" RENAME TO "conference_supervisor_to_delegation_member_b_index";--> statement-breakpoint
ALTER INDEX "_ConferenceSupervisorToSingleParticipant_B_index" RENAME TO "conference_supervisor_to_single_participant_b_index";--> statement-breakpoint
ALTER INDEX "CustomConferenceRole_conferenceId_name_key" RENAME TO "custom_conference_role_conference_id_name_key";--> statement-breakpoint
ALTER INDEX "_CustomConferenceRoleToSingleParticipant_B_index" RENAME TO "custom_conference_role_to_single_participant_b_index";--> statement-breakpoint
ALTER INDEX "Delegation_conferenceId_assignedNationAlpha3Code_key" RENAME TO "delegation_conference_id_assigned_nation_alpha3_code_key";--> statement-breakpoint
ALTER INDEX "Delegation_conferenceId_assignedNonStateActorId_key" RENAME TO "delegation_conference_id_assigned_non_state_actor_id_key";--> statement-breakpoint
ALTER INDEX "Delegation_conferenceId_entryCode_key" RENAME TO "delegation_conference_id_entry_code_key";--> statement-breakpoint
ALTER INDEX "DelegationMember_conferenceId_userId_key" RENAME TO "delegation_member_conference_id_user_id_key";--> statement-breakpoint
ALTER INDEX "DelegationMember_delegationId_userId_key" RENAME TO "delegation_member_delegation_id_user_id_key";--> statement-breakpoint
ALTER INDEX "Nation_alpha2Code_key" RENAME TO "nation_alpha2_code_key";--> statement-breakpoint
ALTER INDEX "NonStateActor_conferenceId_abbreviation_key" RENAME TO "non_state_actor_conference_id_abbreviation_key";--> statement-breakpoint
ALTER INDEX "NonStateActor_conferenceId_name_key" RENAME TO "non_state_actor_conference_id_name_key";--> statement-breakpoint
ALTER INDEX "PaperVersion_paperId_version_key" RENAME TO "paper_version_paper_id_version_key";--> statement-breakpoint
ALTER INDEX "Place_conferenceId_name_key" RENAME TO "place_conference_id_name_key";--> statement-breakpoint
ALTER INDEX "ReviewerSnippet_userId_name_key" RENAME TO "reviewer_snippet_user_id_name_key";--> statement-breakpoint
ALTER INDEX "RoleApplication_delegationId_nationId_key" RENAME TO "role_application_delegation_id_nation_id_key";--> statement-breakpoint
ALTER INDEX "RoleApplication_delegationId_nonStateActorId_key" RENAME TO "role_application_delegation_id_non_state_actor_id_key";--> statement-breakpoint
ALTER INDEX "RoleApplication_delegationId_rank_key" RENAME TO "role_application_delegation_id_rank_key";--> statement-breakpoint
ALTER INDEX "SingleParticipant_conferenceId_userId_key" RENAME TO "single_participant_conference_id_user_id_key";--> statement-breakpoint
ALTER INDEX "SurveyAnswer_questionId_userId_key" RENAME TO "survey_answer_question_id_user_id_key";--> statement-breakpoint
ALTER INDEX "SurveyOption_questionId_title_key" RENAME TO "survey_option_question_id_title_key";--> statement-breakpoint
ALTER INDEX "SurveyQuestion_conferenceId_title_key" RENAME TO "survey_question_conference_id_title_key";--> statement-breakpoint
ALTER INDEX "TeamMember_conferenceId_userId_key" RENAME TO "team_member_conference_id_user_id_key";--> statement-breakpoint
ALTER INDEX "TeamMemberInvitation_conferenceId_email_idx" RENAME TO "team_member_invitation_conference_id_email_idx";--> statement-breakpoint
ALTER INDEX "TeamMemberInvitation_conferenceId_email_pending_key" RENAME TO "team_member_invitation_conference_id_email_pending_key";--> statement-breakpoint
ALTER INDEX "TeamMemberInvitation_conferenceId_idx" RENAME TO "team_member_invitation_conference_id_idx";--> statement-breakpoint
ALTER INDEX "TeamMemberInvitation_token_idx" RENAME TO "team_member_invitation_token_idx";--> statement-breakpoint
ALTER INDEX "TeamMemberInvitation_token_key" RENAME TO "team_member_invitation_token_key";--> statement-breakpoint
ALTER INDEX "User_email_key" RENAME TO "user_email_key";--> statement-breakpoint
ALTER INDEX "WaitingListEntry_conferenceId_userId_key" RENAME TO "waiting_list_entry_conference_id_user_id_key";--> statement-breakpoint
ALTER TABLE "committee_to_nation" RENAME CONSTRAINT "_CommitteeToNation_AB_pkey" TO "committee_to_nation_ab_pkey";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" RENAME CONSTRAINT "_ConferenceSupervisorToDelegationMember_AB_pkey" TO "conference_supervisor_to_delegation_member_ab_pkey";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" RENAME CONSTRAINT "_ConferenceSupervisorToSingleParticipant_AB_pkey" TO "conference_supervisor_to_single_participant_ab_pkey";--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" RENAME CONSTRAINT "_CustomConferenceRoleToSingleParticipant_AB_pkey" TO "custom_conference_role_to_single_participant_ab_pkey";