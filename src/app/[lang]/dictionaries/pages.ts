export const CASE_SLUGS = ["retail", "education"] as const;
export const AI_SLUGS = ["agent", "analyst", "copilot", "multi-agents"] as const;
export type CaseSlug = (typeof CASE_SLUGS)[number];
export type AiSlug = (typeof AI_SLUGS)[number];

const caseSet: ReadonlySet<string> = new Set(CASE_SLUGS);
const aiSet: ReadonlySet<string> = new Set(AI_SLUGS);
export const isCaseSlug = (s: string): s is CaseSlug => caseSet.has(s);
export const isAiSlug = (s: string): s is AiSlug => aiSet.has(s);

export type PageCopy = {
  badge: string;
  title: string;
  subtitle: string;
  heading: string;
  items: { title: string; desc: string }[];
  row: { title: string; body: string; bullets: string[] };
};
export type PageDef = {
  image: string;
  rowImage: string;
  badgeVariant: "default" | "mint" | "amber";
  az: PageCopy;
  en: PageCopy;
};

const p = (
  image: string,
  rowImage: string,
  badgeVariant: PageDef["badgeVariant"],
  az: PageCopy,
  en: PageCopy,
): PageDef => ({ image, rowImage, badgeVariant, az, en });

export const PAGES = {
  integrations: p("feature-integrations", "p-channels", "default",
    {
      badge: "İnteqrasiyalar",
      title: "Kanallarınızı və alətlərinizi bir panelə qoşun",
      subtitle: "Telegram, WhatsApp və Instagram mesajları Panelim gələn qutusuna düşür. Digər sistemlər üçün Webhook API var.",
      heading: "Mövcud və planlaşdırılan qoşulmalar",
      items: [
        { title: "Mesajlaşma kanalları", desc: "Telegram, WhatsApp və Instagram vahid gələn qutusunda. WhatsApp və Instagram üçün Meta təsdiqi tələb olunur." },
        { title: "Webhook API", desc: "Vebsayt formalarını və xarici sistemləri müraciət kimi Panelim-ə göndərin." },
        { title: "Planlaşdırılır", desc: "Təqvim, ödəniş və mühasibat qoşulmaları pilot nəticələrinə görə əlavə olunacaq. Tarix vəd edilmir." },
      ],
      row: { title: "Qoşulma necə işləyir", body: "Qoşulma zamanı komandamız kanal məlumatlarını təhlükəsiz şəkildə quraşdırır.", bullets: ["Hər müştəri üçün ayrı məlumat bazası", "İmza ilə təsdiqlənən webhook-lar", "Açarlar paneldə göstərilmir"] },
    },
    {
      badge: "Integrations",
      title: "Connect your channels and tools to one panel",
      subtitle: "Telegram, WhatsApp and Instagram messages land in the Panelim inbox. A Webhook API covers other systems.",
      heading: "Available and planned connections",
      items: [
        { title: "Messaging channels", desc: "Telegram, WhatsApp and Instagram in one inbox. WhatsApp and Instagram need Meta approval." },
        { title: "Webhook API", desc: "Send website forms and external systems into Panelim as enquiries." },
        { title: "Planned", desc: "Calendar, payment and accounting connections will follow pilot results. No dates are promised." },
      ],
      row: { title: "How connecting works", body: "During onboarding our team sets up channel credentials securely.", bullets: ["Separate data per customer", "Signature-verified webhooks", "Keys are never shown in the panel"] },
    }),
  partners: p("page-partners", "p-contact-baku", "mint",
    {
      badge: "Tərəfdaşlar",
      title: "Panelim ilə birlikdə böyüyün",
      subtitle: "Agentliklər və konsaltinq şirkətləri müştərilərinə Panelim quraşdıra bilər. Şərtlər hər tərəfdaşla ayrıca razılaşdırılır.",
      heading: "Kimlər üçün",
      items: [
        { title: "Marketinq agentlikləri", desc: "Müştərilərinizin reklam müraciətlərini vahid CRM-ə yönləndirin." },
        { title: "Biznes konsultantları", desc: "Satış prosesini qurarkən hazır iş axınlarından istifadə edin." },
        { title: "Texniki komandalar", desc: "Webhook API ilə mövcud sistemləri Panelim-ə qoşun." },
      ],
      row: { title: "Necə başlayaq", body: "Əlaqə formasından yazın, birgə iş formatını müzakirə edək.", bullets: ["Pilot müştəri ilə başlayırıq", "Komissiya və qiymət yazılı razılaşdırılır", "Quraşdırma dəstəyi göstərilir"] },
    },
    {
      badge: "Partners",
      title: "Grow with Panelim",
      subtitle: "Agencies and consultancies can set up Panelim for their clients. Terms are agreed with each partner individually.",
      heading: "Who it is for",
      items: [
        { title: "Marketing agencies", desc: "Route your clients' ad enquiries into one CRM." },
        { title: "Business consultants", desc: "Use ready workflows when building a sales process." },
        { title: "Technical teams", desc: "Connect existing systems to Panelim with the Webhook API." },
      ],
      row: { title: "How to start", body: "Write through the contact form and we will discuss the format.", bullets: ["We begin with a pilot client", "Commission and price are agreed in writing", "Setup support is provided"] },
    }),
  "cases/retail": p("case-retail", "industry-retail", "amber",
    {
      badge: "İstifadə ssenarisi",
      title: "Pərakəndə: mesajdan sifarişə",
      subtitle: "Bu, real müştəri hekayəsi deyil, tipik iş axını ssenarisidir.",
      heading: "Ssenarinin addımları",
      items: [
        { title: "Sual gəlir", desc: "Müştəri Instagram-da məhsulun qiymətini soruşur." },
        { title: "Cavab hazırlanır", desc: "Operator qaralama cavabı yoxlayıb göndərir." },
        { title: "Sifariş yazılır", desc: "Sifariş və ünvan müştəri kartında saxlanılır." },
      ],
      row: { title: "Təkrar satış", body: "Əvvəlki alıcılara yeni kolleksiya haqqında yazın.", bullets: ["Müştəri tarixçəsi bir yerdə", "Tapşırıq və xatırlatmalar", "Kanal üzrə hesabat"] },
    },
    {
      badge: "Use scenario",
      title: "Retail: from message to order",
      subtitle: "This is a typical workflow scenario, not a real customer story.",
      heading: "Scenario steps",
      items: [
        { title: "A question arrives", desc: "A shopper asks the price of an item on Instagram." },
        { title: "A reply is drafted", desc: "An operator reviews the draft reply and sends it." },
        { title: "The order is recorded", desc: "Order and address are saved on the customer card." },
      ],
      row: { title: "Selling again", body: "Message past buyers about the new collection.", bullets: ["Customer history in one place", "Tasks and reminders", "Report by channel"] },
    }),
  "cases/education": p("case-education", "industry-education", "mint",
    {
      badge: "İstifadə ssenarisi",
      title: "Təhsil mərkəzi: müraciətdən qeydiyyata",
      subtitle: "Bu, real müştəri hekayəsi deyil, tipik iş axını ssenarisidir.",
      heading: "Ssenarinin addımları",
      items: [
        { title: "Valideyn yazır", desc: "Kurs qiyməti və saatları barədə sual gəlir." },
        { title: "Sınaq dərsi təyin olunur", desc: "Boş yer yoxlanılır, təkrar qeydiyyat bloklanır." },
        { title: "Qeydiyyat tamamlanır", desc: "Sınaqdan sonra xatırlatma göndərilir." },
      ],
      row: { title: "Qrup tutumu", body: "Qrup dolduqda sistem yeni qeydiyyatı qəbul etmir.", bullets: ["Real vaxt boş yer", "Menecerə bildiriş", "Satış hunisi"] },
    },
    {
      badge: "Use scenario",
      title: "Learning center: from enquiry to enrolment",
      subtitle: "This is a typical workflow scenario, not a real customer story.",
      heading: "Scenario steps",
      items: [
        { title: "A parent writes", desc: "A question about course price and hours arrives." },
        { title: "A trial is booked", desc: "Free seats are checked and duplicates are blocked." },
        { title: "Enrolment completes", desc: "A reminder is sent after the trial." },
      ],
      row: { title: "Group capacity", body: "When a group is full the system accepts no new enrolment.", bullets: ["Live free seats", "Manager notification", "Sales funnel"] },
    }),
  "ai/agent": p("p-ai-copilot", "p-salesbot", "default",
    {
      badge: "AI agent",
      title: "Müraciətlərə qaralama cavab hazırlayan AI",
      subtitle: "Pilot mərhələdə AI cavabı operator təsdiqi ilə göndərilir. Avtomatik göndərmə hələ aktiv deyil.",
      heading: "Nə edir",
      items: [
        { title: "Qaralama cavab", desc: "Qiymət və vaxt suallarına Azərbaycan dilində qaralama təklif edir." },
        { title: "Operatora ötürmə", desc: "Mürəkkəb sualı əməkdaşa yönləndirir." },
        { title: "Sizin qaydalarınız", desc: "Yalnız təsdiqlədiyiniz məlumatdan istifadə edir." },
      ],
      row: { title: "Nəzarət sizdədir", body: "Hər cavab operator tərəfindən görünür.", bullets: ["Təsdiq olmadan göndərmə yoxdur", "Söhbət tarixçəsi saxlanılır", "İstənilən vaxt əl ilə cavab"] },
    },
    {
      badge: "AI agent",
      title: "AI that drafts replies to enquiries",
      subtitle: "In the pilot, AI replies are sent after operator approval. Automatic sending is not enabled yet.",
      heading: "What it does",
      items: [
        { title: "Draft replies", desc: "Proposes drafts for price and timing questions in Azerbaijani." },
        { title: "Hand-off to staff", desc: "Routes complex questions to a person." },
        { title: "Your rules", desc: "Uses only information you have approved." },
      ],
      row: { title: "You stay in control", body: "Every reply is visible to the operator.", bullets: ["No sending without approval", "Conversation history is kept", "Reply manually at any time"] },
    }),
  "ai/analyst": p("ai-analyst", "p-demo-stats", "default",
    {
      badge: "AI analitik",
      title: "Satış məlumatlarını sadə dillə izah edən analitik",
      subtitle: "Hansı kanaldan neçə müraciət gəldiyini və hunidə harada itirdiyinizi görün.",
      heading: "Nəyi göstərir",
      items: [
        { title: "Kanal hesabatı", desc: "Müraciətlərin mənbə üzrə bölgüsü." },
        { title: "Huni mərhələləri", desc: "Müraciətdən qeydiyyata keçid." },
        { title: "Gecikən müraciətlər", desc: "Cavab gözləyən söhbətlər." },
      ],
      row: { title: "Rəqəmlər real məlumatdan", body: "Hesabat yalnız sizin CRM məlumatınızdan hesablanır.", bullets: ["Uydurma göstərici yoxdur", "Tarix aralığı seçimi", "Komanda üzrə baxış"] },
    },
    {
      badge: "AI analyst",
      title: "An analyst that explains sales data in plain words",
      subtitle: "See how many enquiries each channel brings and where the funnel leaks.",
      heading: "What it shows",
      items: [
        { title: "Channel report", desc: "Enquiries split by source." },
        { title: "Funnel stages", desc: "Conversion from enquiry to enrolment." },
        { title: "Overdue enquiries", desc: "Conversations waiting for a reply." },
      ],
      row: { title: "Numbers from real data", body: "Reports are computed only from your own CRM data.", bullets: ["No invented metrics", "Date range selection", "Per-team view"] },
    }),
  "ai/copilot": p("ai-copilot", "p-ai-copilot", "mint",
    {
      badge: "AI köməkçi pilot",
      title: "Satış meneceri üçün yanındakı köməkçi",
      subtitle: "Söhbəti xülasə edir, növbəti addımı təklif edir. Qərarı siz verirsiniz.",
      heading: "Köməkçi nə təklif edir",
      items: [
        { title: "Xülasə", desc: "Uzun yazışmanın qısa icmalı." },
        { title: "Növbəti addım", desc: "Tapşırıq və xatırlatma təklifi." },
        { title: "Cavab ideyası", desc: "Operator üçün cavab variantı." },
      ],
      row: { title: "Paneldə yanınızda", body: "Köməkçi çəkməcəsi söhbət səhifəsindən açılır.", bullets: ["Kontekst saxlanılır", "Operator təsdiqləyir", "Mobil cihazda da işləyir"] },
    },
    {
      badge: "AI copilot pilot",
      title: "A copilot beside your sales manager",
      subtitle: "Summarizes the conversation and suggests the next step. You make the call.",
      heading: "What the copilot suggests",
      items: [
        { title: "Summary", desc: "A short recap of a long thread." },
        { title: "Next step", desc: "A suggested task or reminder." },
        { title: "Reply idea", desc: "A reply option for the operator." },
      ],
      row: { title: "Next to you in the panel", body: "The copilot drawer opens from the conversation view.", bullets: ["Context is kept", "Operator approves", "Works on mobile too"] },
    }),
  "ai/multi-agents": p("ai-multiagents", "p-product-tour", "amber",
    {
      badge: "Çoxlu agent",
      title: "Müxtəlif işlər üçün ayrı AI rolları",
      subtitle: "Qəbul, qiymət və satış sualları üçün ayrı qaydalar. Plan mərhələsindədir, hələ aktiv deyil.",
      heading: "Planlaşdırılan rollar",
      items: [
        { title: "Qəbul rolu", desc: "Salamlama və məlumat toplama." },
        { title: "Qiymət rolu", desc: "Təsdiqlənmiş qiymət cavabları." },
        { title: "Ötürmə rolu", desc: "Əməkdaşa düzgün yönləndirmə." },
      ],
      row: { title: "Mərhələli keçid", body: "Əvvəl bir agent, sonra rollar ayrılır.", bullets: ["Pilot nəticələrinə görə", "Tarix vəd edilmir", "Hər rol üçün ayrı qaydalar"] },
    },
    {
      badge: "Multi-agent",
      title: "Separate AI roles for different jobs",
      subtitle: "Separate rules for intake, pricing and sales questions. This is planned and not enabled yet.",
      heading: "Planned roles",
      items: [
        { title: "Intake role", desc: "Greeting and information gathering." },
        { title: "Pricing role", desc: "Approved price answers." },
        { title: "Hand-off role", desc: "Correct routing to staff." },
      ],
      row: { title: "A staged rollout", body: "One agent first, then roles are split.", bullets: ["Based on pilot results", "No dates promised", "Separate rules per role"] },
    }),
  "channels/tiktok": p("channel-tiktok", "mobile-hero", "default",
    {
      badge: "TikTok",
      title: "TikTok-dan gələn müraciətləri izləyin",
      subtitle: "TikTok hələ birbaşa qoşulmayıb. Bu gün müraciətləri vebsayt formu və Webhook API ilə CRM-ə gətirə bilərsiniz.",
      heading: "Bu gün mümkün olan",
      items: [
        { title: "Profil linki", desc: "Bio linkini müraciət formasına yönləndirin." },
        { title: "Mənbə etiketi", desc: "Müraciət mənbəyini TikTok kimi qeyd edin." },
        { title: "Hesabat", desc: "TikTok-dan gələn müraciətləri ayrıca görün." },
      ],
      row: { title: "Birbaşa qoşulma", body: "Birbaşa mesaj qoşulması pilot nəticələrinə görə qərara alınacaq.", bullets: ["Tarix vəd edilmir", "Hazırkı yol: form və API", "Mənbə izlənir"] },
    },
    {
      badge: "TikTok",
      title: "Track enquiries that come from TikTok",
      subtitle: "TikTok is not connected directly yet. Today you can bring enquiries into the CRM through a website form and the Webhook API.",
      heading: "What works today",
      items: [
        { title: "Profile link", desc: "Point the bio link to the enquiry form." },
        { title: "Source tag", desc: "Mark the enquiry source as TikTok." },
        { title: "Reporting", desc: "See TikTok enquiries separately." },
      ],
      row: { title: "Direct connection", body: "A direct message connection will be decided from pilot results.", bullets: ["No dates promised", "Current route: form and API", "Source is tracked"] },
    }),
  "channels/whatsapp-broadcast": p("feature-broadcast", "p-whatsapp", "mint",
    {
      badge: "WhatsApp kampaniya",
      title: "WhatsApp-da kampaniya mesajları",
      subtitle: "Kütləvi mesaj yalnız razılıq verən müştərilərə və Meta şablon qaydaları ilə göndərilməlidir. Bu funksiya hələ aktiv deyil.",
      heading: "Qaydalar",
      items: [
        { title: "Razılıq", desc: "Müştəri marketinq mesajına razılıq verib." },
        { title: "Şablon", desc: "Meta tərəfindən təsdiqlənmiş mesaj şablonu." },
        { title: "Xərc", desc: "Meta mesaj haqqı ayrıca hesablanır." },
      ],
      row: { title: "Xərci əvvəlcədən hesablayın", body: "Alətlər səhifəsindəki kalkulyator təxmini xərci göstərir.", bullets: ["Razılıq tarixi saxlanılır", "Çıxış (opt-out) nəzərə alınır", "Qiymətlər Meta tarifinə görədir"] },
    },
    {
      badge: "WhatsApp campaigns",
      title: "Campaign messages on WhatsApp",
      subtitle: "Bulk messages must go only to customers who opted in and follow Meta template rules. This feature is not enabled yet.",
      heading: "Rules",
      items: [
        { title: "Consent", desc: "The customer opted in to marketing messages." },
        { title: "Template", desc: "A message template approved by Meta." },
        { title: "Cost", desc: "Meta message fees are billed separately." },
      ],
      row: { title: "Estimate the cost first", body: "The calculator on the tools page shows an approximate cost.", bullets: ["Consent date is stored", "Opt-out is respected", "Prices follow Meta's tariff"] },
    }),
} as const satisfies Record<string, PageDef>;

export type PageKey = keyof typeof PAGES;
