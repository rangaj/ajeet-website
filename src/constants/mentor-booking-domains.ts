/** Supported external booking platforms for paid mentorship links. */
export const MENTOR_BOOKING_DOMAIN_LABELS: Record<string, string> = {
  "topmate.io": "Topmate",
  "cal.com": "Cal.com",
  "calendly.com": "Calendly",
  "mentorcruise.com": "MentorCruise",
  "superpeer.com": "Superpeer",
  "intro.co": "Intro",
  "adplist.org": "ADPList",
  "linkedin.com": "LinkedIn",
};

export const MENTOR_BOOKING_SUPPORTED_HOSTS = Object.keys(MENTOR_BOOKING_DOMAIN_LABELS);

export const MENTOR_BOOKING_UNSUPPORTED_MESSAGE =
  "Use a link from a supported booking platform (e.g. Topmate, Cal.com, Calendly) or email admin@ajeets.org to request one.";
