"use client";

import { Stack, Text, useToast } from "@sanity/ui";
import { useState } from "react";
import type {
  DocumentActionComponent,
  DocumentActionDescription,
  DocumentActionProps,
  DocumentActionsContext,
  SanityDocument,
} from "sanity";

type LinkedDocumentDraft = {
  _id: string;
  _type: "socialProfile" | "testimonial";
  name?: string;
  label?: string;
  platform?: string;
};

type PageDocument = SanityDocument & {
  sections?: Array<{
    _type?: string;
    profiles?: Array<{ _ref?: string }>;
    testimonials?: Array<{ _ref?: string }>;
  }>;
};

function linkedDocumentIds(document: PageDocument | null): string[] {
  if (!document?.sections) return [];

  return Array.from(new Set(
    document.sections
      .flatMap((section) => [
        ...(section._type === "socialMediaSection" ? section.profiles ?? [] : []),
        ...(section._type === "testimonialsSection" ? section.testimonials ?? [] : []),
      ])
      .map((reference) => reference._ref?.replace(/^drafts\./, ""))
      .filter((id): id is string => Boolean(id)),
  ));
}

function documentName(document: LinkedDocumentDraft): string {
  return document.name || document.label || document.platform || "Untitled linked content";
}

export function createPublishWithLinkedProfilesAction(
  originalPublishAction: DocumentActionComponent,
  context: DocumentActionsContext,
): DocumentActionComponent {
  const client = context.getClient({ apiVersion: "2026-08-01" });

  function PublishWithLinkedProfilesAction(
    props: DocumentActionProps,
  ): DocumentActionDescription | null {
    const original = originalPublishAction(props);
    const toast = useToast();
    const [linkedDrafts, setLinkedDrafts] = useState<LinkedDocumentDraft[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const documentIds = linkedDocumentIds((props.draft ?? props.published) as PageDocument | null);

    if (!original || documentIds.length === 0) return null;

    const publishPage = () => {
      setDialogOpen(false);
      original.onHandle?.();
    };

    const findLinkedDrafts = async () => {
      setBusy(true);

      try {
        const drafts = await client.fetch<LinkedDocumentDraft[]>(
          `*[_id in $draftIds]{_id, _type, name, label, platform}`,
          { draftIds: documentIds.map((id) => `drafts.${id}`) },
        );

        if (drafts.length === 0) {
          publishPage();
          return;
        }

        setLinkedDrafts(drafts);
        setDialogOpen(true);
      } catch (error) {
        toast.push({
          status: "error",
          title: "Could not check linked content",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setBusy(false);
      }
    };

    const publishLinkedContentAndPage = async () => {
      setDialogOpen(false);
      setBusy(true);

      try {
        for (const document of linkedDrafts) {
          const publishedId = document._id.replace(/^drafts\./, "");
          await client.action({
            actionType: "sanity.action.document.publish",
            draftId: document._id,
            publishedId,
          });
        }

        toast.push({
          status: "success",
          title: `Published ${linkedDrafts.length} linked ${linkedDrafts.length === 1 ? "item" : "items"}`,
        });
        publishPage();
      } catch (error) {
        toast.push({
          status: "error",
          title: "Could not publish the linked content",
          description: error instanceof Error ? error.message : "The page has not been published.",
        });
      } finally {
        setBusy(false);
      }
    };

    return {
      ...original,
      label: busy ? "Publishing linked content…" : "Publish with linked content",
      disabled: Boolean(original.disabled) || busy,
      onHandle: findLinkedDrafts,
      dialog: dialogOpen
        ? {
            type: "confirm",
            tone: "primary",
            confirmButtonText: `Publish ${linkedDrafts.length} ${linkedDrafts.length === 1 ? "item" : "items"} and page`,
            cancelButtonText: "Cancel",
            onCancel: () => setDialogOpen(false),
            onConfirm: publishLinkedContentAndPage,
            message: (
              <Stack space={4}>
                <Text>
                  This page uses linked content with unpublished changes. Publishing it will update every page or footer that uses it.
                </Text>
                <Stack as="ul" space={2}>
                  {linkedDrafts.map((document) => (
                    <Text as="li" key={document._id}>
                      {documentName(document)}
                    </Text>
                  ))}
                </Stack>
              </Stack>
            ),
          }
        : false,
    };
  }

  PublishWithLinkedProfilesAction.displayName = "PublishWithLinkedProfilesAction";
  return PublishWithLinkedProfilesAction;
}
