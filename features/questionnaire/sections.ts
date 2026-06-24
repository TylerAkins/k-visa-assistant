export const questionnaireSectionIds = [
  "petitioner",
  "beneficiary",
  "relationship",
  "children",
] as const;

export type QuestionnaireSectionId = (typeof questionnaireSectionIds)[number];

export type QuestionnaireSectionMetadata = {
  id: QuestionnaireSectionId;
  title: string;
  description: string;
  sortOrder: number;
  progressAttachment: "petitioner" | "beneficiary" | "relationship" | "children";
  reviewAttachment: "questionnaire_case_state";
};

const questionnaireSectionRegistry = [
  {
    id: "petitioner",
    title: "Petitioner",
    description: "U.S. citizen petitioner information for the case.",
    sortOrder: 10,
    progressAttachment: "petitioner",
    reviewAttachment: "questionnaire_case_state",
  },
  {
    id: "beneficiary",
    title: "Beneficiary",
    description: "Foreign fiance beneficiary information for the case.",
    sortOrder: 20,
    progressAttachment: "beneficiary",
    reviewAttachment: "questionnaire_case_state",
  },
  {
    id: "relationship",
    title: "Relationship",
    description: "Relationship history and eligibility details.",
    sortOrder: 30,
    progressAttachment: "relationship",
    reviewAttachment: "questionnaire_case_state",
  },
  {
    id: "children",
    title: "Children",
    description: "K-2 child information and related review state.",
    sortOrder: 40,
    progressAttachment: "children",
    reviewAttachment: "questionnaire_case_state",
  },
] as const satisfies readonly QuestionnaireSectionMetadata[];

const questionnaireSectionsById = new Map<QuestionnaireSectionId, QuestionnaireSectionMetadata>(
  questionnaireSectionRegistry.map((section) => [section.id, section]),
);

export function listQuestionnaireSectionMetadata(): QuestionnaireSectionMetadata[] {
  return questionnaireSectionRegistry.map((section) => ({ ...section }));
}

export function isQuestionnaireSectionId(
  value: string,
): value is QuestionnaireSectionId {
  return questionnaireSectionsById.has(value as QuestionnaireSectionId);
}

export function getQuestionnaireSectionMetadata(
  id: QuestionnaireSectionId,
): QuestionnaireSectionMetadata;
export function getQuestionnaireSectionMetadata(
  id: string,
): QuestionnaireSectionMetadata | null;
export function getQuestionnaireSectionMetadata(
  id: string,
): QuestionnaireSectionMetadata | null {
  return questionnaireSectionsById.get(id as QuestionnaireSectionId) ?? null;
}

export function getQuestionnaireSectionSortOrder(id: QuestionnaireSectionId) {
  return getKnownQuestionnaireSectionMetadata(id).sortOrder;
}

export function findUnknownQuestionnaireSectionIds(
  ids: readonly string[],
): string[] {
  return ids.filter((id) => !isQuestionnaireSectionId(id));
}

export function findMissingQuestionnaireSectionIds(
  ids: readonly string[],
): QuestionnaireSectionId[] {
  const presentIds = new Set(ids);

  return questionnaireSectionIds.filter((id) => !presentIds.has(id));
}

export function assertKnownQuestionnaireSectionIds(ids: readonly string[]) {
  const unknownIds = findUnknownQuestionnaireSectionIds(ids);

  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown questionnaire section identifier(s): ${unknownIds.join(", ")}.`,
    );
  }
}

export function assertCompleteQuestionnaireSectionIds(ids: readonly string[]) {
  assertKnownQuestionnaireSectionIds(ids);

  const missingIds = findMissingQuestionnaireSectionIds(ids);
  if (missingIds.length > 0) {
    throw new Error(
      `Missing questionnaire section identifier(s): ${missingIds.join(", ")}.`,
    );
  }
}

function getKnownQuestionnaireSectionMetadata(
  id: QuestionnaireSectionId,
): QuestionnaireSectionMetadata {
  const metadata = questionnaireSectionsById.get(id);

  if (!metadata) {
    throw new Error(`Unknown questionnaire section identifier: ${id}.`);
  }

  return metadata;
}
