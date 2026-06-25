export type SiteNavLink =
  | { label: string; to: string }
  | { label: string; href: string };

export type SiteNavSection = {
  title: string;
  links: readonly SiteNavLink[];
  /** Shown collapsed in the mobile hamburger to keep the menu short. */
  mobileCollapsed?: boolean;
};

/** Shared footer + mobile navigation structure. */
export const SITE_NAV_SECTIONS: readonly SiteNavSection[] = [
  {
    title: "About",
    links: [{ label: "About AAA", to: "/about" }],
  },
  {
    title: "Platform",
    links: [
      { label: "Directory", to: "/directory" },
      { label: "Claim Profile", to: "/claim" },
      { label: "Register", to: "/register" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Events", to: "/events" },
      { label: "Stories", to: "/stories" },
    ],
  },
  {
    title: "Listen & Watch",
    mobileCollapsed: true,
    links: [
      {
        label: "YouTube",
        href: "https://www.youtube.com/@ajeetalumniassociation",
      },
      {
        label: "The AEiF Podcast",
        href: "https://open.spotify.com/show/5MxQBL9UwP4IHcwcun3FZ3",
      },
      {
        label: "The AKF Podcast",
        href: "https://open.spotify.com/show/1XPNpzdwDUJf0KICAlGkOE",
      },
    ],
  },
  {
    title: "Legal",
    mobileCollapsed: true,
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Use", to: "/terms" },
      { label: "Directory Usage Policy", to: "/directory-usage" },
      { label: "Disclaimer", to: "/disclaimer" },
    ],
  },
];

/** Flat in-menu links (everything except collapsible footer groups). */
export const MOBILE_SITE_LINKS: SiteNavLink[] = SITE_NAV_SECTIONS.filter(
  (section) => !section.mobileCollapsed
).flatMap((section) => section.links);

export const MOBILE_COLLAPSED_SECTIONS = SITE_NAV_SECTIONS.filter(
  (section) => section.mobileCollapsed
);
