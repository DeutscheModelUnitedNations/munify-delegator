/* eslint-disable */
import type { Prisma, Conference, Committee, CommitteeAgendaItem, User, ConferenceParticipantStatus, PaymentTransaction, UserReferenceInPaymentTransaction, Paper, PaperVersion, PaperReview, Nation, NonStateActor, CustomConferenceRole, SingleParticipant, Delegation, RoleApplication, DelegationMember, ConferenceSupervisor, SurveyQuestion, SurveyOption, SurveyAnswer, WaitingListEntry, TeamMember } from "/Users/tadestrehk/Developer/DMUN/delegator/node_modules/@prisma/client/index.js";
import type { PothosPrismaDatamodel } from "@pothos/plugin-prisma";
export default interface PrismaTypes {
    Conference: {
        Name: "Conference";
        Shape: Conference;
        Include: Prisma.ConferenceInclude;
        Select: Prisma.ConferenceSelect;
        OrderBy: Prisma.ConferenceOrderByWithRelationInput;
        WhereUnique: Prisma.ConferenceWhereUniqueInput;
        Where: Prisma.ConferenceWhereInput;
        Create: Prisma.ConferenceCreateInput;
        Update: Prisma.ConferenceUpdateInput;
        RelationName: "individualApplicationOptions" | "delegations" | "nonStateActors" | "conferenceSupervisors" | "conferenceUserStatus" | "teamMembers" | "committees" | "singleParticipants" | "delegationMembers" | "paymentTransactions" | "surveyQuestions" | "WaitingListEntry" | "papers";
        ListRelations: "individualApplicationOptions" | "delegations" | "nonStateActors" | "conferenceSupervisors" | "conferenceUserStatus" | "teamMembers" | "committees" | "singleParticipants" | "delegationMembers" | "paymentTransactions" | "surveyQuestions" | "WaitingListEntry" | "papers";
        Relations: {
            individualApplicationOptions: {
                Shape: CustomConferenceRole[];
                Name: "CustomConferenceRole";
                Nullable: false;
            };
            delegations: {
                Shape: Delegation[];
                Name: "Delegation";
                Nullable: false;
            };
            nonStateActors: {
                Shape: NonStateActor[];
                Name: "NonStateActor";
                Nullable: false;
            };
            conferenceSupervisors: {
                Shape: ConferenceSupervisor[];
                Name: "ConferenceSupervisor";
                Nullable: false;
            };
            conferenceUserStatus: {
                Shape: ConferenceParticipantStatus[];
                Name: "ConferenceParticipantStatus";
                Nullable: false;
            };
            teamMembers: {
                Shape: TeamMember[];
                Name: "TeamMember";
                Nullable: false;
            };
            committees: {
                Shape: Committee[];
                Name: "Committee";
                Nullable: false;
            };
            singleParticipants: {
                Shape: SingleParticipant[];
                Name: "SingleParticipant";
                Nullable: false;
            };
            delegationMembers: {
                Shape: DelegationMember[];
                Name: "DelegationMember";
                Nullable: false;
            };
            paymentTransactions: {
                Shape: PaymentTransaction[];
                Name: "PaymentTransaction";
                Nullable: false;
            };
            surveyQuestions: {
                Shape: SurveyQuestion[];
                Name: "SurveyQuestion";
                Nullable: false;
            };
            WaitingListEntry: {
                Shape: WaitingListEntry[];
                Name: "WaitingListEntry";
                Nullable: false;
            };
            papers: {
                Shape: Paper[];
                Name: "Paper";
                Nullable: false;
            };
        };
    };
    Committee: {
        Name: "Committee";
        Shape: Committee;
        Include: Prisma.CommitteeInclude;
        Select: Prisma.CommitteeSelect;
        OrderBy: Prisma.CommitteeOrderByWithRelationInput;
        WhereUnique: Prisma.CommitteeWhereUniqueInput;
        Where: Prisma.CommitteeWhereInput;
        Create: Prisma.CommitteeCreateInput;
        Update: Prisma.CommitteeUpdateInput;
        RelationName: "conference" | "nations" | "delegationMembers" | "CommitteeAgendaItem";
        ListRelations: "nations" | "delegationMembers" | "CommitteeAgendaItem";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            nations: {
                Shape: Nation[];
                Name: "Nation";
                Nullable: false;
            };
            delegationMembers: {
                Shape: DelegationMember[];
                Name: "DelegationMember";
                Nullable: false;
            };
            CommitteeAgendaItem: {
                Shape: CommitteeAgendaItem[];
                Name: "CommitteeAgendaItem";
                Nullable: false;
            };
        };
    };
    CommitteeAgendaItem: {
        Name: "CommitteeAgendaItem";
        Shape: CommitteeAgendaItem;
        Include: Prisma.CommitteeAgendaItemInclude;
        Select: Prisma.CommitteeAgendaItemSelect;
        OrderBy: Prisma.CommitteeAgendaItemOrderByWithRelationInput;
        WhereUnique: Prisma.CommitteeAgendaItemWhereUniqueInput;
        Where: Prisma.CommitteeAgendaItemWhereInput;
        Create: Prisma.CommitteeAgendaItemCreateInput;
        Update: Prisma.CommitteeAgendaItemUpdateInput;
        RelationName: "committee" | "papers";
        ListRelations: "papers";
        Relations: {
            committee: {
                Shape: Committee;
                Name: "Committee";
                Nullable: false;
            };
            papers: {
                Shape: Paper[];
                Name: "Paper";
                Nullable: false;
            };
        };
    };
    User: {
        Name: "User";
        Shape: User;
        Include: Prisma.UserInclude;
        Select: Prisma.UserSelect;
        OrderBy: Prisma.UserOrderByWithRelationInput;
        WhereUnique: Prisma.UserWhereUniqueInput;
        Where: Prisma.UserWhereInput;
        Create: Prisma.UserCreateInput;
        Update: Prisma.UserUpdateInput;
        RelationName: "delegationMemberships" | "singleParticipant" | "conferenceSupervisor" | "conferenceParticipantStatus" | "teamMember" | "ownPaymentTransactions" | "paymentTransactionsReferences" | "surveyAnswers" | "waitingListEntry" | "papers" | "paperReviews";
        ListRelations: "delegationMemberships" | "singleParticipant" | "conferenceSupervisor" | "conferenceParticipantStatus" | "teamMember" | "ownPaymentTransactions" | "paymentTransactionsReferences" | "surveyAnswers" | "waitingListEntry" | "papers" | "paperReviews";
        Relations: {
            delegationMemberships: {
                Shape: DelegationMember[];
                Name: "DelegationMember";
                Nullable: false;
            };
            singleParticipant: {
                Shape: SingleParticipant[];
                Name: "SingleParticipant";
                Nullable: false;
            };
            conferenceSupervisor: {
                Shape: ConferenceSupervisor[];
                Name: "ConferenceSupervisor";
                Nullable: false;
            };
            conferenceParticipantStatus: {
                Shape: ConferenceParticipantStatus[];
                Name: "ConferenceParticipantStatus";
                Nullable: false;
            };
            teamMember: {
                Shape: TeamMember[];
                Name: "TeamMember";
                Nullable: false;
            };
            ownPaymentTransactions: {
                Shape: PaymentTransaction[];
                Name: "PaymentTransaction";
                Nullable: false;
            };
            paymentTransactionsReferences: {
                Shape: UserReferenceInPaymentTransaction[];
                Name: "UserReferenceInPaymentTransaction";
                Nullable: false;
            };
            surveyAnswers: {
                Shape: SurveyAnswer[];
                Name: "SurveyAnswer";
                Nullable: false;
            };
            waitingListEntry: {
                Shape: WaitingListEntry[];
                Name: "WaitingListEntry";
                Nullable: false;
            };
            papers: {
                Shape: Paper[];
                Name: "Paper";
                Nullable: false;
            };
            paperReviews: {
                Shape: PaperReview[];
                Name: "PaperReview";
                Nullable: false;
            };
        };
    };
    ConferenceParticipantStatus: {
        Name: "ConferenceParticipantStatus";
        Shape: ConferenceParticipantStatus;
        Include: Prisma.ConferenceParticipantStatusInclude;
        Select: Prisma.ConferenceParticipantStatusSelect;
        OrderBy: Prisma.ConferenceParticipantStatusOrderByWithRelationInput;
        WhereUnique: Prisma.ConferenceParticipantStatusWhereUniqueInput;
        Where: Prisma.ConferenceParticipantStatusWhereInput;
        Create: Prisma.ConferenceParticipantStatusCreateInput;
        Update: Prisma.ConferenceParticipantStatusUpdateInput;
        RelationName: "user" | "conference";
        ListRelations: never;
        Relations: {
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
        };
    };
    PaymentTransaction: {
        Name: "PaymentTransaction";
        Shape: PaymentTransaction;
        Include: Prisma.PaymentTransactionInclude;
        Select: Prisma.PaymentTransactionSelect;
        OrderBy: Prisma.PaymentTransactionOrderByWithRelationInput;
        WhereUnique: Prisma.PaymentTransactionWhereUniqueInput;
        Where: Prisma.PaymentTransactionWhereInput;
        Create: Prisma.PaymentTransactionCreateInput;
        Update: Prisma.PaymentTransactionUpdateInput;
        RelationName: "conference" | "user" | "paymentFor";
        ListRelations: "paymentFor";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            paymentFor: {
                Shape: UserReferenceInPaymentTransaction[];
                Name: "UserReferenceInPaymentTransaction";
                Nullable: false;
            };
        };
    };
    UserReferenceInPaymentTransaction: {
        Name: "UserReferenceInPaymentTransaction";
        Shape: UserReferenceInPaymentTransaction;
        Include: Prisma.UserReferenceInPaymentTransactionInclude;
        Select: Prisma.UserReferenceInPaymentTransactionSelect;
        OrderBy: Prisma.UserReferenceInPaymentTransactionOrderByWithRelationInput;
        WhereUnique: Prisma.UserReferenceInPaymentTransactionWhereUniqueInput;
        Where: Prisma.UserReferenceInPaymentTransactionWhereInput;
        Create: Prisma.UserReferenceInPaymentTransactionCreateInput;
        Update: Prisma.UserReferenceInPaymentTransactionUpdateInput;
        RelationName: "paymentTransaction" | "user";
        ListRelations: never;
        Relations: {
            paymentTransaction: {
                Shape: PaymentTransaction;
                Name: "PaymentTransaction";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
        };
    };
    Paper: {
        Name: "Paper";
        Shape: Paper;
        Include: Prisma.PaperInclude;
        Select: Prisma.PaperSelect;
        OrderBy: Prisma.PaperOrderByWithRelationInput;
        WhereUnique: Prisma.PaperWhereUniqueInput;
        Where: Prisma.PaperWhereInput;
        Create: Prisma.PaperCreateInput;
        Update: Prisma.PaperUpdateInput;
        RelationName: "author" | "conference" | "delegation" | "agendaItem" | "versions";
        ListRelations: "versions";
        Relations: {
            author: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            delegation: {
                Shape: Delegation;
                Name: "Delegation";
                Nullable: false;
            };
            agendaItem: {
                Shape: CommitteeAgendaItem | null;
                Name: "CommitteeAgendaItem";
                Nullable: true;
            };
            versions: {
                Shape: PaperVersion[];
                Name: "PaperVersion";
                Nullable: false;
            };
        };
    };
    PaperVersion: {
        Name: "PaperVersion";
        Shape: PaperVersion;
        Include: Prisma.PaperVersionInclude;
        Select: Prisma.PaperVersionSelect;
        OrderBy: Prisma.PaperVersionOrderByWithRelationInput;
        WhereUnique: Prisma.PaperVersionWhereUniqueInput;
        Where: Prisma.PaperVersionWhereInput;
        Create: Prisma.PaperVersionCreateInput;
        Update: Prisma.PaperVersionUpdateInput;
        RelationName: "paper" | "reviews";
        ListRelations: "reviews";
        Relations: {
            paper: {
                Shape: Paper;
                Name: "Paper";
                Nullable: false;
            };
            reviews: {
                Shape: PaperReview[];
                Name: "PaperReview";
                Nullable: false;
            };
        };
    };
    PaperReview: {
        Name: "PaperReview";
        Shape: PaperReview;
        Include: Prisma.PaperReviewInclude;
        Select: Prisma.PaperReviewSelect;
        OrderBy: Prisma.PaperReviewOrderByWithRelationInput;
        WhereUnique: Prisma.PaperReviewWhereUniqueInput;
        Where: Prisma.PaperReviewWhereInput;
        Create: Prisma.PaperReviewCreateInput;
        Update: Prisma.PaperReviewUpdateInput;
        RelationName: "paperVersion" | "reviewer";
        ListRelations: never;
        Relations: {
            paperVersion: {
                Shape: PaperVersion;
                Name: "PaperVersion";
                Nullable: false;
            };
            reviewer: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
        };
    };
    Nation: {
        Name: "Nation";
        Shape: Nation;
        Include: Prisma.NationInclude;
        Select: Prisma.NationSelect;
        OrderBy: Prisma.NationOrderByWithRelationInput;
        WhereUnique: Prisma.NationWhereUniqueInput;
        Where: Prisma.NationWhereInput;
        Create: Prisma.NationCreateInput;
        Update: Prisma.NationUpdateInput;
        RelationName: "roleApplications" | "committees" | "assignedDelegations";
        ListRelations: "roleApplications" | "committees" | "assignedDelegations";
        Relations: {
            roleApplications: {
                Shape: RoleApplication[];
                Name: "RoleApplication";
                Nullable: false;
            };
            committees: {
                Shape: Committee[];
                Name: "Committee";
                Nullable: false;
            };
            assignedDelegations: {
                Shape: Delegation[];
                Name: "Delegation";
                Nullable: false;
            };
        };
    };
    NonStateActor: {
        Name: "NonStateActor";
        Shape: NonStateActor;
        Include: Prisma.NonStateActorInclude;
        Select: Prisma.NonStateActorSelect;
        OrderBy: Prisma.NonStateActorOrderByWithRelationInput;
        WhereUnique: Prisma.NonStateActorWhereUniqueInput;
        Where: Prisma.NonStateActorWhereInput;
        Create: Prisma.NonStateActorCreateInput;
        Update: Prisma.NonStateActorUpdateInput;
        RelationName: "conference" | "roleApplications" | "assignedDelegations";
        ListRelations: "roleApplications" | "assignedDelegations";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            roleApplications: {
                Shape: RoleApplication[];
                Name: "RoleApplication";
                Nullable: false;
            };
            assignedDelegations: {
                Shape: Delegation[];
                Name: "Delegation";
                Nullable: false;
            };
        };
    };
    CustomConferenceRole: {
        Name: "CustomConferenceRole";
        Shape: CustomConferenceRole;
        Include: Prisma.CustomConferenceRoleInclude;
        Select: Prisma.CustomConferenceRoleSelect;
        OrderBy: Prisma.CustomConferenceRoleOrderByWithRelationInput;
        WhereUnique: Prisma.CustomConferenceRoleWhereUniqueInput;
        Where: Prisma.CustomConferenceRoleWhereInput;
        Create: Prisma.CustomConferenceRoleCreateInput;
        Update: Prisma.CustomConferenceRoleUpdateInput;
        RelationName: "conference" | "singleParticipant" | "singleParticipantAssignments";
        ListRelations: "singleParticipant" | "singleParticipantAssignments";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            singleParticipant: {
                Shape: SingleParticipant[];
                Name: "SingleParticipant";
                Nullable: false;
            };
            singleParticipantAssignments: {
                Shape: SingleParticipant[];
                Name: "SingleParticipant";
                Nullable: false;
            };
        };
    };
    SingleParticipant: {
        Name: "SingleParticipant";
        Shape: SingleParticipant;
        Include: Prisma.SingleParticipantInclude;
        Select: Prisma.SingleParticipantSelect;
        OrderBy: Prisma.SingleParticipantOrderByWithRelationInput;
        WhereUnique: Prisma.SingleParticipantWhereUniqueInput;
        Where: Prisma.SingleParticipantWhereInput;
        Create: Prisma.SingleParticipantCreateInput;
        Update: Prisma.SingleParticipantUpdateInput;
        RelationName: "conference" | "user" | "assignedRole" | "appliedForRoles" | "supervisors";
        ListRelations: "appliedForRoles" | "supervisors";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            assignedRole: {
                Shape: CustomConferenceRole | null;
                Name: "CustomConferenceRole";
                Nullable: true;
            };
            appliedForRoles: {
                Shape: CustomConferenceRole[];
                Name: "CustomConferenceRole";
                Nullable: false;
            };
            supervisors: {
                Shape: ConferenceSupervisor[];
                Name: "ConferenceSupervisor";
                Nullable: false;
            };
        };
    };
    Delegation: {
        Name: "Delegation";
        Shape: Delegation;
        Include: Prisma.DelegationInclude;
        Select: Prisma.DelegationSelect;
        OrderBy: Prisma.DelegationOrderByWithRelationInput;
        WhereUnique: Prisma.DelegationWhereUniqueInput;
        Where: Prisma.DelegationWhereInput;
        Create: Prisma.DelegationCreateInput;
        Update: Prisma.DelegationUpdateInput;
        RelationName: "conference" | "members" | "appliedForRoles" | "assignedNation" | "assignedNonStateActor" | "papers";
        ListRelations: "members" | "appliedForRoles" | "papers";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            members: {
                Shape: DelegationMember[];
                Name: "DelegationMember";
                Nullable: false;
            };
            appliedForRoles: {
                Shape: RoleApplication[];
                Name: "RoleApplication";
                Nullable: false;
            };
            assignedNation: {
                Shape: Nation | null;
                Name: "Nation";
                Nullable: true;
            };
            assignedNonStateActor: {
                Shape: NonStateActor | null;
                Name: "NonStateActor";
                Nullable: true;
            };
            papers: {
                Shape: Paper[];
                Name: "Paper";
                Nullable: false;
            };
        };
    };
    RoleApplication: {
        Name: "RoleApplication";
        Shape: RoleApplication;
        Include: Prisma.RoleApplicationInclude;
        Select: Prisma.RoleApplicationSelect;
        OrderBy: Prisma.RoleApplicationOrderByWithRelationInput;
        WhereUnique: Prisma.RoleApplicationWhereUniqueInput;
        Where: Prisma.RoleApplicationWhereInput;
        Create: Prisma.RoleApplicationCreateInput;
        Update: Prisma.RoleApplicationUpdateInput;
        RelationName: "delegation" | "nation" | "nonStateActor";
        ListRelations: never;
        Relations: {
            delegation: {
                Shape: Delegation;
                Name: "Delegation";
                Nullable: false;
            };
            nation: {
                Shape: Nation | null;
                Name: "Nation";
                Nullable: true;
            };
            nonStateActor: {
                Shape: NonStateActor | null;
                Name: "NonStateActor";
                Nullable: true;
            };
        };
    };
    DelegationMember: {
        Name: "DelegationMember";
        Shape: DelegationMember;
        Include: Prisma.DelegationMemberInclude;
        Select: Prisma.DelegationMemberSelect;
        OrderBy: Prisma.DelegationMemberOrderByWithRelationInput;
        WhereUnique: Prisma.DelegationMemberWhereUniqueInput;
        Where: Prisma.DelegationMemberWhereInput;
        Create: Prisma.DelegationMemberCreateInput;
        Update: Prisma.DelegationMemberUpdateInput;
        RelationName: "conference" | "delegation" | "user" | "assignedCommittee" | "supervisors";
        ListRelations: "supervisors";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            delegation: {
                Shape: Delegation;
                Name: "Delegation";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            assignedCommittee: {
                Shape: Committee | null;
                Name: "Committee";
                Nullable: true;
            };
            supervisors: {
                Shape: ConferenceSupervisor[];
                Name: "ConferenceSupervisor";
                Nullable: false;
            };
        };
    };
    ConferenceSupervisor: {
        Name: "ConferenceSupervisor";
        Shape: ConferenceSupervisor;
        Include: Prisma.ConferenceSupervisorInclude;
        Select: Prisma.ConferenceSupervisorSelect;
        OrderBy: Prisma.ConferenceSupervisorOrderByWithRelationInput;
        WhereUnique: Prisma.ConferenceSupervisorWhereUniqueInput;
        Where: Prisma.ConferenceSupervisorWhereInput;
        Create: Prisma.ConferenceSupervisorCreateInput;
        Update: Prisma.ConferenceSupervisorUpdateInput;
        RelationName: "conference" | "user" | "supervisedDelegationMembers" | "supervisedSingleParticipants";
        ListRelations: "supervisedDelegationMembers" | "supervisedSingleParticipants";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            supervisedDelegationMembers: {
                Shape: DelegationMember[];
                Name: "DelegationMember";
                Nullable: false;
            };
            supervisedSingleParticipants: {
                Shape: SingleParticipant[];
                Name: "SingleParticipant";
                Nullable: false;
            };
        };
    };
    SurveyQuestion: {
        Name: "SurveyQuestion";
        Shape: SurveyQuestion;
        Include: Prisma.SurveyQuestionInclude;
        Select: Prisma.SurveyQuestionSelect;
        OrderBy: Prisma.SurveyQuestionOrderByWithRelationInput;
        WhereUnique: Prisma.SurveyQuestionWhereUniqueInput;
        Where: Prisma.SurveyQuestionWhereInput;
        Create: Prisma.SurveyQuestionCreateInput;
        Update: Prisma.SurveyQuestionUpdateInput;
        RelationName: "conference" | "options" | "surveyAnswers";
        ListRelations: "options" | "surveyAnswers";
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            options: {
                Shape: SurveyOption[];
                Name: "SurveyOption";
                Nullable: false;
            };
            surveyAnswers: {
                Shape: SurveyAnswer[];
                Name: "SurveyAnswer";
                Nullable: false;
            };
        };
    };
    SurveyOption: {
        Name: "SurveyOption";
        Shape: SurveyOption;
        Include: Prisma.SurveyOptionInclude;
        Select: Prisma.SurveyOptionSelect;
        OrderBy: Prisma.SurveyOptionOrderByWithRelationInput;
        WhereUnique: Prisma.SurveyOptionWhereUniqueInput;
        Where: Prisma.SurveyOptionWhereInput;
        Create: Prisma.SurveyOptionCreateInput;
        Update: Prisma.SurveyOptionUpdateInput;
        RelationName: "question" | "surveyAnswers";
        ListRelations: "surveyAnswers";
        Relations: {
            question: {
                Shape: SurveyQuestion;
                Name: "SurveyQuestion";
                Nullable: false;
            };
            surveyAnswers: {
                Shape: SurveyAnswer[];
                Name: "SurveyAnswer";
                Nullable: false;
            };
        };
    };
    SurveyAnswer: {
        Name: "SurveyAnswer";
        Shape: SurveyAnswer;
        Include: Prisma.SurveyAnswerInclude;
        Select: Prisma.SurveyAnswerSelect;
        OrderBy: Prisma.SurveyAnswerOrderByWithRelationInput;
        WhereUnique: Prisma.SurveyAnswerWhereUniqueInput;
        Where: Prisma.SurveyAnswerWhereInput;
        Create: Prisma.SurveyAnswerCreateInput;
        Update: Prisma.SurveyAnswerUpdateInput;
        RelationName: "question" | "user" | "option";
        ListRelations: never;
        Relations: {
            question: {
                Shape: SurveyQuestion;
                Name: "SurveyQuestion";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
            option: {
                Shape: SurveyOption;
                Name: "SurveyOption";
                Nullable: false;
            };
        };
    };
    WaitingListEntry: {
        Name: "WaitingListEntry";
        Shape: WaitingListEntry;
        Include: Prisma.WaitingListEntryInclude;
        Select: Prisma.WaitingListEntrySelect;
        OrderBy: Prisma.WaitingListEntryOrderByWithRelationInput;
        WhereUnique: Prisma.WaitingListEntryWhereUniqueInput;
        Where: Prisma.WaitingListEntryWhereInput;
        Create: Prisma.WaitingListEntryCreateInput;
        Update: Prisma.WaitingListEntryUpdateInput;
        RelationName: "conference" | "user";
        ListRelations: never;
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
        };
    };
    TeamMember: {
        Name: "TeamMember";
        Shape: TeamMember;
        Include: Prisma.TeamMemberInclude;
        Select: Prisma.TeamMemberSelect;
        OrderBy: Prisma.TeamMemberOrderByWithRelationInput;
        WhereUnique: Prisma.TeamMemberWhereUniqueInput;
        Where: Prisma.TeamMemberWhereInput;
        Create: Prisma.TeamMemberCreateInput;
        Update: Prisma.TeamMemberUpdateInput;
        RelationName: "conference" | "user";
        ListRelations: never;
        Relations: {
            conference: {
                Shape: Conference;
                Name: "Conference";
                Nullable: false;
            };
            user: {
                Shape: User;
                Name: "User";
                Nullable: false;
            };
        };
    };
}
export function getDatamodel(): PothosPrismaDatamodel { return JSON.parse("{\"datamodel\":{\"models\":{\"Conference\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"title\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"longTitle\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"location\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"language\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"website\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"imageDataURL\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"info\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"linkToPreparationGuide\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"linkToPaperInbox\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"isOpenPaperSubmission\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"ConferenceState\",\"kind\":\"enum\",\"name\":\"state\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"startAssignment\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"registrationDeadlineGracePeriodMinutes\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"startConference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"endConference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"unlockPayments\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"unlockPostals\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Float\",\"kind\":\"scalar\",\"name\":\"feeAmount\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"accountHolder\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"iban\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"bic\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"bankName\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"currency\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalName\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalStreet\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalApartment\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalZip\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalCity\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"postalCountry\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"contractContent\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"guardianConsentContent\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"mediaConsentContent\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"termsAndConditionsContent\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"certificateContent\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"CustomConferenceRole\",\"kind\":\"object\",\"name\":\"individualApplicationOptions\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToCustomConferenceRole\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"delegations\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToDelegation\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"NonStateActor\",\"kind\":\"object\",\"name\":\"nonStateActors\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToNonStateActor\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"ConferenceSupervisor\",\"kind\":\"object\",\"name\":\"conferenceSupervisors\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToConferenceSupervisor\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"ConferenceParticipantStatus\",\"kind\":\"object\",\"name\":\"conferenceUserStatus\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToConferenceParticipantStatus\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"TeamMember\",\"kind\":\"object\",\"name\":\"teamMembers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToTeamMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Committee\",\"kind\":\"object\",\"name\":\"committees\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToConference\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SingleParticipant\",\"kind\":\"object\",\"name\":\"singleParticipants\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToSingleParticipant\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DelegationMember\",\"kind\":\"object\",\"name\":\"delegationMembers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToDelegationMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"PaymentTransaction\",\"kind\":\"object\",\"name\":\"paymentTransactions\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToPaymentTransaction\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SurveyQuestion\",\"kind\":\"object\",\"name\":\"surveyQuestions\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToSurveyQuestion\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"WaitingListEntry\",\"kind\":\"object\",\"name\":\"WaitingListEntry\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToWaitingListEntry\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Paper\",\"kind\":\"object\",\"name\":\"papers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToPaper\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"Committee\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"name\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"abbreviation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"numOfSeatsPerDelegation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToConference\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Nation\",\"kind\":\"object\",\"name\":\"nations\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToNation\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DelegationMember\",\"kind\":\"object\",\"name\":\"delegationMembers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToDelegationMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"CommitteeAgendaItem\",\"kind\":\"object\",\"name\":\"CommitteeAgendaItem\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToCommitteeAgendaItem\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"CommitteeAgendaItem\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"title\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"teaserText\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Committee\",\"kind\":\"object\",\"name\":\"committee\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToCommitteeAgendaItem\",\"relationFromFields\":[\"committeeId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"committeeId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Paper\",\"kind\":\"object\",\"name\":\"papers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeAgendaItemToPaper\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"User\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"email\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":true,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"family_name\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"given_name\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"locale\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"preferred_username\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"birthday\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"phone\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"street\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"apartment\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"zip\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"city\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"country\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Gender\",\"kind\":\"enum\",\"name\":\"gender\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"pronouns\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"FoodPreference\",\"kind\":\"enum\",\"name\":\"foodPreference\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"emergencyContacts\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"wantsToReceiveGeneralInformation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"wantsJoinTeamInformation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"globalNotes\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DelegationMember\",\"kind\":\"object\",\"name\":\"delegationMemberships\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationMemberToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SingleParticipant\",\"kind\":\"object\",\"name\":\"singleParticipant\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SingleParticipantToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"ConferenceSupervisor\",\"kind\":\"object\",\"name\":\"conferenceSupervisor\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"ConferenceParticipantStatus\",\"kind\":\"object\",\"name\":\"conferenceParticipantStatus\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceParticipantStatusToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"TeamMember\",\"kind\":\"object\",\"name\":\"teamMember\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"TeamMemberToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"PaymentTransaction\",\"kind\":\"object\",\"name\":\"ownPaymentTransactions\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaymentTransactionToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"UserReferenceInPaymentTransaction\",\"kind\":\"object\",\"name\":\"paymentTransactionsReferences\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"UserToUserReferenceInPaymentTransaction\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SurveyAnswer\",\"kind\":\"object\",\"name\":\"surveyAnswers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"WaitingListEntry\",\"kind\":\"object\",\"name\":\"waitingListEntry\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"UserToWaitingListEntry\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Paper\",\"kind\":\"object\",\"name\":\"papers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"PaperReview\",\"kind\":\"object\",\"name\":\"paperReviews\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperReviewToUser\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"ConferenceParticipantStatus\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"AdministrativeStatus\",\"kind\":\"enum\",\"name\":\"termsAndConditions\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"AdministrativeStatus\",\"kind\":\"enum\",\"name\":\"guardianConsent\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"AdministrativeStatus\",\"kind\":\"enum\",\"name\":\"mediaConsent\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"AdministrativeStatus\",\"kind\":\"enum\",\"name\":\"paymentStatus\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"MediaConsentStatus\",\"kind\":\"enum\",\"name\":\"mediaConsentStatus\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"didAttend\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"assigendDocumentNumber\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceParticipantStatusToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToConferenceParticipantStatus\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"userId\",\"conferenceId\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"assigendDocumentNumber\"]}]},\"PaymentTransaction\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Float\",\"kind\":\"scalar\",\"name\":\"amount\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToPaymentTransaction\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaymentTransactionToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"UserReferenceInPaymentTransaction\",\"kind\":\"object\",\"name\":\"paymentFor\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaymentTransactionToUserReferenceInPaymentTransaction\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"recievedAt\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"UserReferenceInPaymentTransaction\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"PaymentTransaction\",\"kind\":\"object\",\"name\":\"paymentTransaction\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaymentTransactionToUserReferenceInPaymentTransaction\",\"relationFromFields\":[\"paymentTransactionId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"paymentTransactionId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"UserToUserReferenceInPaymentTransaction\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"Paper\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"PaperType\",\"kind\":\"enum\",\"name\":\"type\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"PaperStatus\",\"kind\":\"enum\",\"name\":\"status\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"author\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperToUser\",\"relationFromFields\":[\"authorId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"authorId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToPaper\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"delegation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToPaper\",\"relationFromFields\":[\"delegationId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"delegationId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"CommitteeAgendaItem\",\"kind\":\"object\",\"name\":\"agendaItem\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeAgendaItemToPaper\",\"relationFromFields\":[\"agendaItemId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"agendaItemId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"PaperVersion\",\"kind\":\"object\",\"name\":\"versions\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperToPaperVersion\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"firstSubmittedAt\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"PaperVersion\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"version\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"PaperStatus\",\"kind\":\"enum\",\"name\":\"status\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Json\",\"kind\":\"scalar\",\"name\":\"content\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Paper\",\"kind\":\"object\",\"name\":\"paper\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperToPaperVersion\",\"relationFromFields\":[\"paperId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"paperId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"PaperReview\",\"kind\":\"object\",\"name\":\"reviews\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperReviewToPaperVersion\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"paperId\",\"version\"]}]},\"PaperReview\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Json\",\"kind\":\"scalar\",\"name\":\"comments\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"PaperVersion\",\"kind\":\"object\",\"name\":\"paperVersion\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperReviewToPaperVersion\",\"relationFromFields\":[\"paperVersionId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"paperVersionId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"reviewer\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"PaperReviewToUser\",\"relationFromFields\":[\"reviewerId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"reviewerId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"Nation\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"alpha3Code\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"alpha2Code\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":true,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"RoleApplication\",\"kind\":\"object\",\"name\":\"roleApplications\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"NationToRoleApplication\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Committee\",\"kind\":\"object\",\"name\":\"committees\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToNation\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"assignedDelegations\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToNation\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[]},\"NonStateActor\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"name\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"description\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"fontAwesomeIcon\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"abbreviation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"seatAmount\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToNonStateActor\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"RoleApplication\",\"kind\":\"object\",\"name\":\"roleApplications\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"NonStateActorToRoleApplication\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"assignedDelegations\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToNonStateActor\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"abbreviation\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"name\"]}]},\"CustomConferenceRole\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"name\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"description\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"fontAwesomeIcon\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"seatAmount\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToCustomConferenceRole\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"SingleParticipant\",\"kind\":\"object\",\"name\":\"singleParticipant\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CustomConferenceRoleToSingleParticipant\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SingleParticipant\",\"kind\":\"object\",\"name\":\"singleParticipantAssignments\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"assignment\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"name\"]}]},\"SingleParticipant\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToSingleParticipant\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SingleParticipantToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"applied\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"school\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"motivation\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"experience\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"assignmentDetails\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"CustomConferenceRole\",\"kind\":\"object\",\"name\":\"assignedRole\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"assignment\",\"relationFromFields\":[\"assignedRoleId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"assignedRoleId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"CustomConferenceRole\",\"kind\":\"object\",\"name\":\"appliedForRoles\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CustomConferenceRoleToSingleParticipant\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"ConferenceSupervisor\",\"kind\":\"object\",\"name\":\"supervisors\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToSingleParticipant\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"userId\"]}]},\"Delegation\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"school\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"motivation\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"experience\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"applied\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"entryCode\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToDelegation\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DelegationMember\",\"kind\":\"object\",\"name\":\"members\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToDelegationMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"RoleApplication\",\"kind\":\"object\",\"name\":\"appliedForRoles\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToRoleApplication\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Nation\",\"kind\":\"object\",\"name\":\"assignedNation\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToNation\",\"relationFromFields\":[\"assignedNationAlpha3Code\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"assignedNationAlpha3Code\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"NonStateActor\",\"kind\":\"object\",\"name\":\"assignedNonStateActor\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToNonStateActor\",\"relationFromFields\":[\"assignedNonStateActorId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"assignedNonStateActorId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true},{\"type\":\"Paper\",\"kind\":\"object\",\"name\":\"papers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToPaper\",\"relationFromFields\":[],\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"entryCode\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"assignedNationAlpha3Code\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"assignedNonStateActorId\"]}]},\"RoleApplication\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"delegation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToRoleApplication\",\"relationFromFields\":[\"delegationId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"delegationId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"rank\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Nation\",\"kind\":\"object\",\"name\":\"nation\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"NationToRoleApplication\",\"relationFromFields\":[\"nationId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"nationId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"NonStateActor\",\"kind\":\"object\",\"name\":\"nonStateActor\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"NonStateActorToRoleApplication\",\"relationFromFields\":[\"nonStateActorId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"nonStateActorId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"delegationId\",\"nationId\"]},{\"name\":null,\"fields\":[\"delegationId\",\"nonStateActorId\"]},{\"name\":null,\"fields\":[\"delegationId\",\"rank\"]}]},\"DelegationMember\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToDelegationMember\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Delegation\",\"kind\":\"object\",\"name\":\"delegation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationToDelegationMember\",\"relationFromFields\":[\"delegationId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"delegationId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"DelegationMemberToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"isHeadDelegate\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Committee\",\"kind\":\"object\",\"name\":\"assignedCommittee\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"CommitteeToDelegationMember\",\"relationFromFields\":[\"assignedCommitteeId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"assignedCommitteeId\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"ConferenceSupervisor\",\"kind\":\"object\",\"name\":\"supervisors\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToDelegationMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"delegationId\",\"userId\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"userId\"]}]},\"ConferenceSupervisor\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"plansOwnAttendenceAtConference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToConferenceSupervisor\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DelegationMember\",\"kind\":\"object\",\"name\":\"supervisedDelegationMembers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToDelegationMember\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"SingleParticipant\",\"kind\":\"object\",\"name\":\"supervisedSingleParticipants\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceSupervisorToSingleParticipant\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"connectionCode\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"connectionCode\"]},{\"name\":null,\"fields\":[\"conferenceId\",\"userId\"]}]},\"SurveyQuestion\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToSurveyQuestion\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"title\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"description\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"SurveyOption\",\"kind\":\"object\",\"name\":\"options\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyOptionToSurveyQuestion\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"draft\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"deadline\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"SurveyAnswer\",\"kind\":\"object\",\"name\":\"surveyAnswers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToSurveyQuestion\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"title\"]}]},\"SurveyOption\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"SurveyQuestion\",\"kind\":\"object\",\"name\":\"question\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyOptionToSurveyQuestion\",\"relationFromFields\":[\"questionId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"questionId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"title\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"description\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Int\",\"kind\":\"scalar\",\"name\":\"upperLimit\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"SurveyAnswer\",\"kind\":\"object\",\"name\":\"surveyAnswers\",\"isRequired\":true,\"isList\":true,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToSurveyOption\",\"relationFromFields\":[],\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"questionId\",\"title\"]}]},\"SurveyAnswer\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"SurveyQuestion\",\"kind\":\"object\",\"name\":\"question\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToSurveyQuestion\",\"relationFromFields\":[\"questionId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"questionId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"SurveyOption\",\"kind\":\"object\",\"name\":\"option\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"SurveyAnswerToSurveyOption\",\"relationFromFields\":[\"optionId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"optionId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"questionId\",\"userId\"]}]},\"WaitingListEntry\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToWaitingListEntry\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"UserToWaitingListEntry\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"school\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"experience\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"motivation\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"requests\",\"isRequired\":false,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"hidden\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"Boolean\",\"kind\":\"scalar\",\"name\":\"assigned\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"userId\"]}]},\"TeamMember\":{\"fields\":[{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"id\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":true,\"isUpdatedAt\":false},{\"type\":\"Conference\",\"kind\":\"object\",\"name\":\"conference\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"ConferenceToTeamMember\",\"relationFromFields\":[\"conferenceId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"conferenceId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"User\",\"kind\":\"object\",\"name\":\"user\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"relationName\":\"TeamMemberToUser\",\"relationFromFields\":[\"userId\"],\"isUpdatedAt\":false},{\"type\":\"String\",\"kind\":\"scalar\",\"name\":\"userId\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":false,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"TeamRole\",\"kind\":\"enum\",\"name\":\"role\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"createdAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":false},{\"type\":\"DateTime\",\"kind\":\"scalar\",\"name\":\"updatedAt\",\"isRequired\":true,\"isList\":false,\"hasDefaultValue\":true,\"isUnique\":false,\"isId\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"conferenceId\",\"userId\"]}]}}}}"); }