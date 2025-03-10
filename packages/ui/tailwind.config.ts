import type { Config } from "tailwindcss";
import sharedConfig from "@dance-engine/tailwind-config";

const config: Pick<Config, "prefix" | "presets" | "content" | "plugins"> = {
  content: ["./src/**/*.tsx"],
  prefix: "ui-",
  presets: [sharedConfig],
};

export default config;
