import type { Theme } from "../types";
import Header from "./Header";
import HeroSection from "./HeroSection";
import SocialMediaSection from "./SocialMediaSection";

const modernEdge = {
  name: "modern-edge",
  Header,
  sections: {
    heroSection: HeroSection,
    socialMediaSection: SocialMediaSection,
  },
} satisfies Theme;

export default modernEdge;
