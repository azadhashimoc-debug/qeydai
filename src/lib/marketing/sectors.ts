import type { Locale } from "@/app/[lang]/dictionaries";

export const SECTOR_SLUGS = [
  "beauty-salons",
  "clinics",
  "auto-service",
  "real-estate",
  "retail-shops",
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
  "beauty-salons": {
    image: "p-instagram",
    copy: {
      az: {
  "navLabel": "Gözəllik salonları",
  "title": "Gözəllik salonları üçün Instagram və WhatsApp rezervasiyası",
  "subtitle": "Qiymət, usta və boş saat suallarına cavab verin, rezervasiyanı təsdiqləyin və gələn müştərini xatırladın.",
  "challengesTitle": "Salonlarda tez-tez rast gəlinən problemlər",
  "challenges": [
    {
      "title": "Direct-də itən müraciətlər",
      "desc": "Müştəri axşam yazır, səhər cavab gəlir və o artıq başqa salonu seçib."
    },
    {
      "title": "Usta və saat toqquşması",
      "desc": "Qrafik əl ilə izlənəndə eyni saata iki nəfər yazılır."
    },
    {
      "title": "Gəlməyən müştərilər",
      "desc": "Xatırlatma olmayanda rezervasiya boş qalır."
    }
  ],
  "workflowTitle": "Rezervasiya axını",
  "workflow": [
    {
      "title": "Xidmət və usta seçimi",
      "desc": "AI hansı xidmət və ustanı istədiyini soruşur, boş saatları təklif edir."
    },
    {
      "title": "Saatın ayrılması",
      "desc": "Nömrə təsdiqlənir, saat ayrılır, təkrar rezervasiya bloklanır."
    },
    {
      "title": "Xatırlatma və təkrar ziyarət",
      "desc": "Gündən əvvəl xatırlatma gedir, ziyarətdən sonra təkrar təklif üçün tapşırıq yaranır."
    }
  ],
  "detailTitle": "Usta və xidmət üzrə cədvəl",
  "detailBody": "Hər usta və xidmət üçün boş saatlar paneldə görünür.",
  "detailBullets": [
    "Usta üzrə qrafik",
    "Xidmət siyahısı və qiymətlər",
    "Instagram və WhatsApp mənbəyi"
  ]
},
      en: {
  "navLabel": "Beauty salons",
  "title": "Instagram and WhatsApp booking for beauty salons",
  "subtitle": "Answer price, stylist and availability questions, confirm bookings and remind clients before they arrive.",
  "challengesTitle": "Common problems at salons",
  "challenges": [
    {
      "title": "Inquiries lost in DMs",
      "desc": "A client writes in the evening, the answer comes next morning, and she has chosen another salon."
    },
    {
      "title": "Stylist and slot clashes",
      "desc": "Tracking the calendar by hand books two people into one slot."
    },
    {
      "title": "No-shows",
      "desc": "Without reminders, booked slots stay empty."
    }
  ],
  "workflowTitle": "Booking flow",
  "workflow": [
    {
      "title": "Pick a service and stylist",
      "desc": "The AI asks what and who, then offers free slots."
    },
    {
      "title": "Slot reserved",
      "desc": "The number is verified, the slot is held and duplicates are blocked."
    },
    {
      "title": "Reminder and rebooking",
      "desc": "A reminder goes out the day before, and a rebooking task is created after the visit."
    }
  ],
  "detailTitle": "Schedule by stylist and service",
  "detailBody": "Free slots for each stylist and service are visible in the panel.",
  "detailBullets": [
    "Schedule per stylist",
    "Service list and prices",
    "Instagram and WhatsApp source"
  ]
},
    },
  },
  "clinics": {
    image: "p-booking",
    copy: {
      az: {
  "navLabel": "Klinika və tibb mərkəzləri",
  "title": "Klinika və tibb mərkəzləri üçün qəbula yazılma",
  "subtitle": "Həkim, xidmət və vaxt suallarına cavab verin, qəbula yazılmanı idarə edin və xatırlatma göndərin.",
  "challengesTitle": "Klinikalarda tez-tez rast gəlinən problemlər",
  "challenges": [
    {
      "title": "Zəng yükü",
      "desc": "Qəbul masası eyni sualları telefonla təkrar-təkrar cavablayır."
    },
    {
      "title": "Həkim cədvəli üzrə qarışıqlıq",
      "desc": "Boş vaxtlar əl ilə yoxlandıqda səhv yazılmalar olur."
    },
    {
      "title": "Gəlməyən pasiyentlər",
      "desc": "Xatırlatma olmayanda qəbul vaxtı boş qalır."
    }
  ],
  "workflowTitle": "Qəbula yazılma axını",
  "workflow": [
    {
      "title": "Xidmət və həkim seçimi",
      "desc": "AI xidməti və həkimi müəyyən edir, boş vaxtları göstərir."
    },
    {
      "title": "Vaxtın ayrılması",
      "desc": "Nömrə təsdiqlənir və vaxt təkrar yazılmadan ayrılır."
    },
    {
      "title": "Xatırlatma",
      "desc": "Qəbuldan əvvəl xatırlatma gedir, dəyişiklik üçün cavab asanlaşır."
    }
  ],
  "detailTitle": "Məxfilik və nəzarət",
  "detailBody": "Tibbi diaqnoz və ya müayinə məlumatı AI-yə həvalə edilmir; AI yalnız yazılma, vaxt və ümumi məlumat üçündür.",
  "detailBullets": [
    "Yalnız yazılma və əlaqə məlumatı",
    "Həkim üzrə cədvəl",
    "Komanda üzvü rolları"
  ]
},
      en: {
  "navLabel": "Clinics",
  "title": "Appointment booking for clinics and medical centers",
  "subtitle": "Answer doctor, service and time questions, manage appointments and send reminders.",
  "challengesTitle": "Common problems at clinics",
  "challenges": [
    {
      "title": "Phone load",
      "desc": "The front desk answers the same questions by phone again and again."
    },
    {
      "title": "Doctor schedule confusion",
      "desc": "Checking free times by hand leads to wrong bookings."
    },
    {
      "title": "Patient no-shows",
      "desc": "Without reminders, appointment slots stay empty."
    }
  ],
  "workflowTitle": "Appointment flow",
  "workflow": [
    {
      "title": "Pick a service and doctor",
      "desc": "The AI identifies the service and doctor and shows free times."
    },
    {
      "title": "Slot reserved",
      "desc": "The number is verified and the slot is held without duplicates."
    },
    {
      "title": "Reminder",
      "desc": "A reminder goes out before the visit, and rescheduling is easy."
    }
  ],
  "detailTitle": "Privacy and control",
  "detailBody": "Diagnosis or examination data is not handed to the AI; it is only for booking, timing and general information.",
  "detailBullets": [
    "Booking and contact data only",
    "Schedule per doctor",
    "Team member roles"
  ]
},
    },
  },
  "auto-service": {
    image: "p-pipeline",
    copy: {
      az: {
  "navLabel": "Avtoservis",
  "title": "Avtoservislər üçün müraciət və növbə idarəsi",
  "subtitle": "Qiymət sorğularını, növbə yazılmasını və iş mərhələlərini bir paneldə izləyin.",
  "challengesTitle": "Avtoservislərdə tez-tez rast gəlinən problemlər",
  "challenges": [
    {
      "title": "Qiymət sorğuları",
      "desc": "Müştəri qısa mesajla qiymət soruşur, cavab gecikəndə başqa servisə gedir."
    },
    {
      "title": "Növbə və boks doluluğu",
      "desc": "Boş vaxt əl ilə izləndikdə növbələr üst-üstə düşür."
    },
    {
      "title": "İş mərhələsi barədə məlumat",
      "desc": "Müştəri avtomobilin hazır olub-olmadığını təkrar soruşur."
    }
  ],
  "workflowTitle": "Müraciətdən növbəyə",
  "workflow": [
    {
      "title": "İlkin məlumat",
      "desc": "Marka, problem və əlaqə nömrəsi söhbətdə toplanır."
    },
    {
      "title": "Növbəyə yazılma",
      "desc": "Boş vaxt təklif olunur və təsdiqlənir."
    },
    {
      "title": "Mərhələ izlənməsi",
      "desc": "Kartda mərhələ dəyişir: qəbul, iş gedir, hazırdır, ödəniş."
    }
  ],
  "detailTitle": "Mərhələli satış qıfı",
  "detailBody": "Hər avtomobil və sifariş ayrıca kartda, mərhələlərlə izlənir.",
  "detailBullets": [
    "Mərhələ lövhəsi (Kanban)",
    "Qeyd və tapşırıqlar",
    "Komanda üzvü təyinatı"
  ]
},
      en: {
  "navLabel": "Auto service",
  "title": "Inquiry and queue management for auto service shops",
  "subtitle": "Track price requests, booking slots and job stages in one panel.",
  "challengesTitle": "Common problems at auto shops",
  "challenges": [
    {
      "title": "Price requests",
      "desc": "A customer asks the price in one message and goes elsewhere if the answer is slow."
    },
    {
      "title": "Queue and bay fullness",
      "desc": "Tracking free time by hand makes bookings overlap."
    },
    {
      "title": "Job status questions",
      "desc": "Customers keep asking whether the car is ready."
    }
  ],
  "workflowTitle": "From inquiry to queue",
  "workflow": [
    {
      "title": "First details",
      "desc": "Car make, issue and contact number are collected in chat."
    },
    {
      "title": "Book a slot",
      "desc": "A free time is offered and confirmed."
    },
    {
      "title": "Stage tracking",
      "desc": "The card moves through stages: received, in progress, ready, paid."
    }
  ],
  "detailTitle": "Stage-based pipeline",
  "detailBody": "Each car and order is tracked on its own card with stages.",
  "detailBullets": [
    "Stage board (Kanban)",
    "Notes and tasks",
    "Team member assignment"
  ]
},
    },
  },
  "real-estate": {
    image: "p-inbox",
    copy: {
      az: {
  "navLabel": "Daşınmaz əmlak",
  "title": "Daşınmaz əmlak agentlikləri üçün müraciət idarəsi",
  "subtitle": "Elan üzrə gələn mesajları bir qutuda toplayın, baxışları planlaşdırın və müştəri axınını izləyin.",
  "challengesTitle": "Agentliklərdə tez-tez rast gəlinən problemlər",
  "challenges": [
    {
      "title": "Çox kanaldan gələn müraciətlər",
      "desc": "Elan saytı, Instagram və WhatsApp ayrı-ayrı yerlərdə cavabsız qalır."
    },
    {
      "title": "Baxış vaxtlarının planlanması",
      "desc": "Baxışlar əl ilə razılaşdırılır, uyğunsuzluq yaranır."
    },
    {
      "title": "Müştərinin vəziyyəti",
      "desc": "Hansı müştəri hansı mərhələdə olduğu bilinmir."
    }
  ],
  "workflowTitle": "İş axını",
  "workflow": [
    {
      "title": "Müraciətin toplanması",
      "desc": "Bütün kanallardan gələn mesajlar vahid qutuda görünür."
    },
    {
      "title": "Baxışın təyini",
      "desc": "Boş vaxt təklif olunur və baxış təsdiqlənir."
    },
    {
      "title": "Mərhələ izlənməsi",
      "desc": "Müştəri kartı mərhələlər üzrə irəliləyir, menecerə tapşırıq düşür."
    }
  ],
  "detailTitle": "Hər müştəri bir kartda",
  "detailBody": "Söhbət tarixçəsi, qeydlər və tapşırıqlar eyni kartda görünür.",
  "detailBullets": [
    "Vahid mesaj qutusu",
    "Müştəri kartı",
    "Mərhələ lövhəsi"
  ]
},
      en: {
  "navLabel": "Real estate",
  "title": "Inquiry management for real estate agencies",
  "subtitle": "Collect listing inquiries in one inbox, schedule viewings and track the client pipeline.",
  "challengesTitle": "Common problems at agencies",
  "challenges": [
    {
      "title": "Inquiries from many channels",
      "desc": "Listing sites, Instagram and WhatsApp go unanswered in separate places."
    },
    {
      "title": "Viewing scheduling",
      "desc": "Viewings are arranged by hand and clash."
    },
    {
      "title": "Client status",
      "desc": "It is unclear which client is at which stage."
    }
  ],
  "workflowTitle": "Workflow",
  "workflow": [
    {
      "title": "Collect inquiries",
      "desc": "Messages from every channel appear in one inbox."
    },
    {
      "title": "Schedule viewing",
      "desc": "A free time is offered and the viewing is confirmed."
    },
    {
      "title": "Track stages",
      "desc": "The client card moves through stages and a task goes to the manager."
    }
  ],
  "detailTitle": "One card per client",
  "detailBody": "Chat history, notes and tasks appear on the same card.",
  "detailBullets": [
    "Unified inbox",
    "Client card",
    "Stage board"
  ]
},
    },
  },
  "retail-shops": {
    image: "p-whatsapp",
    copy: {
      az: {
  "navLabel": "Mağaza və onlayn satış",
  "title": "Mağazalar və onlayn satıcılar üçün WhatsApp və Instagram satışı",
  "subtitle": "Sifariş, qiymət və stok suallarına cavab verin, müraciətləri satışa çevirin və müştəri tarixçəsini saxlayın.",
  "challengesTitle": "Mağazalarda tez-tez rast gəlinən problemlər",
  "challenges": [
    {
      "title": "Eyni suallar",
      "desc": "“Qiyməti nədir, var?” kimi suallar hər gün yüzlərlə dəfə təkrarlanır."
    },
    {
      "title": "Mesaj kanalları",
      "desc": "Instagram, WhatsApp və Telegram ayrı-ayrı telefonlarda idarə olunur."
    },
    {
      "title": "Sifarişin itməsi",
      "desc": "Müştəri yazır, sifariş yazılmır və ya unudulur."
    }
  ],
  "workflowTitle": "Satış axını",
  "workflow": [
    {
      "title": "Sualın cavablanması",
      "desc": "AI yalnız sizin təsdiqlədiyiniz məhsul və qiymət məlumatı ilə cavab verir."
    },
    {
      "title": "Sifarişin qeydi",
      "desc": "Ad, nömrə və sifariş kartda saxlanılır."
    },
    {
      "title": "Növbəti addım",
      "desc": "Menecerə tapşırıq düşür, müştəriyə təsdiq mesajı gedir."
    }
  ],
  "detailTitle": "Kanallar bir yerdə",
  "detailBody": "WhatsApp, Instagram və Telegram mesajları vahid qutuda toplanır.",
  "detailBullets": [
    "Vahid mesaj qutusu",
    "Müştəri kartı",
    "Broadcast və n8n şablonları"
  ]
},
      en: {
  "navLabel": "Retail and online sellers",
  "title": "WhatsApp and Instagram sales for shops and online sellers",
  "subtitle": "Answer order, price and stock questions, turn inquiries into sales and keep customer history.",
  "challengesTitle": "Common problems at shops",
  "challenges": [
    {
      "title": "The same questions",
      "desc": "“What is the price, is it in stock?” repeats hundreds of times a day."
    },
    {
      "title": "Message channels",
      "desc": "Instagram, WhatsApp and Telegram are handled on separate phones."
    },
    {
      "title": "Lost orders",
      "desc": "A customer writes and the order is not recorded or is forgotten."
    }
  ],
  "workflowTitle": "Sales flow",
  "workflow": [
    {
      "title": "Answer the question",
      "desc": "The AI replies only with product and price data you approved."
    },
    {
      "title": "Record the order",
      "desc": "Name, number and order are stored on the card."
    },
    {
      "title": "Next step",
      "desc": "A task goes to the manager and a confirmation goes to the customer."
    }
  ],
  "detailTitle": "All channels in one place",
  "detailBody": "WhatsApp, Instagram and Telegram messages are collected in one inbox.",
  "detailBullets": [
    "Unified inbox",
    "Customer card",
    "n8n templates"
  ]
},
    },
  },
};
