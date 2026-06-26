"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { TimelineAttachmentItem } from "@/app/_lib/indexer";
import {
  ATTACHMENT_MAX_FILE_BYTES,
  createContextAttachment,
  isAttachmentMutationInputError,
  type AttachmentDraft,
} from "../../shared/contextAttachmentMutations";
import { formatFileSize } from "./fileUtils";
import type { EvidenceSubmitter, TimelineMutationPermission } from "./types";

type UseEvidenceSubmissionArgs = {
  activityUri: string;
  activityCid: string;
  organizationDid: string;
  createPermission: TimelineMutationPermission;
  mutationRepo?: string;
  onCreated: (entry: TimelineAttachmentItem) => void;
  onChanged: () => void;
};

export function useEvidenceSubmission({
  activityUri,
  activityCid,
  organizationDid,
  createPermission,
  mutationRepo,
  onCreated,
  onChanged,
}: UseEvidenceSubmissionArgs): {
  error: string | null;
  isSubmitting: boolean;
  submitDrafts: EvidenceSubmitter;
} {
  const evidenceT = useTranslations("bumicert.detail.evidenceAdder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mutationErrorMessage(submissionError: unknown): string {
    if (!isAttachmentMutationInputError(submissionError)) {
      console.error("Unable to link timeline evidence", submissionError);
      return evidenceT("linkError");
    }

    switch (submissionError.code) {
      case "file-too-large":
        return evidenceT("validation.fileTooLarge", {
          maxSize: formatFileSize(ATTACHMENT_MAX_FILE_BYTES),
        });
      case "file-type-not-allowed":
        return evidenceT("validation.fileTypeNotAllowed");
      case "invalid-link":
        return evidenceT("invalidUrl");
      case "too-many-items":
        return evidenceT("validation.tooManyItems");
      case "invalid-activity":
        return evidenceT("incompleteBumicertReference");
      case "invalid-context":
        return evidenceT("validation.invalidContext");
      default:
        return evidenceT("linkError");
    }
  }

  async function submitDrafts(
    drafts: AttachmentDraft | AttachmentDraft[],
    onSuccess?: () => void,
  ) {
    const items = (Array.isArray(drafts) ? drafts : [drafts]).filter(
      (draft) => draft.contents.length > 0,
    );
    if (items.length === 0) return;

    if (!createPermission.allowed) {
      setError(createPermission.reason ?? evidenceT("permissions.createDenied"));
      return;
    }

    if (!activityCid) {
      setError(evidenceT("incompleteBumicertReference"));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const created: TimelineAttachmentItem[] = [];
    const activitySubject = { uri: activityUri, cid: activityCid };

    try {
      for (const draft of items) {
        const result = await createContextAttachment({
          draft,
          activitySubject,
          organizationDid,
          repo: mutationRepo,
        });
        created.push(result.optimisticItem);
        onCreated(result.optimisticItem);
      }
      if (created.length > 0) onChanged();
      onSuccess?.();
    } catch (err) {
      const message = mutationErrorMessage(err);
      if (created.length > 0) {
        setError(
          evidenceT("partialLinkSuccess", {
            createdCount: created.length,
            totalCount: items.length,
            error: message,
          }),
        );
        onChanged();
        onSuccess?.();
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, submitDrafts };
}
