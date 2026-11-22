import type { Locale } from "@/app/[lang]/dictionaries";

export const SECTOR_SLUGS = [
  "language-courses",
  "exam-prep",
  "it-courses",
  "kids-centers",
] as const;
export type SectorSlug = (typeof SECTOR_SLUGS)[number];

const SECTOR_SLUG_SET: ReadonlySet<string> = new Set(SECTOR_SLUGS);

export function isSectorSlug(slug: string): slug is SectorSlug {
  return SECTOR_SLUG_SET.has(slug);
}

type Item = { title: string; desc: string };

export type SectorCopy = {
  navLabel: string;
  title: string;
  subtitle: string;
  challengesTitle: string;
  challenges: [Item, Item, Item];
  workflowTitle: string;
  workflow: [Item, Item, Item];
  detailTitle: string;
  detailBody: string;
  detailBullets: string[];
};

export type SectorContent = {
  image: string;
  copy: Record<Locale, SectorCopy>;
};

export const SECTOR_UI: Record<Locale, { badge: string; disclaimer: string; moreTitle: string }> = {
  az: {
    badge: "Sektor ssenarisi",
    disclaimer:
      "Bu səhifə nümunə iş axınıdır. Real müştəri adı, rəy və ya nəticə rəqəmi göstərilmir.",
    moreTitle: "Digər sektorlar",
  },
  en: {
    badge: "Industry scenario",
    disclaimer:
      "This page shows a sample workflow. No real customer names, reviews or result figures are shown.",
    moreTitle: "Other industries",
  },
};

export const SECTORS: Record<SectorSlug, SectorContent> = {
  "language-courses": {
    image: "w-classroom-dusk",
    copy: {
      az: {
        navLabel: "Dil kursları",
        title: "Dil kursları üçün WhatsApp və Instagram qeydiyyatı",
        subtitle:
          "Səviyyə sualı, sınaq dərsi və qrupa yazılma bir mesaj axınında: boş yerə görə təklif, təkrar qeydiyyatın qarşısı.",
        challengesTitle: "Dil kurslarında tez-tez rast gəlinən problemlər",
        challenges: [
          { title: "Qiymət və qrafik sualları", desc: "Eyni suallar hər gün təkrarlanır və cavab gecikəndə müraciət soyuyur." },
          { title: "Səviyyə və qrup uyğunsuzluğu", desc: "Səviyyəsi bilinməyən şəxs səhv qrupa yazılır, qrup dolur və ya boş qalır." },
          { title: "Sınaq dərsindən sonra əlaqənin kəsilməsi", desc: "Sınaq dərsinə gələnə vaxtında yazılmadıqda qeydiyyat tamamlanmır." },
        ],
        workflowTitle: "panelim.az ilə qeydiyyat axını",
        workflow: [
          { title: "İlkin cavab və səviyyə sualı", desc: "AI hansı dili, hansı məqsədlə öyrənmək istədiyini soruşur və uyğun qrupları göstərir." },
          { title: "Boş yerin ayrılması", desc: "Qrupda boş yer varsa nömrə təsdiqlənir və yer təkrar yazılmadan ayrılır." },
          { title: "Xatırlatma və növbəti addım", desc: "Dərsdən əvvəl xatırlatma gedir, sınaqdan sonra menecer üçün tapşırıq yaranır." },
        ],
        detailTitle: "Qrup tutumuna nəzarət",
        detailBody: "Hər qrup üçün yer sayı saxlanılır. Son yer eyni anda iki nəfərə verilmir.",
        detailBullets: ["Səviyyə və dil üzrə qruplar", "Sınaq dərsi üçün ayrıca vaxt", "Müraciətin mənbəyi (Instagram, WhatsApp, sayt)"],
      },
      en: {
        navLabel: "Language courses",
        title: "WhatsApp and Instagram enrollment for language courses",
        subtitle:
          "Level questions, trial lessons and group sign-up in one message flow: offers based on free seats, no duplicate enrollments.",
        challengesTitle: "Common problems at language schools",
        challenges: [
          { title: "Repeated price and schedule questions", desc: "The same questions arrive daily, and slow replies let leads go cold." },
          { title: "Level and group mismatch", desc: "Without knowing the level, people join the wrong group and seats go unused." },
          { title: "Silence after the trial lesson", desc: "Trial attendees who are not followed up with rarely finish enrolling." },
        ],
        workflowTitle: "Enrollment flow with panelim.az",
        workflow: [
          { title: "First reply and level question", desc: "The AI asks which language and goal, then shows matching groups." },
          { title: "Seat reservation", desc: "If the group has room, the phone number is verified and the seat is held without duplicates." },
          { title: "Reminder and next step", desc: "A reminder goes out before class, and a follow-up task is created for the manager after the trial." },
        ],
        detailTitle: "Group capacity control",
        detailBody: "Seat counts are kept per group. The last seat is never given to two people at once.",
        detailBullets: ["Groups by language and level", "Separate trial lesson slots", "Lead source (Instagram, WhatsApp, website)"],
      },
    },
  },
  "exam-prep": {
    image: "s-courses",
    copy: {
      az: {
        navLabel: "İmtahana hazırlıq",
        title: "İmtahana hazırlıq mərkəzləri üçün müraciət idarəsi",
        subtitle:
          "Valideyn və şagirdin suallarına cavab, sınaq imtahanına yazılma və qrup yerlərinin izlənməsi bir paneldə.",
        challengesTitle: "Hazırlıq mərkəzlərində ən çox rast gəlinən problemlər",
        challenges: [
          { title: "Mövsümi müraciət yükü", desc: "Qəbul dövründə mesaj sayı artır və komanda hamısına çatmır." },
          { title: "Valideynlə şagird arasında qarışıqlıq", desc: "Kim yazıb, kim iştirak edəcək bilinmir, məlumat təkrar toplanır." },
          { title: "Sınaq imtahanında yer çatışmazlığı", desc: "Yer sayı əl ilə izlənəndə artıq qeydiyyat olur." },
        ],
        workflowTitle: "Müraciətdən qeydiyyata",
        workflow: [
          { title: "Məlumatın toplanması", desc: "Sinif, fənn və əlaqə nömrəsi söhbət içində toplanır və kartda saxlanılır." },
          { title: "Sınaq imtahanına yer", desc: "Yer sayı məhduddur: dolu seansa qeydiyyat qəbul edilmir, alternativ vaxt təklif olunur." },
          { title: "Komanda üçün bildiriş", desc: "Yeni müraciət və ya sınaq nəticəsi sonrası əlaqə tapşırığı menecerə düşür." },
        ],
        detailTitle: "Məlumat bir kartda",
        detailBody: "Hər müraciət üçün söhbət tarixçəsi, qeydlər və tapşırıqlar eyni kartda görünür.",
        detailBullets: ["Sinif və fənn məlumatı", "Qeyd və tapşırıqlar", "Mərhələlər: yeni, əlaqə, sınaq, ödəniş"],
      },
      en: {
        navLabel: "Exam prep",
        title: "Inquiry management for exam-preparation centers",
        subtitle:
          "Answer parents and students, book mock exams and track group seats in one panel.",
        challengesTitle: "Common problems at prep centers",
        challenges: [
          { title: "Seasonal inquiry spikes", desc: "Message volume jumps during admission season and the team cannot reach everyone." },
          { title: "Parent and student confusion", desc: "It is unclear who wrote and who will attend, so details are collected twice." },
          { title: "Mock exam overbooking", desc: "Tracking seats by hand leads to more sign-ups than places." },
        ],
        workflowTitle: "From inquiry to enrollment",
        workflow: [
          { title: "Collect details", desc: "Grade, subject and contact number are collected in the chat and saved on the card." },
          { title: "Mock exam seat", desc: "Seats are limited: a full session rejects new sign-ups and offers another time." },
          { title: "Team notification", desc: "A new inquiry or a post-mock follow-up task lands with the manager." },
        ],
        detailTitle: "Everything on one card",
        detailBody: "Chat history, notes and tasks for each inquiry appear on the same card.",
        detailBullets: ["Grade and subject", "Notes and tasks", "Stages: new, contacted, trial, paid"],
      },
    },
  },
  "it-courses": {
    image: "p-product-tour",
    copy: {
      az: {
        navLabel: "IT kursları",
        title: "IT kursları və bootcamp-lar üçün qeydiyyat avtomatlaşdırması",
        subtitle:
          "Kurs, vaxt və format (onlayn/oflayn) üzrə suallara cavab, tanışlıq dərsinə yazılma və axının izlənməsi.",
        challengesTitle: "IT kurslarında tez-tez rast gəlinən problemlər",
        challenges: [
          { title: "Çoxlu istiqamət və format", desc: "Frontend, data, dizayn, onlayn və ya oflayn: sual çoxdur, cavab hər dəfə əl ilə yazılır." },
          { title: "Tanışlıq dərsinə gəlməyənlər", desc: "Yazılan şəxs xatırlatma olmadan gəlmir." },
          { title: "Qrup başlama tarixinə uyğunlaşma", desc: "Qrup dolmayınca başlamır, gözləmə siyahısı idarə olunmur." },
        ],
        workflowTitle: "Axın necə işləyir",
        workflow: [
          { title: "İstiqamət seçimi", desc: "AI maraq dairəsinə görə kursu və yaxın qrupu təklif edir." },
          { title: "Tanışlıq dərsinə yazılma", desc: "Yer ayrılır, təkrar qeydiyyat bloklanır, xatırlatma göndərilir." },
          { title: "Qrup doluluğu", desc: "Qrup üzrə yer sayı panelində görünür, menecer hansı qrupun başlayacağını izləyir." },
        ],
        detailTitle: "Kanal və n8n inteqrasiyası",
        detailBody: "Bildirişləri və xarici sistemləri n8n iş axınları və API vasitəsilə bağlaya bilərsiniz.",
        detailBullets: ["WhatsApp, Instagram, Telegram", "REST webhook", "n8n şablonları"],
      },
      en: {
        navLabel: "IT courses",
        title: "Enrollment automation for IT courses and bootcamps",
        subtitle:
          "Answer course, schedule and format (online/offline) questions, book intro sessions and track the pipeline.",
        challengesTitle: "Common problems at IT schools",
        challenges: [
          { title: "Many tracks and formats", desc: "Frontend, data, design, online or offline: many questions, each answered by hand." },
          { title: "No-shows at intro sessions", desc: "People who sign up often do not attend without a reminder." },
          { title: "Waiting for the group to fill", desc: "A group will not start until full, and the waiting list is unmanaged." },
        ],
        workflowTitle: "How the flow works",
        workflow: [
          { title: "Pick a track", desc: "The AI suggests a course and the nearest group based on interests." },
          { title: "Intro session sign-up", desc: "The seat is held, duplicates are blocked and a reminder is sent." },
          { title: "Group fill level", desc: "Seats per group show in the panel so the manager can see which group will start." },
        ],
        detailTitle: "Channels and n8n integration",
        detailBody: "Connect notifications and external systems through n8n workflows and the API.",
        detailBullets: ["WhatsApp, Instagram, Telegram", "REST webhook", "n8n templates"],
      },
    },
  },
  "kids-centers": {
    image: "p-booking",
    copy: {
      az: {
        navLabel: "Uşaq mərkəzləri",
        title: "Uşaq inkişaf və dərnək mərkəzləri üçün qeydiyyat",
        subtitle:
          "Valideynlərin yaş qrupu, cədvəl və qiymət suallarına cavab, sınaq dərsi və dərnək yerlərinin idarəsi.",
        challengesTitle: "Uşaq mərkəzlərində tez-tez rast gəlinən problemlər",
        challenges: [
          { title: "Yaş qrupu üzrə suallar", desc: "Valideynlər uşağın yaşına uyğun qrupu soruşur və cavabı gözləməyə təəccüb edir." },
          { title: "Kiçik qruplarda yer idarəsi", desc: "Qruplar kiçikdir, bir yer səhv verilsə narazılıq yaranır." },
          { title: "Dərs xatırlatmaları", desc: "Sınaq dərsi, ödəniş və buraxılan dərsdən sonra bildiriş əl ilə göndərilir." },
        ],
        workflowTitle: "Valideyn üçün sadə axın",
        workflow: [
          { title: "Yaşa görə qrup təklifi", desc: "Uşağın yaşı soruşulur, uyğun dərnək və boş saatlar göstərilir." },
          { title: "Sınaq dərsinə yazılma", desc: "Valideynin nömrəsi təsdiqlənir və yer ayrılır." },
          { title: "Xatırlatma və əlaqə", desc: "Dərsdən əvvəl xatırlatma gedir, sonra menecer valideynlə əlaqə saxlayır." },
        ],
        detailTitle: "Məxfilik",
        detailBody: "Uşaqlara aid məlumat yalnız zəruri sahələrlə (ad, yaş, valideyn nömrəsi) saxlanılır və kiracı üzrə ayrılır.",
        detailBullets: ["Yalnız lazımi məlumat", "Mərkəz üzrə ayrılmış məlumat", "Komanda üzvü rolları"],
      },
      en: {
        navLabel: "Kids centers",
        title: "Enrollment for child development and activity centers",
        subtitle:
          "Answer parents' questions on age groups, schedule and price, then manage trial lessons and club seats.",
        challengesTitle: "Common problems at kids centers",
        challenges: [
          { title: "Age-group questions", desc: "Parents ask which group fits their child and expect a quick answer." },
          { title: "Seat control in small groups", desc: "Groups are small, and one wrongly given seat causes frustration." },
          { title: "Class reminders", desc: "Trial lessons, payments and missed-class notices are sent by hand." },
        ],
        workflowTitle: "A simple flow for parents",
        workflow: [
          { title: "Group by age", desc: "The child's age is asked, and matching clubs and free slots are shown." },
          { title: "Trial lesson sign-up", desc: "The parent's number is verified and a seat is held." },
          { title: "Reminder and follow-up", desc: "A reminder goes out before class, and the manager follows up with the parent afterwards." },
        ],
        detailTitle: "Privacy",
        detailBody: "Child-related data is limited to necessary fields (name, age, parent's number) and kept separate per tenant.",
        detailBullets: ["Only necessary data", "Data separated per center", "Team member roles"],
      },
    },
  },
};
