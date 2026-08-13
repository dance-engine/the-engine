"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveToolLayoutProps } from "sanity";
import { useRouterState } from "sanity/router";

type MobileView = "preview" | "edit";

export function MobilePresentationLayout(props: ActiveToolLayoutProps) {
  const [view, setView] = useState<MobileView>("preview");
  const selectedFieldPath = useRouterState((state) =>
    typeof state.path === "string" ? state.path : "",
  );
  const previousFieldPathRef = useRef(selectedFieldPath);

  useEffect(() => {
    if (
      props.activeTool.name === "presentation" &&
      selectedFieldPath &&
      selectedFieldPath !== previousFieldPathRef.current
    ) {
      setView("edit");
    }

    previousFieldPathRef.current = selectedFieldPath;
  }, [props.activeTool.name, selectedFieldPath]);

  if (props.activeTool.name !== "presentation") {
    return props.renderDefault(props);
  }

  return (
    <div className="mobile-presentation-layout" data-mobile-view={view}>
      <div className="mobile-presentation-switcher" role="group" aria-label="Presentation view">
        <button type="button" aria-pressed={view === "edit"} onClick={() => setView("edit")}>
          Edit
        </button>
        <button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>
          Preview
        </button>
      </div>
      <div className="mobile-presentation-content">{props.renderDefault(props)}</div>
    </div>
  );
}
