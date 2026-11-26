"use client";

import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

type Lang = "az" | "en";
type SupportPref = "whatsapp" | "telegram" | "instagram" | "email";
type AvatarId = "heart" | "mic" | "bolt" | "star" | "custom";
type LeadSourceId = "whatsapp" | "instagram" | "facebook" | "tiktok" | "other";

const INDUSTRIES: Record<Lang, readonly string[]> = {
  en: [
    "Digital & IT services",
    "Retail & ecommerce",
    "Health & wellness",
    "Government",
    "Manufacturing",
    "Nonprofit organizations",
    "Content creators",
    "Food services",
    "Telecommunications",
    "Legal & consulting",
    "Finance & insurance",
    "Tourism",
    "Real estate",
    "Automotive",
    "Education",
    "Transportation",
  ],
  az: [
    "Rəqəmsal və İT xidmətlər",
    "Pərakəndə və e-ticarət",
    "Sağlamlıq və gözəllik",
    "Dövlət qurumları",
    "İstehsalat",
    "Qeyri-kommersiya təşkilatları",
    "Kontent yaradıcıları",
    "Qida və restoran xidmətləri",
    "Telekommunikasiya",
    "Hüquq və konsaltinq",
    "Maliyyə və sığorta",
    "Turizm",
    "Daşınmaz əmlak",
    "Avtomobil",
    "Təhsil",
    "Nəqliyyat və logistika",
  ],
};

const BUSINESS_TYPES: Record<Lang, Record<number, readonly string[]>> = {
  en: {
    14: [
      "Fitness classes",
      "Art classes",
      "Music classes",
      "Professional development",
      "Language classes",
      "Academia",
    ],
    0: ["Software agency", "Marketing & SEO", "IT support & SaaS", "Web & mobile studio"],
    1: ["Online store", "Apparel & fashion", "Electronics", "Home & lifestyle"],
    2: ["Clinic & dental", "Beauty salon & spa", "Fitness & gym", "Psychology & coaching"],
  },
  az: {
    14: [
      "Fitnes dərsləri",
      "İncəsənət dərsləri",
      "Musiqi dərsləri",
      "Peşəkar inkişaf kursları",
      "Dil kursları",
      "Akademiya və hazırlıq mərkəzi",
    ],
    0: ["Proqram təminatı agentliyi", "Marketinq və SEO", "İT dəstək və SaaS", "Veb və mobil studiya"],
    1: ["Onlayn mağaza", "Geyim və moda", "Elektronika", "Ev və yaşam"],
    2: ["Klinika və stomatologiya", "Gözəllik salonu və SPA", "Fitnes zalı", "Psixologiya və kouçinq"],
  },
};

const DEFAULT_BUSINESS_TYPES: Record<Lang, readonly string[]> = {
  en: ["B2C services", "B2B services", "Agency / studio", "Local business", "Online business"],
  az: ["B2C xidmətlər", "B2B xidmətlər", "Agentlik / studiya", "Yerli biznes", "Onlayn biznes"],
};

const ROLES: Record<Lang, readonly string[]> = {
  en: [
    "Marketing analyst / assistant",
    "Sales analyst / assistant",
    "Marketing coordinator / supervisor",
    "Sales manager",
    "Sales coordinator / supervisor",
    "Intern / trainee",
    "Owner / founder / CEO",
    "Sales agent",
    "Project manager",
    "Marketing director",
    "Marketing agency partner",
    "Marketing manager",
    "Self-employed / freelancer",
    "Customer support specialist",
    "Influencer / content creator",
    "Sales director",
    "Account manager / executive",
    "IT specialist",
  ],
  az: [
    "Marketinq analitiki / köməkçi",
    "Satış analitiki / köməkçi",
    "Marketinq koordinatoru",
    "Satış meneceri",
    "Satış koordinatoru",
    "Təcrübəçi",
    "Sahib / təsisçi / CEO",
    "Satış əməkdaşı",
    "Layihə meneceri",
    "Marketinq direktoru",
    "Marketinq agentliyi tərəfdaşı",
    "Marketinq meneceri",
    "Fərdi sahibkar / frilanser",
    "Müştəri dəstək mütəxəssisi",
    "İnfluenser / kontent yaradıcısı",
    "Satış direktoru",
    "Müştəri meneceri",
    "İT mütəxəssisi",
  ],
};

const COPY = {
  en: {
    step1Title: "Let's make Panelim yours",
    avatarLabel: "Select your avatar",
    uploadAvatar: "Upload avatar",
    supportLabel: "Select your support preference",
    phoneLabel: "Phone number",
    phonePlaceholder: "50 123 45 67",
    step2Title: "Let's customize your workspace",
    step2Sub: "Select from the list, or enter your own option.",
    industryLabel: "Select industry",
    businessTypeLabel: "Your business type",
    roleLabel: "Select your role",
    step3Title: "What are your goals?",
    step3Sub: "Select up to 2 to personalize your onboarding.",
    goals: [
      "Manage leads from ad campaigns",
      "Send targeted messages to client groups",
      "Track deals and automate sales steps",
      "Schedule and manage appointments",
      "Reply to clients and follow up automatically",
    ],
    step4Title: "Where do your leads come from?",
    step4Sub: "Select lead sources to customize your workspace.",
    sources: {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      other: "Other sources",
    },
    step5Title: "How many team members will use Panelim?",
    step5Sub: "We can recommend tools and integrations based on your team's size.",
    sizes: ["Just me", "2–3", "4–5", "6–10", "11–20", "21–50", "51–100", "101+"],
    step6Title: "Tell us about your business",
    step6Sub: "This helps us personalize your Panelim experience.",
    companyLabel: "Your company name",
    companyPlaceholder: "e.g. Baku Studio LLC",
    websiteLabel: "Website or social media",
    websitePlaceholder: "e.g. panelim.az or @panelim",
    back: "Back",
    next: "Next",
    saving: "Setting up your workspace...",
    error: "Setup could not be saved. Try again.",
  },
  az: {
    step1Title: "Gəlin paneli sizə uyğunlaşdıraq",
    avatarLabel: "Avatarınızı seçin",
    uploadAvatar: "Şəkil yüklə",
    supportLabel: "Dəstək üstünlüyünüzü seçin",
    phoneLabel: "Telefon nömrəsi",
    phonePlaceholder: "50 123 45 67",
    step2Title: "İş sahənizi fərdiləşdirək",
    step2Sub: "Siyahıdan seçin və ya öz seçiminizi daxil edin.",
    industryLabel: "Sektor seçin",
    businessTypeLabel: "Biznes növünüz",
    roleLabel: "Rolunuzu seçin",
    step3Title: "Məqsədləriniz nələrdir?",
    step3Sub: "Quraşdırmanı fərdiləşdirmək üçün maksimum 2 seçim edin.",
    goals: [
      "Reklam kampaniyalarından müraciətləri idarə etmək",
      "Müştəri qruplarına hədəfli mesajlar göndərmək",
      "Satışları izləmək və mərhələləri avtomatlaşdırmaq",
      "Görüşləri və rezervasiyaları planlaşdırmaq",
      "Müştərilərə avtomatik cavab vermək və izləmək",
    ],
    step4Title: "Müraciətləriniz haradan gəlir?",
    step4Sub: "İş sahənizi uyğunlaşdırmaq üçün müraciət kanallarını seçin.",
    sources: {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      other: "Digər mənbələr",
    },
    step5Title: "Neçə əməkdaş Panelim istifadə edəcək?",
    step5Sub: "Komanda ölçüsünə uyğun alət və inteqrasiyalar tövsiyə edirik.",
    sizes: ["Yalnız mən", "2–3", "4–5", "6–10", "11–20", "21–50", "51–100", "101+"],
    step6Title: "Biznesiniz haqqında məlumat verin",
    step6Sub: "Bu, Panelim təcrübənizi fərdiləşdirməyə kömək edir.",
    companyLabel: "Şirkətinizin adı",
    companyPlaceholder: "Məsələn: Panelim Akademiya",
    websiteLabel: "Veb sayt və ya sosial media",
    websitePlaceholder: "Məsələn: panelim.az və ya @panelim",
    back: "Geri",
    next: "Növbəti",
    saving: "İş sahəniz hazırlanır...",
    error: "Quraşdırma saxlanmadı. Yenidən cəhd edin.",
  },
} as const;

const SUPPORT_OPTIONS: readonly { id: SupportPref; label: string; color: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { id: "telegram", label: "Telegram", color: "#229ED9" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "email", label: "Email", color: "#4C8BF7" },
];

const COUNTRY_CODES = [
  { code: "+994", flag: "AZ" },
  { code: "+90", flag: "TR" },
  { code: "+995", flag: "GE" },
  { code: "+1", flag: "US" },
] as const;

const SOURCE_ORDER: readonly LeadSourceId[] = ["whatsapp", "instagram", "facebook", "tiktok", "other"];

function PresetAvatarIcon({ id }: { id: Exclude<AvatarId, "custom"> }) {
  if (id === "heart") {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
        <defs>
          <linearGradient id="av-heart" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="55%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>
        </defs>
        <path
          d="M32 54C29 51.5 10 38.5 10 23.5C10 15.5 16.2 10 23.2 10C27.4 10 30.8 12.2 32 15.2C33.2 12.2 36.6 10 40.8 10C47.8 10 54 15.5 54 23.5C54 38.5 35 51.5 32 54Z"
          fill="url(#av-heart)"
          stroke="#4c8bf7"
          strokeWidth="2"
        />
        <ellipse cx="26.5" cy="24" rx="3.2" ry="4.4" fill="#0e0142" />
        <ellipse cx="37.5" cy="24" rx="3.2" ry="4.4" fill="#0e0142" />
        <circle cx="27.5" cy="22.8" r="1.2" fill="#fff" />
        <circle cx="38.5" cy="22.8" r="1.2" fill="#fff" />
        <path d="M26 32.5C28 35.5 36 35.5 38 32.5" fill="none" stroke="#0e0142" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "mic") {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
        <defs>
          <linearGradient id="av-mic" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
        </defs>
        <rect x="21" y="10" width="22" height="30" rx="11" fill="url(#av-mic)" stroke="#4c8bf7" strokeWidth="2" />
        <path d="M16 31C16 40 23 46 32 46C41 46 48 40 48 31" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 46V54M24 54H40" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="27.5" cy="23" rx="2.6" ry="3.8" fill="#0e0142" />
        <ellipse cx="36.5" cy="23" rx="2.6" ry="3.8" fill="#0e0142" />
        <circle cx="28.3" cy="22" r="1" fill="#fff" />
        <circle cx="37.3" cy="22" r="1" fill="#fff" />
        <path d="M28 31C30 33.2 34 33.2 36 31" fill="none" stroke="#0e0142" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "bolt") {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
        <defs>
          <linearGradient id="av-bolt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
        </defs>
        <path
          d="M36 8L16 35H30L26 56L48 27H34L36 8Z"
          fill="url(#av-bolt)"
          stroke="#e11d48"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <ellipse cx="29" cy="24" rx="2.6" ry="3.6" fill="#0e0142" />
        <ellipse cx="37" cy="24" rx="2.6" ry="3.6" fill="#0e0142" />
        <circle cx="29.8" cy="23" r="1" fill="#fff" />
        <circle cx="37.8" cy="23" r="1" fill="#fff" />
        <path d="M29.5 31.5C31.5 33.5 34.5 33.5 36.5 31.5" fill="none" stroke="#0e0142" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
      <defs>
        <linearGradient id="av-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="50%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
      </defs>
      <path
        d="M32 9L38.8 22.8L54 25L43 35.7L45.6 50.8L32 43.7L18.4 50.8L21 35.7L10 25L25.2 22.8L32 9Z"
        fill="url(#av-star)"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="27.5" cy="29" rx="2.6" ry="3.6" fill="#0e0142" />
      <ellipse cx="36.5" cy="29" rx="2.6" ry="3.6" fill="#0e0142" />
      <circle cx="28.3" cy="28" r="1" fill="#fff" />
      <circle cx="37.3" cy="28" r="1" fill="#fff" />
      <path d="M28.5 36.5C30.5 38.5 33.5 38.5 35.5 36.5" fill="none" stroke="#0e0142" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SourceBrandIcon({ id }: { id: LeadSourceId }) {
  if (id === "whatsapp") {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" />
        </svg>
      </span>
    );
  }
  if (id === "instagram") {
    return (
      <span
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-white"
        style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }
  if (id === "facebook") {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.6v3h2.6V21h3.3z" />
        </svg>
      </span>
    );
  }
  if (id === "tiktok") {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M16.6 5.8c1 .9 2.2 1.4 3.4 1.5v2.7c-1.3 0-2.5-.4-3.5-1.1v5.8a5.2 5.2 0 1 1-4.5-5.1v2.8a2.5 2.5 0 1 0 1.8 2.4V3h2.8v2.8z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#0e0142]" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
      </svg>
    </span>
  );
}

function SupportBadge({ pref }: { pref: SupportPref }) {
  const opt = SUPPORT_OPTIONS.find((item) => item.id === pref) ?? SUPPORT_OPTIONS[0];
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
      style={{ backgroundColor: opt.color }}
      aria-hidden="true"
    >
      {pref === "whatsapp" ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" />
        </svg>
      ) : pref === "telegram" ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M20.5 4.6 3.7 11.1c-1.1.5-1.1 1.1-.2 1.4l4.3 1.3 10-6.3c.5-.3.9-.1.6.2l-8.1 7.3-.3 4.4c.4 0 .6-.2.9-.4l2.1-2 4.3 3.2c.8.4 1.4.2 1.6-.7l2.8-13.4c.3-1.2-.4-1.7-1.2-1.5z" />
        </svg>
      ) : pref === "instagram" ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      )}
    </span>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="panel-setup-chevron"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkspaceSetup({
  lang,
  tenantId,
  defaultCompany,
  onFinish,
  children,
}: {
  lang: Lang;
  tenantId: string;
  defaultCompany?: string;
  onFinish: (goal: number) => void;
  children: ReactNode;
}) {
  const d = COPY[lang];
  const storageKey = `panelim:workspace-setup:v1:${tenantId}`;
  const [complete, setComplete] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  // 0..5 => Kommo 6-step onboarding flow
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<AvatarId>("heart");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [supportPref, setSupportPref] = useState<SupportPref>("whatsapp");
  const [countryCode, setCountryCode] = useState("+994");
  const [phone, setPhone] = useState("");

  const [industryIdx, setIndustryIdx] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [role, setRole] = useState("");

  const [goals, setGoals] = useState<number[]>([]);
  const [sources, setSources] = useState<LeadSourceId[]>([]);
  const [teamSize, setTeamSize] = useState("");

  const [company, setCompany] = useState(defaultCompany ?? "");
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  if (complete) return children;

  const industries = INDUSTRIES[lang];
  const businessTypeOptions =
    industryIdx !== ""
      ? BUSINESS_TYPES[lang][Number(industryIdx)] ?? DEFAULT_BUSINESS_TYPES[lang]
      : [];
  const roles = ROLES[lang];

  const canContinue =
    step === 0
      ? phone.replace(/\D/g, "").length >= 4
      : step === 1
        ? Boolean(industryIdx !== "" && businessType && role)
        : step === 2
          ? goals.length > 0
          : step === 3
            ? sources.length > 0
            : step === 4
              ? Boolean(teamSize)
              : Boolean(company.trim() && website.trim());

  const stepTitles = [
    d.step1Title,
    d.step2Title,
    d.step3Title,
    d.step4Title,
    d.step5Title,
    d.step6Title,
  ];
  const stepSubtitles = [
    null,
    d.step2Sub,
    d.step3Sub,
    d.step4Sub,
    d.step5Sub,
    d.step6Sub,
  ];

  function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomAvatarUrl(reader.result);
        setAvatar("custom");
      }
    };
    reader.readAsDataURL(file);
  }

  function handleIndustryChange(nextIdx: string) {
    setIndustryIdx(nextIdx);
    setBusinessType("");
    setRole("");
  }

  function toggleSource(src: LeadSourceId) {
    setSources((prev) => (prev.includes(src) ? prev.filter((item) => item !== src) : [...prev, src]));
  }

  function finishSetup() {
    setSubmitting(true);
    setError(false);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          avatar,
          customAvatarUrl,
          supportPref,
          phone: `${countryCode}${phone.trim()}`.trim(),
          industry: industryIdx !== "" ? industries[Number(industryIdx)] : "",
          businessType,
          role,
          goals,
          sources,
          teamSize,
          company: company.trim(),
          website: website.trim(),
        })
      );
    } catch {
      setSubmitting(false);
      setError(true);
      return;
    }
    window.setTimeout(() => {
      onFinish(goals[0] ?? 0);
      setSubmitting(false);
      setComplete(true);
    }, 220);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue || submitting) return;
    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }
    finishSetup();
  }

  const presets: readonly { id: Exclude<AvatarId, "custom">; bg: string; label: string }[] = [
    { id: "heart", bg: "#fef9c3", label: "Heart" },
    { id: "mic", bg: "#f3f4ff", label: "Mic" },
    { id: "bolt", bg: "#f3e8ff", label: "Bolt" },
    { id: "star", bg: "#f4f6fa", label: "Star" },
  ];

  return (
    <>
      <div inert aria-hidden="true">
        {children}
      </div>
      <div className="panel-setup-overlay">
        <section
          className="panel-setup-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-title"
        >
          {submitting && (
            <div className="panel-setup-spinner-backdrop" role="status" aria-live="polite">
              <div className="panel-setup-spinner" aria-label={d.saving} />
            </div>
          )}

          <div className="panel-setup-header">
            <h1 id="setup-title" className="panel-setup-title">
              {stepTitles[step]}
            </h1>
            {stepSubtitles[step] && <p className="panel-setup-subtitle">{stepSubtitles[step]}</p>}
          </div>

          <form onSubmit={handleSubmit} className="panel-setup-form">
            <div className="panel-setup-body">
              {/* STEP 1: Avatar + Support Preference + Phone */}
              {step === 0 && (
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <span className="panel-setup-label">{d.avatarLabel}</span>
                    <div className="panel-setup-avatar-grid">
                      <label
                        className={`panel-setup-avatar-tile panel-setup-avatar-upload ${
                          avatar === "custom" ? "is-selected" : ""
                        }`}
                        title={d.uploadAvatar}
                      >
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/gif, image/webp"
                          onChange={handleAvatarUpload}
                          className="sr-only"
                          aria-label={d.uploadAvatar}
                        />
                        {customAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={customAvatarUrl}
                            alt={d.uploadAvatar}
                            className="h-full w-full rounded-[8px] object-cover"
                          />
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                            <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-1.5 14h-11l2.75-3.54 1.96 2.36 2.75-3.54L17.5 17zM8.5 10A1.5 1.5 0 1 1 10 8.5 1.5 1.5 0 0 1 8.5 10z" />
                          </svg>
                        )}
                      </label>
                      {presets.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAvatar(item.id)}
                          aria-pressed={avatar === item.id}
                          aria-label={item.label}
                          style={{ backgroundColor: item.bg }}
                          className={`panel-setup-avatar-tile ${avatar === item.id ? "is-selected" : ""}`}
                        >
                          <PresetAvatarIcon id={item.id} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="setup-support-pref" className="panel-setup-label">
                      {d.supportLabel}
                    </label>
                    <div className="panel-setup-select-wrap">
                      <SupportBadge pref={supportPref} />
                      <select
                        id="setup-support-pref"
                        value={supportPref}
                        onChange={(e) => setSupportPref(e.target.value as SupportPref)}
                        className="panel-setup-select-inner"
                      >
                        {SUPPORT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <label htmlFor="setup-phone" className="panel-setup-label">
                      {d.phoneLabel}
                    </label>
                    <div className="panel-setup-phone-wrap">
                      <select
                        aria-label="Country code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="panel-setup-country"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <span className="panel-setup-phone-divider" aria-hidden="true" />
                      <input
                        id="setup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={d.phonePlaceholder}
                        className="panel-setup-phone-input"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Industry -> Conditional Business Type -> Role */}
              {step === 1 && (
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label htmlFor="setup-industry" className="panel-setup-label">
                      {d.industryLabel}
                    </label>
                    <div className="panel-setup-select-wrap">
                      <select
                        id="setup-industry"
                        value={industryIdx}
                        onChange={(e) => handleIndustryChange(e.target.value)}
                        className="panel-setup-select-inner"
                        required
                      >
                        <option value="">{d.industryLabel}</option>
                        {industries.map((item, idx) => (
                          <option key={item} value={String(idx)}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown />
                    </div>
                  </div>

                  {industryIdx !== "" && (
                    <div className="grid gap-1.5">
                      <label htmlFor="setup-business-type" className="panel-setup-label">
                        {d.businessTypeLabel}
                      </label>
                      <div className="panel-setup-select-wrap">
                        <select
                          id="setup-business-type"
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                          className="panel-setup-select-inner"
                          required
                        >
                          <option value="">{d.businessTypeLabel}</option>
                          {businessTypeOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                        <ChevronDown />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <label htmlFor="setup-role" className="panel-setup-label">
                      {d.roleLabel}
                    </label>
                    <div className={`panel-setup-select-wrap ${!businessType ? "is-disabled" : ""}`}>
                      <select
                        id="setup-role"
                        value={role}
                        disabled={!businessType}
                        onChange={(e) => setRole(e.target.value)}
                        className="panel-setup-select-inner"
                        required
                      >
                        <option value="">{d.roleLabel}</option>
                        {roles.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <ChevronDown />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Goals (Max 2 Multi-Select Cards) */}
              {step === 2 && (
                <fieldset className="grid gap-2.5">
                  <legend className="sr-only">{d.step3Title}</legend>
                  {d.goals.map((goal, index) => {
                    const checked = goals.includes(index);
                    const locked = goals.length >= 2 && !checked;
                    return (
                      <label
                        key={goal}
                        className={`panel-setup-card-choice ${checked ? "is-selected" : ""} ${
                          locked ? "is-locked" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(e) =>
                            setGoals(
                              e.target.checked
                                ? [...goals, index]
                                : goals.filter((item) => item !== index)
                            )
                          }
                          className="panel-setup-checkbox"
                        />
                        <span>{goal}</span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {/* STEP 4: Lead Sources (Multi-Select Cards with Brand Icons) */}
              {step === 3 && (
                <fieldset className="grid gap-2.5">
                  <legend className="sr-only">{d.step4Title}</legend>
                  {SOURCE_ORDER.map((srcId) => {
                    const checked = sources.includes(srcId);
                    return (
                      <label
                        key={srcId}
                        className={`panel-setup-card-choice ${checked ? "is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSource(srcId)}
                          className="panel-setup-checkbox"
                        />
                        <SourceBrandIcon id={srcId} />
                        <span>{d.sources[srcId]}</span>
                      </label>
                    );
                  })}
                </fieldset>
              )}

              {/* STEP 5: Team Size (2x4 Auto-Advance Grid) */}
              {step === 4 && (
                <div className="panel-setup-size-grid" role="group" aria-label={d.step5Title}>
                  {d.sizes.map((sizeLabel) => (
                    <button
                      key={sizeLabel}
                      type="button"
                      onClick={() => {
                        setTeamSize(sizeLabel);
                        setStep(5);
                      }}
                      className={`panel-setup-size-card ${teamSize === sizeLabel ? "is-selected" : ""}`}
                    >
                      {sizeLabel}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 6: Business Details */}
              {step === 5 && (
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label htmlFor="setup-company-name" className="panel-setup-label">
                      {d.companyLabel}
                    </label>
                    <input
                      id="setup-company-name"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={d.companyPlaceholder}
                      maxLength={120}
                      className="panel-setup-input"
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="setup-website" className="panel-setup-label">
                      {d.websiteLabel}
                    </label>
                    <input
                      id="setup-website"
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder={d.websitePlaceholder}
                      maxLength={180}
                      className="panel-setup-input"
                      required
                    />
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-danger">
                  {d.error}
                </p>
              )}
            </div>

            <div className="panel-setup-footer">
              {step > 0 && (
                <button
                  type="button"
                  className="panel-setup-back-btn"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M16 10H4m5-5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{d.back}</span>
                </button>
              )}

              {step !== 4 && (
                <button
                  type="submit"
                  className="panel-setup-next-btn"
                  disabled={!canContinue || submitting}
                >
                  <span>{d.next}</span>
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M4 10h12m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
