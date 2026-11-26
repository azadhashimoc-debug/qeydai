import type { ShowcaseTab } from "@/components/marketing/KommoTabbedShowcase";

export const INDUSTRY_SLUGS = ["clinic", "beauty", "real-estate", "retail", "education"] as const;
export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

const SLUG_SET: ReadonlySet<string> = new Set(INDUSTRY_SLUGS);
export function isIndustrySlug(slug: string): slug is IndustrySlug {
  return SLUG_SET.has(slug);
}

export type Locale = "az" | "en";

type Copy = {
  name: string;
  badge: string;
  title: string;
  subtitle: string;
  showcaseHeading: string;
  showcaseSub: string;
  tabs: ShowcaseTab[];
  steps: { title: string; desc: string }[];
};

export type Industry = {
  image: string;
  badgeVariant: "default" | "mint" | "amber";
  az: Copy;
  en: Copy;
};

const tab = (
  id: string,
  label: string,
  caption: string,
  previewTitle: string,
  previewBadge: string,
  rows: ShowcaseTab["rows"],
): ShowcaseTab => ({ id, label, caption, previewTitle, previewBadge, rows });

export const INDUSTRIES: Record<IndustrySlug, Industry> = {
  clinic: {
    image: "industry-clinic",
    badgeVariant: "mint",
    az: {
      name: "Klinikalar",
      badge: "Klinika və səhiyyə",
      title: "Klinikalar üçün vahid müraciət və qəbul CRM-i",
      subtitle:
        "WhatsApp, Instagram və Telegram-dan gələn pasiyent suallarını bir qutuda toplayın, qəbul vaxtını təyin edin və unudulmuş vizitləri azaldın.",
      showcaseHeading: "Klinika komandası üçün gündəlik iş axını",
      showcaseSub: "Resepşn, həkim və marketinq eyni müştəri tarixçəsindən istifadə edir.",
      tabs: [
        tab("reception", "Resepşn üçün", "Qiymət və vaxt suallarını cavablayın, qəbulu bir kliklə təsdiqləyin.", "QƏBUL CƏDVƏLİ", "Nümunə", [
          { title: "Aygün H.", meta: "Konsultasiya · 11:30", badge: "Təsdiqləndi", tone: "mint" },
          { title: "Elçin M.", meta: "Analiz nəticəsi sualı", badge: "Gözləyir", tone: "amber" },
        ]),
        tab("doctors", "Həkimlər üçün", "Günün qəbul siyahısı və pasiyent qeydləri bir yerdə.", "HƏKİM GÜNÜ", "Nümunə", [
          { title: "Dr. Səbinə", meta: "5 qəbul · 2 boş saat", badge: "Açıq", tone: "sky" },
          { title: "Dr. Rəşad", meta: "7 qəbul", badge: "Dolu", tone: "amber" },
        ]),
        tab("marketing", "Marketinq üçün", "Hansı kanaldan neçə müraciət gəldiyini görün.", "KANAL HESABATI", "Nümunə", [
          { title: "Instagram", meta: "müraciət → qəbul", badge: "İzlənir", tone: "mint" },
          { title: "WhatsApp", meta: "müraciət → qəbul", badge: "İzlənir", tone: "sky" },
        ]),
      ],
      steps: [
        { title: "Müraciəti tutun", desc: "Bütün kanallardan gələn mesajlar bir gələn qutusuna düşür." },
        { title: "Qəbul təyin edin", desc: "Boş saatları göstərin, təsdiq mesajını avtomatik göndərin." },
        { title: "Xatırladın", desc: "Vizitdən əvvəl xatırlatma göndərin, gəlməyənləri yenidən yazın." },
      ],
    },
    en: {
      name: "Clinics",
      badge: "Clinics & healthcare",
      title: "One window from first message to booked appointment",
      subtitle:
        "Collect patient questions from WhatsApp, Instagram and Telegram in one inbox, book visits and reduce forgotten appointments.",
      showcaseHeading: "A daily workflow for your clinic team",
      showcaseSub: "Reception, doctors and marketing share the same patient history.",
      tabs: [
        tab("reception", "For reception", "Answer price and timing questions and confirm a visit in one click.", "APPOINTMENTS", "Sample", [
          { title: "Aygun H.", meta: "Consultation · 11:30", badge: "Confirmed", tone: "mint" },
          { title: "Elchin M.", meta: "Test result question", badge: "Waiting", tone: "amber" },
        ]),
        tab("doctors", "For doctors", "Today's schedule and patient notes in one place.", "DOCTOR'S DAY", "Sample", [
          { title: "Dr. Sabina", meta: "5 visits · 2 free hours", badge: "Open", tone: "sky" },
          { title: "Dr. Rashad", meta: "7 visits", badge: "Full", tone: "amber" },
        ]),
        tab("marketing", "For marketing", "See how many enquiries each channel brings.", "CHANNEL REPORT", "Sample", [
          { title: "Instagram", meta: "enquiry → visit", badge: "Tracked", tone: "mint" },
          { title: "WhatsApp", meta: "enquiry → visit", badge: "Tracked", tone: "sky" },
        ]),
      ],
      steps: [
        { title: "Capture the enquiry", desc: "Messages from every channel land in one inbox." },
        { title: "Book the visit", desc: "Offer free slots and send the confirmation automatically." },
        { title: "Remind", desc: "Send a reminder before the visit and follow up on no-shows." },
      ],
    },
  },
  beauty: {
    image: "industry-beauty",
    badgeVariant: "amber",
    az: {
      name: "Gözəllik salonları",
      badge: "Gözəllik və spa",
      title: "Gözəllik salonları üçün mesajdan görüşə CRM",
      subtitle:
        "Instagram DM-lərdə qiymət və vaxt soruşan müştəriləri itirməyin: usta cədvəli ilə yazılışı bir yerdə idarə edin.",
      showcaseHeading: "Salon komandası üçün sadə iş axını",
      showcaseSub: "Admin, ustalar və sahibkar eyni cədvələ baxır.",
      tabs: [
        tab("admin", "Administrator üçün", "DM-dən gələn yazılışları cədvələ bir toxunuşla əlavə edin.", "YAZILIŞLAR", "Nümunə", [
          { title: "Leyla K.", meta: "Manikür · 14:00", badge: "Təsdiqləndi", tone: "mint" },
          { title: "Nərmin A.", meta: "Saç boyası · 16:30", badge: "Gözləyir", tone: "amber" },
        ]),
        tab("masters", "Ustalar üçün", "Hər ustanın gününü və boş saatlarını görün.", "USTA CƏDVƏLİ", "Nümunə", [
          { title: "Usta Aytən", meta: "6 yazılış", badge: "Dolu", tone: "amber" },
          { title: "Usta Günel", meta: "3 boş saat", badge: "Açıq", tone: "mint" },
        ]),
        tab("owner", "Sahibkar üçün", "Hansı kanaldan müştəri gəldiyini və təkrar gəlişləri izləyin.", "HESABAT", "Nümunə", [
          { title: "Instagram", meta: "yeni müştərilər", badge: "İzlənir", tone: "sky" },
          { title: "Təkrar gəliş", meta: "aylıq", badge: "İzlənir", tone: "mint" },
        ]),
      ],
      steps: [
        { title: "DM-ə cavab verin", desc: "Qiymət və xidmət suallarına AI qaralama təklif edir, siz təsdiqləyirsiniz." },
        { title: "Yazılışı bağlayın", desc: "Vaxt seçilir, təsdiq mesajı göndərilir." },
        { title: "Geri qaytarın", desc: "Müddəti keçən müştərilərə xatırlatma yazın." },
      ],
    },
    en: {
      name: "Beauty salons",
      badge: "Beauty & spa",
      title: "Beauty Salon CRM: Turn Messages Into Bookings",
      subtitle:
        "Don't lose clients who ask for prices and times in Instagram DMs: manage bookings together with each stylist's schedule.",
      showcaseHeading: "A simple workflow for your salon team",
      showcaseSub: "Front desk, stylists and the owner look at the same schedule.",
      tabs: [
        tab("admin", "For front desk", "Add bookings from DMs to the calendar in a tap.", "BOOKINGS", "Sample", [
          { title: "Leyla K.", meta: "Manicure · 14:00", badge: "Confirmed", tone: "mint" },
          { title: "Narmin A.", meta: "Hair colour · 16:30", badge: "Waiting", tone: "amber" },
        ]),
        tab("masters", "For stylists", "See each stylist's day and free slots.", "STYLIST SCHEDULE", "Sample", [
          { title: "Stylist Ayten", meta: "6 bookings", badge: "Full", tone: "amber" },
          { title: "Stylist Gunel", meta: "3 free slots", badge: "Open", tone: "mint" },
        ]),
        tab("owner", "For owners", "Track which channel brings clients and who comes back.", "REPORT", "Sample", [
          { title: "Instagram", meta: "new clients", badge: "Tracked", tone: "sky" },
          { title: "Repeat visits", meta: "monthly", badge: "Tracked", tone: "mint" },
        ]),
      ],
      steps: [
        { title: "Reply to DMs", desc: "AI drafts answers to price and service questions, you approve." },
        { title: "Lock the booking", desc: "Pick a slot and send the confirmation." },
        { title: "Win them back", desc: "Message clients whose last visit was a while ago." },
      ],
    },
  },
  "real-estate": {
    image: "industry-realestate",
    badgeVariant: "default",
    az: {
      name: "Daşınmaz əmlak",
      badge: "Daşınmaz əmlak",
      title: "Hər elan üzrə müraciəti bir yerdə izləyin",
      subtitle:
        "Telefon, WhatsApp və Instagram-dan gələn alıcı və kirayəçi müraciətlərini mərhələlərə bölün, baxış vaxtlarını planlayın.",
      showcaseHeading: "Əmlak komandası üçün satış axını",
      showcaseSub: "Brokerlər eyni müştəri bazası və tapşırıq siyahısı ilə işləyir.",
      tabs: [
        tab("brokers", "Brokerlər üçün", "Müraciətləri mərhələlərə görə sürüşdürün.", "SATIŞ HUNİSİ", "Nümunə", [
          { title: "3 otaqlı, Nəsimi", meta: "Baxış təyin olunub", badge: "Isti", tone: "amber" },
          { title: "2 otaqlı, Yasamal", meta: "Qiymət müzakirəsi", badge: "İzlənir", tone: "sky" },
        ]),
        tab("viewings", "Baxışlar üçün", "Baxış vaxtlarını təqvimdə toqquşmadan planlayın.", "BAXIŞ TƏQVİMİ", "Nümunə", [
          { title: "Cümə · 15:00", meta: "Nəsimi mənzili", badge: "Təsdiqləndi", tone: "mint" },
          { title: "Şənbə · 11:00", meta: "Yasamal mənzili", badge: "Gözləyir", tone: "amber" },
        ]),
        tab("managers", "Rəhbər üçün", "Hansı elan mənbəyi müraciət gətirir, görün.", "MƏNBƏ HESABATI", "Nümunə", [
          { title: "Elan saytları", meta: "müraciət sayı", badge: "İzlənir", tone: "sky" },
          { title: "Instagram", meta: "müraciət sayı", badge: "İzlənir", tone: "mint" },
        ]),
      ],
      steps: [
        { title: "Müraciəti qeydə alın", desc: "Hər müraciət kartı elan və mənbə ilə birlikdə yaranır." },
        { title: "Baxış planlayın", desc: "Alıcıya uyğun vaxtlar təklif edin." },
        { title: "Bağlayın", desc: "Tapşırıq və xatırlatmalarla müqavilə mərhələsinə aparın." },
      ],
    },
    en: {
      name: "Real estate",
      badge: "Real estate",
      title: "Track enquiries for every listing in one place",
      subtitle:
        "Split buyer and tenant enquiries from phone, WhatsApp and Instagram into stages, and plan viewings.",
      showcaseHeading: "A sales flow for your agency",
      showcaseSub: "Brokers work from the same customer base and task list.",
      tabs: [
        tab("brokers", "For brokers", "Drag enquiries across stages.", "SALES FUNNEL", "Sample", [
          { title: "3-room, Nasimi", meta: "Viewing booked", badge: "Hot", tone: "amber" },
          { title: "2-room, Yasamal", meta: "Price discussion", badge: "Tracked", tone: "sky" },
        ]),
        tab("viewings", "For viewings", "Plan viewings on a calendar without clashes.", "VIEWINGS", "Sample", [
          { title: "Fri · 15:00", meta: "Nasimi flat", badge: "Confirmed", tone: "mint" },
          { title: "Sat · 11:00", meta: "Yasamal flat", badge: "Waiting", tone: "amber" },
        ]),
        tab("managers", "For managers", "See which listing source brings enquiries.", "SOURCE REPORT", "Sample", [
          { title: "Listing sites", meta: "enquiry count", badge: "Tracked", tone: "sky" },
          { title: "Instagram", meta: "enquiry count", badge: "Tracked", tone: "mint" },
        ]),
      ],
      steps: [
        { title: "Log the enquiry", desc: "Each enquiry becomes a card with its listing and source." },
        { title: "Plan the viewing", desc: "Offer the buyer slots that fit." },
        { title: "Close", desc: "Use tasks and reminders to reach the contract stage." },
      ],
    },
  },
  retail: {
    image: "industry-retail",
    badgeVariant: "amber",
    az: {
      name: "Pərakəndə",
      badge: "Pərakəndə və mağazalar",
      title: "Mağazanıza yazan hər müştərini sifarişə çevirin",
      subtitle:
        "WhatsApp və Instagram-dan gələn məhsul suallarını bir qutuda cavablayın, sifariş və təkrar alışları izləyin.",
      showcaseHeading: "Mağaza komandası üçün iş axını",
      showcaseSub: "Satıcı, anbar və sahibkar eyni sifariş siyahısını görür.",
      tabs: [
        tab("sellers", "Satıcılar üçün", "Məhsul suallarına sürətli cavab və sifariş qeydi.", "SİFARİŞLƏR", "Nümunə", [
          { title: "Kamran R.", meta: "2 məhsul · çatdırılma", badge: "Yeni", tone: "sky" },
          { title: "Aysel T.", meta: "1 məhsul · mağazadan", badge: "Hazırdır", tone: "mint" },
        ]),
        tab("stock", "Anbar üçün", "Hazırlanan və göndərilən sifarişləri ayırın.", "HAZIRLIQ", "Nümunə", [
          { title: "Hazırlanır", meta: "sifariş siyahısı", badge: "Gözləyir", tone: "amber" },
          { title: "Göndərildi", meta: "sifariş siyahısı", badge: "Tamam", tone: "mint" },
        ]),
        tab("owner", "Sahibkar üçün", "Təkrar alıcıları və kanal nəticələrini izləyin.", "HESABAT", "Nümunə", [
          { title: "Təkrar alıcılar", meta: "aylıq", badge: "İzlənir", tone: "mint" },
          { title: "Instagram", meta: "sifariş sayı", badge: "İzlənir", tone: "sky" },
        ]),
      ],
      steps: [
        { title: "Suala cavab verin", desc: "Qiymət və stok suallarına qaralama cavablar." },
        { title: "Sifarişi qeyd edin", desc: "Müştəri kartında sifariş və ünvan saxlanır." },
        { title: "Təkrar satış", desc: "Əvvəlki alıcılara yeni kolleksiya haqqında yazın." },
      ],
    },
    en: {
      name: "Retail",
      badge: "Retail & shops",
      title: "Turn every shopper who messages you into an order",
      subtitle:
        "Answer product questions from WhatsApp and Instagram in one inbox, and track orders and repeat purchases.",
      showcaseHeading: "A workflow for your shop team",
      showcaseSub: "Sales, stock and the owner see the same order list.",
      tabs: [
        tab("sellers", "For sellers", "Fast product answers and order capture.", "ORDERS", "Sample", [
          { title: "Kamran R.", meta: "2 items · delivery", badge: "New", tone: "sky" },
          { title: "Aysel T.", meta: "1 item · pickup", badge: "Ready", tone: "mint" },
        ]),
        tab("stock", "For stock", "Separate orders being prepared from those shipped.", "PREPARATION", "Sample", [
          { title: "Preparing", meta: "order list", badge: "Waiting", tone: "amber" },
          { title: "Shipped", meta: "order list", badge: "Done", tone: "mint" },
        ]),
        tab("owner", "For owners", "Track repeat buyers and channel results.", "REPORT", "Sample", [
          { title: "Repeat buyers", meta: "monthly", badge: "Tracked", tone: "mint" },
          { title: "Instagram", meta: "order count", badge: "Tracked", tone: "sky" },
        ]),
      ],
      steps: [
        { title: "Answer the question", desc: "Draft replies for price and stock questions." },
        { title: "Record the order", desc: "The customer card keeps the order and address." },
        { title: "Sell again", desc: "Message past buyers about the new collection." },
      ],
    },
  },
  education: {
    image: "industry-education",
    badgeVariant: "mint",
    az: {
      name: "Təhsil mərkəzləri",
      badge: "Təhsil və kurslar",
      title: "Kurs müraciətindən sınaq dərsinə və qeydiyyata",
      subtitle:
        "Valideyn və tələbə suallarını bir qutuda cavablayın, sınaq dərsi təyin edin və boş yerləri dolu saxlayın.",
      showcaseHeading: "Tədris mərkəzi komandası üçün axın",
      showcaseSub: "Satış, qəbul və müəllim eyni qrup cədvəli ilə işləyir.",
      tabs: [
        tab("sales", "Satış üçün", "Müraciətləri sınaq dərsi və qeydiyyat mərhələlərinə ayırın.", "QEYDİYYAT HUNİSİ", "Nümunə", [
          { title: "IELTS qrupu", meta: "6 sınaq dərsi", badge: "Aktiv", tone: "mint" },
          { title: "Riyaziyyat 9-cu sinif", meta: "3 müraciət", badge: "Yeni", tone: "sky" },
        ]),
        tab("reception", "Qəbul üçün", "Boş yerləri və qrup tutumunu görün.", "QRUP TUTUMU", "Nümunə", [
          { title: "IELTS · 18:00", meta: "2 boş yer", badge: "Açıq", tone: "mint" },
          { title: "Proqramlaşdırma · 19:30", meta: "Dolu", badge: "Dolu", tone: "amber" },
        ]),
        tab("teachers", "Müəllimlər üçün", "Sınaq dərsinə gələn tələbələrin siyahısı.", "SINAQ DƏRSİ", "Nümunə", [
          { title: "Nigar A.", meta: "Sınaq · Cümə 17:00", badge: "Təsdiqləndi", tone: "mint" },
          { title: "Rəşad M.", meta: "Sınaq · Şənbə 11:00", badge: "Gözləyir", tone: "amber" },
        ]),
      ],
      steps: [
        { title: "Müraciəti cavablayın", desc: "Kurs və qiymət suallarına AI qaralama təklif edir." },
        { title: "Sınaq dərsi təyin edin", desc: "Qrup tutumu aşılmır, təkrar qeydiyyat bloklanır." },
        { title: "Qeydiyyata gətirin", desc: "Sınaqdan sonra xatırlatma və ödəniş mərhələsi." },
      ],
    },
    en: {
      name: "Education centers",
      badge: "Education & courses",
      title: "From course enquiry to trial lesson to enrolment",
      subtitle:
        "Answer parent and student questions in one inbox, book trial lessons and keep seats filled.",
      showcaseHeading: "A flow for your learning center team",
      showcaseSub: "Sales, admissions and teachers use the same group schedule.",
      tabs: [
        tab("sales", "For sales", "Sort enquiries into trial and enrolment stages.", "ENROLMENT FUNNEL", "Sample", [
          { title: "IELTS group", meta: "6 trial lessons", badge: "Active", tone: "mint" },
          { title: "Maths grade 9", meta: "3 enquiries", badge: "New", tone: "sky" },
        ]),
        tab("reception", "For admissions", "See free seats and group capacity.", "GROUP CAPACITY", "Sample", [
          { title: "IELTS · 18:00", meta: "2 free seats", badge: "Open", tone: "mint" },
          { title: "Coding · 19:30", meta: "Full", badge: "Full", tone: "amber" },
        ]),
        tab("teachers", "For teachers", "List of students attending the trial lesson.", "TRIAL LESSON", "Sample", [
          { title: "Nigar A.", meta: "Trial · Fri 17:00", badge: "Confirmed", tone: "mint" },
          { title: "Rashad M.", meta: "Trial · Sat 11:00", badge: "Waiting", tone: "amber" },
        ]),
      ],
      steps: [
        { title: "Answer the enquiry", desc: "AI drafts replies to course and price questions." },
        { title: "Book the trial", desc: "Group capacity is never exceeded and duplicate bookings are blocked." },
        { title: "Enrol", desc: "Follow up after the trial and move to payment." },
      ],
    },
  },
};
