export type AuthStep =
  | "sign-up"
  | "permissions"
  | "set-up"
  | "learn"
  | "personalize";

export interface StepMediaConfig {
  kind: "placeholder" | "video";
  kicker: string;
  title: string;
  subtitle: string;
  badges: string[];
  theme: "voice" | "permissions" | "setup" | "learn" | "personalize";
  videoSrc?: string;
  posterSrc?: string;
}

export interface AuthStepContent {
  id: AuthStep;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  media: StepMediaConfig;
}

export const AUTH_STEP_ORDER: AuthStep[] = [
  "sign-up",
  "permissions",
  "set-up",
  "learn",
  "personalize",
];

export const AUTH_STEPS: AuthStepContent[] = [
  {
    id: "sign-up",
    navLabel: "Sign Up",
    eyebrow: "Sign up",
    title: "Get started with a cleaner desktop flow.",
    description:
      "Create your account in the browser, come back here, then unlock Vocalype without fighting a cramped login screen.",
    highlights: [
      "Web-first auth",
      "14-day premium trial",
      "Works across Windows apps",
    ],
    media: {
      kind: "placeholder",
      kicker: "Voice everywhere",
      title: "Write faster in every app.",
      subtitle:
        "Premium dictation for ChatGPT, Claude, Gemini, docs, messages, and anything else on your desktop.",
      badges: ["ChatGPT", "Claude", "Gemini", "Windows"],
      theme: "voice",
    },
  },
  {
    id: "permissions",
    navLabel: "Permissions",
    eyebrow: "Permissions",
    title: "Enable the parts that make the app feel instant.",
    description:
      "We surface the permissions early so setup feels guided, calm, and premium instead of technical.",
    highlights: ["Microphone", "Accessibility", "Global shortcut"],
    media: {
      kind: "placeholder",
      kicker: "Ready state",
      title: "Permissions without the panic.",
      subtitle:
        "Clear status, clean feedback, and one place to understand what Vocalype needs before it can work everywhere.",
      badges: ["Microphone", "Accessibility", "Shortcut"],
      theme: "permissions",
    },
  },
  {
    id: "set-up",
    navLabel: "Set Up",
    eyebrow: "Set up",
    title: "Confirm the desktop is ready before you start talking.",
    description:
      "This step reassures users that shortcuts, capture, and premium access are wired correctly before they land in the app.",
    highlights: ["Shortcut ready", "Access checked", "Desktop connected"],
    media: {
      kind: "placeholder",
      kicker: "System check",
      title: "Everything synced before first use.",
      subtitle:
        "A premium first run should feel calm and intentional, with zero guesswork about whether the app is ready.",
      badges: ["Ready", "Synced", "Verified"],
      theme: "setup",
    },
  },
  {
    id: "learn",
    navLabel: "Learn",
    eyebrow: "Learn",
    title: "Show the payoff immediately with a live-looking example.",
    description:
      "Instead of another wall of copy, this step demonstrates how fast spoken intent becomes polished text inside real workflows.",
    highlights: ["Real examples", "Fast cleanup", "Natural output"],
    media: {
      kind: "placeholder",
      kicker: "Guided preview",
      title: "From spoken thought to clean text.",
      subtitle:
        "Use a product-style mock instead of empty media so the right panel already feels alive before real videos ship.",
      badges: ["Draft", "Rewrite", "Send"],
      theme: "learn",
    },
  },
  {
    id: "personalize",
    navLabel: "Personalize",
    eyebrow: "Personalize",
    title: "End the flow by making Vocalype feel tuned to the user.",
    description:
      "A few small preferences make the product feel tailored from the first minute without slowing anyone down.",
    highlights: ["Language", "Output style", "Preferred pace"],
    media: {
      kind: "placeholder",
      kicker: "Your defaults",
      title: "A setup that already feels personal.",
      subtitle:
        "Language, style, and cleanup presets should feel like finishing touches, not another boring settings screen.",
      badges: ["French", "Clean output", "Balanced"],
      theme: "personalize",
    },
  },
];
