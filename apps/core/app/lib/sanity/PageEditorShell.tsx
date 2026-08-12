"use client";

import { Card, Flex, Stack, Text } from "@sanity/ui";
import type { InputProps, PreviewProps } from "sanity";

export function PageEditorShell(props: InputProps) {
  if (props.id !== "root" || props.schemaType.name !== "page") {
    return props.renderDefault(props);
  }

  return (
    <Stack space={4}>
      <Card padding={4} radius={3} tone="primary">
        <Flex align="center" gap={3} justify="space-between" wrap="wrap">
          <Stack space={2}>
            <Text size={1} weight="semibold">
              DANCE ENGINE WEBSITE
            </Text>
            <Text size={3} weight="bold">
              Page editor
            </Text>
            <Text muted size={1}>
              Edit page settings and arrange reusable sections below. Changes
              are saved automatically as a Sanity draft.
            </Text>
          </Stack>
        </Flex>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  );
}

export function SectionPreview(props: PreviewProps) {
  return (
    <Card border padding={3} radius={2} tone="transparent">
      <Stack space={2}>
        <Text size={1} weight="semibold">
          PAGE SECTION
        </Text>
        {props.renderDefault(props)}
      </Stack>
    </Card>
  );
}
