import type { ResolvedTheme } from "../types";
import CallToActionSection from "./CallToActionSection";
import EventListSection from "./EventListSection";
import FaqSection from "./FaqSection";
import Header from "./Header";
import HeroSection from "./HeroSection";
import ImageSection from "./ImageSection";
import ImageTextSection from "./ImageTextSection";
import MenuJumpSection from "./MenuJumpSection";
import MenuSection from "./MenuSection";
import PageShell from "./PageShell";
import RichTextSection from "./RichTextSection";
import SectionGrid from "./SectionGrid";
import SocialMediaSection from "./SocialMediaSection";
import TestimonialsSection from "./TestimonialsSection";
import ThreeColumnCalloutSection from "./ThreeColumnCalloutSection";

// The default theme must render every section type: ResolvedTheme makes a missing one a type error.
const defaultTheme: ResolvedTheme = {
  name: "default",
  Header,
  PageShell,
  sections: {
    heroSection: HeroSection,
    richTextSection: RichTextSection,
    imageTextSection: ImageTextSection,
    imageSection: ImageSection,
    callToActionSection: CallToActionSection,
    threeColumnCalloutSection: ThreeColumnCalloutSection,
    socialMediaSection: SocialMediaSection,
    testimonialsSection: TestimonialsSection,
    sectionGrid: SectionGrid,
    menuSection: MenuSection,
    menuJumpSection: MenuJumpSection,
    faqSection: FaqSection,
    eventListSection: EventListSection,
  },
};

export default defaultTheme;
