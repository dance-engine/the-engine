"use client";

import { useEffect } from "react";

type RedirectProps = {
  url: string;
};

export default function Redirect({ url }: RedirectProps) {
  useEffect(() => {
    if (!url) return;
    window.location.assign(url);
  }, [url]);

  return null;
}
