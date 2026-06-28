import type { PdfFieldMapping } from "@/lib/pdf/mappings";

const whenCurrentlyInUs = {
  questionKey: "beneficiary_currently_in_us",
  equals: true,
} as const;

const whenRelated = {
  questionKey: "familial_relationship",
  equals: true,
} as const;

const whenMetInPerson = {
  questionKey: "met_in_person",
  equals: true,
} as const;

const whenMeetingWaiverNeeded = {
  questionKey: "met_in_person",
  equals: false,
} as const;

export const i129fQuestionnaireMappings = [
  {
    id: "petitioner-other-names-part-8",
    type: "part8",
    questionKey: "petitioner_other_names",
    targetFields: {
      page: "Line3a_PageNumber",
      part: "Line3b_PartNumber",
      item: "Line3c_ItemNumber",
      value: "Line3d_AdditionalInfo",
    },
    reference: { page: "1", part: "1", item: "7" },
  },
  {
    id: "petitioner-citizenship-basis",
    type: "choice",
    questionKey: "petitioner_citizenship_basis",
    required: true,
    targetField: "Pt1Line40_Checkbox",
    values: { birth_us: "A", naturalization: "B" },
  },
  {
    id: "beneficiary-us-presence",
    type: "choice",
    questionKey: "beneficiary_currently_in_us",
    required: true,
    targetField: "Pt2Line37_Checkboxes",
    values: { true: "Y" },
  },
  {
    id: "beneficiary-passport-number",
    type: "direct",
    questionKey: "beneficiary_passport_number",
    requiredWhen: whenCurrentlyInUs,
    targetField: "Pt2Line38e_Passport",
  },
  {
    id: "beneficiary-passport-expiration",
    type: "date",
    questionKey: "beneficiary_passport_expiration",
    requiredWhen: whenCurrentlyInUs,
    targetField: "Pt2Line38h_ExpDate",
  },
  {
    id: "familial-relationship",
    type: "choice",
    questionKey: "familial_relationship",
    required: true,
    targetField: "Pt2Line51_Checkboxes",
    values: { true: "Y", false: "N" },
  },
  {
    id: "familial-relationship-details",
    type: "direct",
    questionKey: "familial_relationship_details",
    requiredWhen: whenRelated,
    targetField: "Pt2Line52_Relationship",
  },
  {
    id: "in-person-meeting",
    type: "choice",
    questionKey: "met_in_person",
    required: true,
    targetField: "Pt2Line53_Checkboxes",
    values: { true: "Y", false: "N" },
  },
  {
    id: "meeting-narrative",
    type: "compose",
    targetField: "Pt2Line54_Describe",
    inputs: [
      {
        questionKey: "most_recent_meeting_date",
        label: "Most recent in-person meeting date",
        transform: "date",
        requiredWhen: whenMetInPerson,
      },
      {
        questionKey: "in_person_meeting_details",
        label: "In-person meeting details",
        requiredWhen: whenMetInPerson,
      },
      {
        questionKey: "meeting_waiver_explanation",
        label: "Meeting waiver explanation",
        requiredWhen: whenMeetingWaiverNeeded,
      },
      {
        questionKey: "relationship_history",
        label: "Relationship history",
        required: true,
      },
    ],
  },
] as const satisfies readonly PdfFieldMapping[];
