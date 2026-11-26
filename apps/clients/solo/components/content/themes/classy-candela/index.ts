import type { Theme } from "../types";
import CallToActionSection from "./CallToActionSection";
import EventListSection from "./EventListSection";
import FaqSection from "./FaqSection";
import Header from "./Header";
import HeroSection from "./HeroSection";
import ImageTextSection from "./ImageTextSection";
import MenuJumpSection from "./MenuJumpSection";
import PageShell from "./PageShell";
import SectionGrid from "./SectionGrid";
import SidebarSection from "./SidebarSection";
import TestimonialsSection from "./TestimonialsSection";
import ThreeColumnCalloutSection from "./ThreeColumnCalloutSection";

// classy-candela: an evening-salon look for socials and soirées. Espresso and cream, wine bands, thin gold
// rules and a serif (Cormorant Garamond) for headings. Colour roles are described in ./styles.ts.
//
// Sections not listed here (rich text, image, social media, menu) use the default theme's components,
// which pick up the cream page, serif headings and gold lines from PageShell.
const classyCandela = {
  name: "classy-candela",
  Header,
  PageShell,
  sections: {
    heroSection: HeroSection,
    imageTextSection: ImageTextSection,
    testimonialsSection: TestimonialsSection,
    callToActionSection: CallToActionSection,
    faqSection: FaqSection,
    sectionGrid: SectionGrid,
    sidebarSection: SidebarSection,
    threeColumnCalloutSection: ThreeColumnCalloutSection,
    eventListSection: EventListSection,
    menuJumpSection: MenuJumpSection,
  },
} satisfies Theme;

export default classyCandela;
