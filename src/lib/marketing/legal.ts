import { PLAN_SETUP_FEE_AZN, TRIAL_DAYS } from "./pricing";

/**
 * Legal texts for panelim.az (privacy, terms, data deletion).
 *
 * DRAFT: written to cover what the product actually does today and what Meta,
 * Google and Paycell reviews ask for. A lawyer should read it before launch.
 * Company details are filled from env (see company.ts); a missing one renders
 * as a visible "to be filled" marker instead of an invented value.
 *
 * Tokens: {{legalName}} {{taxId}} {{address}} {{privacyEmail}} {{siteUrl}}
 */
export type LegalKind = "privacy" | "terms" | "data-deletion";
export type LegalSection = { title: string; paras: string[] };
export type LegalDoc = { title: string; subtitle: string; updated: string; sections: LegalSection[] };

export const LEGAL_UPDATED = { az: "26 noyabr 2026", en: "26 November 2026" } as const;

export const LEGAL_TOKEN_LABELS = {
  az: {
    legalName: "şirkətin hüquqi adı",
    taxId: "VÖEN",
    address: "hüquqi ünvan",
    privacyEmail: "məxfilik üçün email",
    siteUrl: "sayt ünvanı",
  },
  en: {
    legalName: "company legal name",
    taxId: "tax ID (VÖEN)",
    address: "registered address",
    privacyEmail: "privacy email",
    siteUrl: "site address",
  },
} as const;

export type LegalToken = keyof (typeof LEGAL_TOKEN_LABELS)["az"];

const AZ: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Məxfilik Siyasəti",
    subtitle: "Hansı məlumatları topladığımız, nə üçün istifadə etdiyimiz və hüquqlarınız.",
    updated: `Son yenilənmə: ${LEGAL_UPDATED.az}`,
    sections: [
      {
        title: "1. Məlumatları kim emal edir",
        paras: [
          "panelim.az xidmətini {{legalName}} (VÖEN {{taxId}}, ünvan: {{address}}) göstərir. Bu siyasətdə «biz» dedikdə həmin şirkət nəzərdə tutulur.",
          "Məxfiliklə bağlı bütün sorğular üçün: {{privacyEmail}}.",
        ],
      },
      {
        title: "2. İki rolumuz",
        paras: [
          "Sizin panelim.az hesabınız və saytdakı formalar üçün məlumatların nəzarətçisi bizik.",
          "Biznesinizin müştərilərinin yazışmaları, əlaqə məlumatları və sövdələşmələri üçün nəzarətçi sizsiniz, biz isə sizin tapşırığınızla həmin məlumatları emal edirik və onlardan başqa məqsədlə istifadə etmirik.",
        ],
      },
      {
        title: "3. Topladığımız məlumatlar",
        paras: [
          "Hesab: ad, email, şifrənin heşi (şifrənin özü saxlanmır), iş sahəsinin adı və sektoru.",
          "Google və ya Facebook ilə giriş: həmin xidmətin bizə verdiyi ad, email və istifadəçi identifikatoru. Dostlar siyahısı, paylaşımlar və ya digər məlumat istənilmir.",
          "Biznesinizin CRM məlumatları: qoşduğunuz WhatsApp, Instagram, Messenger və Telegram kanallarından gələn mesajlar, müştəri adları, telefon nömrələri, qeydlər, tapşırıqlar və rezervasiyalar.",
          "Sayt formaları: demo və ya əlaqə üçün yazdığınız ad, telefon, email və mesaj.",
          "Texniki məlumat: IP ünvanı, brauzer növü, ziyarət olunan səhifələr və xəta qeydləri.",
        ],
      },
      {
        title: "4. Məqsəd və hüquqi əsas",
        paras: [
          "Xidməti göstərmək və müqaviləni icra etmək: hesabın işləməsi, mesajların çatdırılması, ödənişlərin qəbulu.",
          "Qanuni maraq: təhlükəsizlik, sui-istifadənin qarşısının alınması, xətaların aradan qaldırılması.",
          "Razılıq: analitika və reklam kukiləri yalnız siz «Hamısını qəbul et» seçdikdə yüklənir.",
        ],
      },
      {
        title: "5. Kukilər",
        paras: [
          "Zəruri kukilər girişi və təhlükəsizliyi təmin edir və söndürülə bilməz.",
          "Analitika və reklam kukiləri (Google Analytics, Meta Pixel və s.) yalnız razılığınızla işə düşür. Seçiminizi dəyişmək üçün brauzerdə bu saytın məlumatlarını silin, baner yenidən görünəcək.",
        ],
      },
      {
        title: "6. Məlumat ötürdüyümüz xidmətlər",
        paras: [
          "Məlumatları satmırıq və reklam üçün ötürmürük. Xidməti göstərmək üçün bu provayderlərdən istifadə edirik: Vercel (hostinq), Neon (verilənlər bazası), Meta (WhatsApp, Instagram, Messenger), Telegram, Google və Facebook (giriş), Paycell (ödəniş), email göndərmə xidməti, xəta monitorinqi xidməti və Pani aktiv olduqda AI model provayderi.",
          "AI provayderinə yalnız cavab hazırlamaq üçün lazım olan söhbət hissəsi və sizin təsdiqlədiyiniz biznes məlumatı göndərilir.",
        ],
      },
      {
        title: "7. Məlumatların harada saxlanması",
        paras: [
          "Serverlərimiz ABŞ-dadır (Vercel və Neon, us-east-1). Məlumatlar ötürülərkən və saxlanarkən şifrələnir.",
        ],
      },
      {
        title: "8. Saxlama müddəti",
        paras: [
          "Hesab aktiv olduğu müddətdə saxlanılır. Hesab silindikdən sonra məlumatlar 30 gün ərzində silinir; ehtiyat nüsxələrdən isə növbəti ehtiyat dövrü ərzində çıxır.",
          "Qanunla saxlanması tələb olunan ödəniş sənədləri qanunun tələb etdiyi müddətdə saxlanılır.",
        ],
      },
      {
        title: "9. Hüquqlarınız",
        paras: [
          "«Fərdi məlumatlar haqqında» Azərbaycan Respublikası Qanununa uyğun olaraq məlumatlarınıza çıxış, onların düzəldilməsi, silinməsi və emalına etiraz etmək hüququnuz var. Sorğunu {{privacyEmail}} ünvanına göndərin, 30 gün ərzində cavab veririk.",
          "Biznesin müştərisisinizsə, əvvəlcə sizə yazan biznesə müraciət edin; biz də onlara kömək edirik.",
        ],
      },
      {
        title: "10. Məlumatların silinməsi",
        paras: [
          "Hesabın və ona bağlı məlumatların silinməsi qaydası, o cümlədən Google və ya Facebook ilə giriş edənlər üçün: {{siteUrl}}/az/legal/data-deletion.",
        ],
      },
      {
        title: "11. Təhlükəsizlik",
        paras: [
          "Hər iş sahəsinin məlumatı verilənlər bazası səviyyəsində ayrılıb, şifrələr heşlənir, giriş cəhdləri məhdudlaşdırılır. Məlumat sızması aşkar etsək, təsirlənən istifadəçilərə xəbər veririk.",
        ],
      },
      {
        title: "12. Uşaqlar",
        paras: ["Xidmət 18 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb."],
      },
      {
        title: "13. Dəyişikliklər",
        paras: [
          "Siyasəti dəyişsək, yeni mətn bu səhifədə dərc olunur və əsaslı dəyişikliklər barədə hesab sahiblərinə əvvəlcədən xəbər veririk.",
        ],
      },
    ],
  },
  terms: {
    title: "İstifadə Şərtləri",
    subtitle: "panelim.az xidmətindən istifadə qaydaları, ödəniş və ləğv şərtləri.",
    updated: `Son yenilənmə: ${LEGAL_UPDATED.az}`,
    sections: [
      {
        title: "1. Tərəflər",
        paras: [
          "Bu şərtlər {{legalName}} (VÖEN {{taxId}}, ünvan: {{address}}) ilə panelim.az-da hesab açan şəxs və ya biznes arasında müqavilədir. Hesab açmaqla və ya xidmətdən istifadə etməklə bu şərtləri qəbul edirsiniz.",
        ],
      },
      {
        title: "2. Xidmət",
        paras: [
          "panelim.az mesajlaşma kanallarından gələn müraciətləri bir qutuda toplayan, satış mərhələlərini, tapşırıqları və rezervasiyaları idarə etməyə kömək edən CRM xidmətidir. Pani AI köməkçisi sizin təyin etdiyiniz qaydalar və məlumatlar çərçivəsində cavab hazırlayır.",
        ],
      },
      {
        title: "3. Hesab",
        paras: [
          "Hesab məlumatlarınızın düzgünlüyünə və giriş məlumatlarının məxfiliyinə siz cavabdehsiniz. İş sahənizdə komanda üzvlərinin etdiyi əməliyyatlar sizin hesabınıza aiddir.",
        ],
      },
      {
        title: "4. Pulsuz sınaq",
        paras: [
          `Yeni iş sahəsi ${TRIAL_DAYS} günlük pulsuz sınaqla başlayır. Sınaq bitdikdə ödənişli plan seçilməyibsə, iş sahəsi yalnız oxuma rejiminə keçir: məlumatlarınızı görə və ixrac edə bilərsiniz, yeni mesaj göndərmək və dəyişiklik etmək mümkün olmur. Məlumatlar sınaqdan sonra ən azı 30 gün saxlanılır.`,
        ],
      },
      {
        title: "5. Qiymətlər və ödəniş",
        paras: [
          "Qiymətlər AZN ilə qiymət səhifəsində göstərilir. Aylıq, 6 aylıq və ya illik dövr üçün əvvəlcədən ödənilir; 6 aylıq və illik planlarda göstərilən aylıq məbləğ həmin dövrün ümumi ödənişinin aya düşən hissəsidir.",
          `İnkişaf və Pro planları üçün ${PLAN_SETUP_FEE_AZN.growth} AZN birdəfəlik quraşdırma haqqı tətbiq olunur.`,
          "WhatsApp Cloud API mesaj haqları Meta tərəfindən müəyyən edilir və abunəyə daxil deyil.",
          "Ödəniş dövrü bitəndə xidmətin davam etməsi üçün növbəti dövrün ödənişi tələb olunur.",
        ],
      },
      {
        title: "6. Ləğv və geri qaytarma",
        paras: [
          "Abunəni istənilən vaxt ləğv edə bilərsiniz; xidmət ödənilmiş dövrün sonuna qədər işləyir.",
          "İlk ödənişdən sonra 14 gün ərzində ləğv etsəniz, abunə haqqı tam qaytarılır. Quraşdırma işləri başlayıbsa, quraşdırma haqqı qaytarılmır. Sonrakı dövrlərdə istifadə olunmamış hissə qaytarılmır.",
        ],
      },
      {
        title: "7. Məqbul istifadə",
        paras: [
          "Spam, razılıq verməyən şəxslərə kütləvi reklam, qanunsuz məzmun, aldatma və başqalarının hüquqlarını pozan istifadə qadağandır. Meta, WhatsApp və Telegram platformalarının öz qaydalarına əməl etmək sizin məsuliyyətinizdir. Pozuntu aşkar edildikdə iş sahəsi dayandırıla bilər.",
        ],
      },
      {
        title: "8. Sizin məlumatlarınız",
        paras: [
          "İş sahənizdəki müştəri məlumatları sizə məxsusdur. Biz onları yalnız xidməti göstərmək üçün emal edirik (Məxfilik Siyasətinə baxın). Müştərilərinizdən lazımi razılığı almaq sizin vəzifənizdir.",
        ],
      },
      {
        title: "9. AI cavabları",
        paras: [
          "Pani sizin verdiyiniz qiymət, cədvəl və qaydalara əsasən cavab hazırlayır, lakin səhv edə bilər. AI-nin müştərilərinizə göndərdiyi cavablara görə biznes kimi siz cavabdehsiniz; vacib suallar üçün operatora ötürməni açıq saxlamağı tövsiyə edirik.",
        ],
      },
      {
        title: "10. Mövcudluq və məsuliyyət",
        paras: [
          "Xidmətin fasiləsiz işləməsi üçün ağlabatan tədbirlər görürük, lakin üçüncü tərəf provayderlərin (Meta, Telegram, hostinq) nasazlıqlarına görə cavabdeh deyilik. Qanunun icazə verdiyi həddə bizim ümumi məsuliyyətimiz iddiadan əvvəlki 3 ayda ödədiyiniz məbləğlə məhdudlaşır.",
        ],
      },
      {
        title: "11. Tətbiq olunan hüquq",
        paras: [
          "Bu şərtlərə Azərbaycan Respublikasının qanunvericiliyi tətbiq olunur. Mübahisələr əvvəlcə danışıqlar yolu ilə, alınmadıqda Bakı şəhərinin məhkəmələrində həll edilir.",
        ],
      },
      {
        title: "12. Dəyişikliklər və əlaqə",
        paras: [
          "Şərtlərdəki əsaslı dəyişikliklər barədə ən azı 14 gün əvvəl xəbər veririk. Suallar və rəsmi bildirişlər üçün: {{privacyEmail}}.",
        ],
      },
    ],
  },
  "data-deletion": {
    title: "Məlumatların silinməsi",
    subtitle: "Hesabınızı və məlumatlarınızı necə sildirə bilərsiniz.",
    updated: `Son yenilənmə: ${LEGAL_UPDATED.az}`,
    sections: [
      {
        title: "1. Hesabı və məlumatları silmək",
        paras: [
          "Hesabınızın email ünvanından {{privacyEmail}} ünvanına «Hesabımı silin» mövzusu ilə yazın və ya saytdakı əlaqə formasından istifadə edin. Hesabınızı, iş sahənizi və ona bağlı bütün CRM məlumatlarını 30 gün ərzində silir və bunu sizə təsdiqləyirik.",
        ],
      },
      {
        title: "2. Facebook ilə giriş etmisinizsə",
        paras: [
          "Facebook-da Ayarlar → Tətbiqlər və saytlar bölməsinə keçin və panelim.az-ı silin. Bu, Facebook-dan bizə yeni məlumat ötürülməsini dayandırır. Bizdə saxlanan məlumatların silinməsi üçün yuxarıdakı qaydada sorğu göndərin.",
        ],
      },
      {
        title: "3. Google ilə giriş etmisinizsə",
        paras: [
          "Google hesabınızda Təhlükəsizlik → Üçüncü tərəf tətbiqləri bölməsindən panelim.az-ın girişini ləğv edin, sonra yuxarıdakı qaydada silinmə sorğusu göndərin.",
        ],
      },
      {
        title: "4. Bir biznesin müştərisisinizsə",
        paras: [
          "Sizə panelim.az vasitəsilə yazan biznesə müraciət edin; onlar məlumatlarınızı iş sahəsindən silə bilər. Biznesə çata bilmirsinizsə, {{privacyEmail}} ünvanına yazın, kömək edək.",
        ],
      },
    ],
  },
};

const EN: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "What we collect, why we use it, and your rights.",
    updated: `Last updated: ${LEGAL_UPDATED.en}`,
    sections: [
      {
        title: "1. Who processes your data",
        paras: [
          "panelim.az is operated by {{legalName}} (tax ID {{taxId}}, address: {{address}}). “We” in this policy means that company.",
          "For any privacy request: {{privacyEmail}}.",
        ],
      },
      {
        title: "2. Our two roles",
        paras: [
          "We are the controller of your panelim.az account data and of what you send through forms on this site.",
          "For your business's customer conversations, contacts and deals, you are the controller and we process that data on your instructions only.",
        ],
      },
      {
        title: "3. What we collect",
        paras: [
          "Account: name, email, a hash of your password (never the password itself), workspace name and sector.",
          "Google or Facebook sign-in: the name, email and user ID that service shares with us. We do not request friends, posts or other data.",
          "Your CRM data: messages from the WhatsApp, Instagram, Messenger and Telegram channels you connect, customer names, phone numbers, notes, tasks and bookings.",
          "Site forms: the name, phone, email and message you enter for a demo or contact request.",
          "Technical data: IP address, browser type, pages visited and error logs.",
        ],
      },
      {
        title: "4. Purpose and legal basis",
        paras: [
          "To provide the service and perform our contract: running your account, delivering messages, taking payments.",
          "Legitimate interest: security, abuse prevention and fixing errors.",
          "Consent: analytics and advertising cookies load only when you choose “Accept all”.",
        ],
      },
      {
        title: "5. Cookies",
        paras: [
          "Essential cookies keep sign-in and security working and cannot be switched off.",
          "Analytics and advertising cookies (Google Analytics, Meta Pixel and similar) load only with your consent. To change your choice, clear this site's data in your browser and the banner will return.",
        ],
      },
      {
        title: "6. Services we share data with",
        paras: [
          "We never sell data or share it for advertising. We use these providers to run the service: Vercel (hosting), Neon (database), Meta (WhatsApp, Instagram, Messenger), Telegram, Google and Facebook (sign-in), Paycell (payments), an email delivery service, an error-monitoring service and, when Pani is on, an AI model provider.",
          "The AI provider receives only the part of a conversation and the business facts you approved that it needs to draft a reply.",
        ],
      },
      {
        title: "7. Where data is stored",
        paras: ["Our servers are in the United States (Vercel and Neon, us-east-1). Data is encrypted in transit and at rest."],
      },
      {
        title: "8. Retention",
        paras: [
          "We keep data while your account is active. After an account is deleted its data is removed within 30 days, and from backups within the next backup cycle.",
          "Payment records that the law requires us to keep are kept for the period the law sets.",
        ],
      },
      {
        title: "9. Your rights",
        paras: [
          "Under the Law of the Republic of Azerbaijan on Personal Data you may access, correct and delete your data and object to its processing. Send requests to {{privacyEmail}}; we reply within 30 days.",
          "If you are a customer of a business that uses panelim.az, contact that business first; we will help them.",
        ],
      },
      {
        title: "10. Data deletion",
        paras: ["How to delete your account and data, including if you signed in with Google or Facebook: {{siteUrl}}/en/legal/data-deletion."],
      },
      {
        title: "11. Security",
        paras: [
          "Each workspace's data is separated at the database level, passwords are hashed and sign-in attempts are rate limited. If we find a breach we tell the affected users.",
        ],
      },
      { title: "12. Children", paras: ["The service is not meant for anyone under 18."] },
      {
        title: "13. Changes",
        paras: ["If we change this policy we publish the new text here and give account owners advance notice of material changes."],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Rules for using panelim.az, payment and cancellation terms.",
    updated: `Last updated: ${LEGAL_UPDATED.en}`,
    sections: [
      {
        title: "1. Parties",
        paras: [
          "These terms are a contract between {{legalName}} (tax ID {{taxId}}, address: {{address}}) and the person or business that opens a panelim.az account. By opening an account or using the service you accept them.",
        ],
      },
      {
        title: "2. The service",
        paras: [
          "panelim.az is a CRM that gathers enquiries from messaging channels into one inbox and helps you manage pipeline stages, tasks and bookings. The Pani AI assistant drafts replies within the rules and facts you set.",
        ],
      },
      {
        title: "3. Your account",
        paras: [
          "You are responsible for accurate account details and for keeping sign-in details private. Actions by team members in your workspace are made under your account.",
        ],
      },
      {
        title: "4. Free trial",
        paras: [
          `A new workspace starts with a ${TRIAL_DAYS}-day free trial. If no paid plan is chosen when it ends, the workspace becomes read-only: you can view and export your data but cannot send messages or make changes. Data is kept for at least 30 days after the trial.`,
        ],
      },
      {
        title: "5. Prices and payment",
        paras: [
          "Prices are shown in AZN on the pricing page. You pay in advance for a monthly, 6-month or yearly term; on 6-month and yearly plans the monthly figure shown is the term total divided by its months.",
          `Growth and Pro plans carry a one-time setup fee of ${PLAN_SETUP_FEE_AZN.growth} AZN.`,
          "WhatsApp Cloud API message fees are set by Meta and are not included.",
          "When a term ends, the next term must be paid for the service to continue.",
        ],
      },
      {
        title: "6. Cancellation and refunds",
        paras: [
          "You can cancel at any time; the service keeps working until the end of the paid term.",
          "If you cancel within 14 days of your first payment, the subscription fee is refunded in full. The setup fee is not refunded once setup work has started. Unused parts of later terms are not refunded.",
        ],
      },
      {
        title: "7. Acceptable use",
        paras: [
          "Spam, bulk advertising to people who have not opted in, illegal content, deception and anything that infringes others' rights are forbidden. You are responsible for following Meta, WhatsApp and Telegram platform rules. We may suspend a workspace that breaks these rules.",
        ],
      },
      {
        title: "8. Your data",
        paras: [
          "Customer data in your workspace belongs to you. We process it only to provide the service (see the Privacy Policy). Getting the consent your customers must give is your responsibility.",
        ],
      },
      {
        title: "9. AI replies",
        paras: [
          "Pani drafts replies from the prices, schedules and rules you provide, but it can make mistakes. As the business, you are responsible for replies the AI sends to your customers; we recommend keeping operator handoff on for important questions.",
        ],
      },
      {
        title: "10. Availability and liability",
        paras: [
          "We take reasonable steps to keep the service running but are not liable for outages of third-party providers (Meta, Telegram, hosting). To the extent the law allows, our total liability is limited to what you paid in the 3 months before the claim.",
        ],
      },
      {
        title: "11. Governing law",
        paras: [
          "These terms are governed by the laws of the Republic of Azerbaijan. Disputes are first settled by negotiation and otherwise by the courts of Baku.",
        ],
      },
      {
        title: "12. Changes and contact",
        paras: ["We give at least 14 days' notice of material changes to these terms. Questions and formal notices: {{privacyEmail}}."],
      },
    ],
  },
  "data-deletion": {
    title: "Data deletion",
    subtitle: "How to have your account and data deleted.",
    updated: `Last updated: ${LEGAL_UPDATED.en}`,
    sections: [
      {
        title: "1. Delete your account and data",
        paras: [
          "Email {{privacyEmail}} from your account's email address with the subject “Delete my account”, or use the contact form on this site. We delete your account, workspace and all CRM data linked to it within 30 days and confirm to you when it is done.",
        ],
      },
      {
        title: "2. If you signed in with Facebook",
        paras: [
          "In Facebook go to Settings → Apps and websites and remove panelim.az. That stops Facebook sharing any new data with us. To delete the data we already hold, send a request as described above.",
        ],
      },
      {
        title: "3. If you signed in with Google",
        paras: [
          "In your Google Account go to Security → Third-party apps and remove panelim.az's access, then send a deletion request as described above.",
        ],
      },
      {
        title: "4. If you are a customer of a business",
        paras: [
          "Contact the business that messaged you through panelim.az; they can delete your data from their workspace. If you cannot reach them, write to {{privacyEmail}} and we will help.",
        ],
      },
    ],
  },
};

export function getLegalDoc(kind: LegalKind, locale: "az" | "en"): LegalDoc {
  return (locale === "en" ? EN : AZ)[kind];
}

export type LegalPart = { text: string } | { missing: string };

/** Split a paragraph into text and token parts, filling tokens from `values`. */
export function fillLegalTokens(
  para: string,
  values: Partial<Record<LegalToken, string | null>>,
  locale: "az" | "en",
): LegalPart[] {
  const out: LegalPart[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let last = 0;
  for (let m = re.exec(para); m; m = re.exec(para)) {
    if (m.index > last) out.push({ text: para.slice(last, m.index) });
    const key = m[1] as LegalToken;
    const v = values[key];
    if (v) out.push({ text: v });
    else out.push({ missing: LEGAL_TOKEN_LABELS[locale][key] ?? key });
    last = m.index + m[0].length;
  }
  if (last < para.length) out.push({ text: para.slice(last) });
  return out;
}
