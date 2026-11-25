import type { Theme } from "../types";
import CallToActionSection from "./CallToActionSection";
import EventListSection from "./EventListSection";
import FaqSection from "./FaqSection";
import Header from "./Header";
import HeroSection from "./HeroSection";
import SocialMediaSection from "./SocialMediaSection";
import ThreeColumnCalloutSection from "./ThreeColumnCalloutSection";

const modernEdge = {
  name: "modern-edge",
  Header,
  sections: {
    heroSection: HeroSection,
    socialMediaSection: SocialMediaSection,
    callToActionSection: CallToActionSection,
    threeColumnCalloutSection: ThreeColumnCalloutSection,
    faqSection: FaqSection,
    eventListSection: EventListSection,
  },
} satisfies Theme;

export default modernEdge;
