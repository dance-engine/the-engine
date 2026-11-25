"use client";

import { Select } from "@sanity/ui";
import { set, unset, useFormValue, type StringInputProps } from "sanity";

type SectionValue = { _key?: string; _type?: string; title?: string; anchor?: { current?: string } };

// Picks one of the menu jumps on the page being edited, stored as its anchor (e.g. "about-us").
export function MenuJumpSelectInput(props: StringInputProps) {
  const { value, onChange, readOnly, elementProps } = props;
  const sections = (useFormValue(["sections"]) as SectionValue[] | undefined) || [];
  const jumps = sections.filter(
    (section): section is SectionValue & { anchor: { current: string } } =>
      section?._type === "menuJumpSection" && Boolean(section.anchor?.current),
  );
  const isMissing = Boolean(value) && !jumps.some((jump) => jump.anchor.current === value);

  return (
    <Select
      id={elementProps.id}
      onBlur={elementProps.onBlur}
      onFocus={elementProps.onFocus}
      disabled={readOnly}
      value={value || ""}
      onChange={(event) => {
        const next = event.currentTarget.value;
        onChange(next ? set(next) : unset());
      }}
    >
      <option value="">{jumps.length > 0 ? "Choose a menu jump…" : "Add a menu jump to this page first"}</option>
      {jumps.map((jump) => (
        <option key={jump._key} value={jump.anchor.current}>
          {jump.title || "Untitled"} (#{jump.anchor.current})
        </option>
      ))}
      {isMissing && <option value={value}>#{value} (no longer on this page)</option>}
    </Select>
  );
}
