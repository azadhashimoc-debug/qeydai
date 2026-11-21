/** Localized copy for the interactive Pani preview. Keep all translations here. */
type Scene = {
  name: string;
  headline: string;
  detail: string;
  customer: string;
  service: string;
  chat: { who: "customer" | "agent"; message: string }[];
};

export const CONTENT = {
  az: {
    showcase: "Pani iş başında",
    sample: "İnteraktiv nümayiş · real müştəri məlumatı deyil",
    repeat: "Yenidən göstər",
    sidebar: ["İcmal", "Mesajlar", "Satışlar", "Təqvim", "Analitika"],
    tabs: [
      { name: "Cəlb et", headline: "Hər mesaj yeni fürsətdir", detail: "Bütün müraciətlər bir yerdə toplanır." },
      { name: "Avtomatlaşdır", headline: "AI cavab verir, görüş yaranır", detail: "Müştəri yazır, Pani təqvimi yoxlayır." },
      { name: "Böyüt", headline: "Satışları nəzarətdə saxlayın", detail: "Müştərilər satış mərhələləri üzrə irəliləyir." },
      { name: "Təhlil et", headline: "Nəticələri aydın görün", detail: "Hansının daha yaxşı işlədiyini anlayın." },
    ],
    scenes: [
      {
        name: "Yeni müraciət", headline: "Bütün mesajlar bir yerdə", detail: "Yeni müştəri kartı avtomatik görünür.",
        customer: "Aysel Məmmədova", service: "Instagram",
        chat: [
          { who: "customer", message: "Salam! Məhsul haqqında məlumat ala bilərəm?" },
          { who: "agent", message: "Salam! Əlbəttə, sizə kömək edim. 🌿" },
          { who: "customer", message: "Çatdırılma da var?" },
        ],
      },
      {
        name: "Avtomatik rezervasiya", headline: "AI təqvimi yoxlayır", detail: "Boş vaxt seçilir və görüş yaradılır.",
        customer: "Nərmin Əliyeva", service: "WhatsApp",
        chat: [
          { who: "customer", message: "Salam, sabah saat 15:00-a yer var?" },
          { who: "agent", message: "Salam! Bir dəqiqə, təqvimi yoxlayıram. ✨" },
          { who: "agent", message: "Bəli, saat 15:00 boşdur. Görüşünüzü qeyd etdim! ✅" },
        ],
      },
      {
        name: "Satışın idarəsi", headline: "Müraciətdən satışa", detail: "Satış kartı növbəti mərhələyə keçir.",
        customer: "Elvin Qasımov", service: "Telegram",
        chat: [
          { who: "customer", message: "Salam, bu dəsti sifariş etmək istəyirəm." },
          { who: "agent", message: "Əla! Sifariş məlumatlarını dəqiqləşdirək." },
          { who: "customer", message: "Təsdiq edirəm, təşəkkürlər!" },
        ],
      },
      {
        name: "Satış hesabatı", headline: "Hər nəticə göz önündə", detail: "Mesajlardan satışa gedən yolu izləyin.",
        customer: "Pani", service: "AI xülasəsi",
        chat: [
          { who: "agent", message: "Bu həftə ən çox müraciət WhatsApp-dan gəlib." },
          { who: "agent", message: "24 yeni müraciət və 8 tamamlanmış satış var." },
          { who: "agent", message: "Tövsiyə: cavabsız müraciətləri izləyin." },
        ],
      },
    ] satisfies Scene[],
    previewLeads: ["Kamran Hüseynov", "Lalə Rzayeva"],
    responseTime: "2 dəq",
    newly: "Yeni müraciətlər",
    captured: "Yeni müştəri əlavə edildi",
    incoming: "Yeni mesaj",
    created: "Yeni müştəri kartı",
    open: "Müştəri profili",
    booking: "Rezervasiyalar",
    days: ["B.e.", "Ç.a.", "Ç.", "C.a.", "C."],
    booked: "Görüş təsdiqləndi",
    consultation: "Müştəri görüşü",
    stages: ["Yeni", "Danışıqda", "Tamamlandı"],
    deal: "Yeni sifariş",
    won: "Satış tamamlandı",
    metrics: ["Yeni müraciətlər", "Tamamlanan satışlar", "Cavab sürəti"],
    insight: "AI tövsiyəsi",
    chart: "Kanallar üzrə müraciətlər",
    viewLabel: "Nümunə",
    typing: "Pani yazır",
    online: "Onlayn",
    catalog: "Məhsul kataloqu",
    product: "Gündəlik baxım dəsti",
    productPrice: "149 AZN",
    order: "Məhsul seçildi",
    guide: "Baxın, Pani bunu avtomatik edir",
    demo: "Nümayiş",
  },
  en: {
    showcase: "See Pani in action",
    sample: "Interactive preview · no real customer data",
    repeat: "Replay animation",
    sidebar: ["Overview", "Inbox", "Sales", "Calendar", "Analytics"],
    tabs: [
      { name: "Capture", headline: "Every message is an opportunity", detail: "Keep every inquiry in one place." },
      { name: "Automate", headline: "AI replies, bookings appear", detail: "A customer asks and Pani checks the calendar." },
      { name: "Grow", headline: "Stay on top of sales", detail: "Move customers through your sales stages." },
      { name: "Analyze", headline: "See every result clearly", detail: "Understand what works best." },
    ],
    scenes: [
      {
        name: "New lead", headline: "Every message in one place", detail: "A new lead appears automatically.",
        customer: "Aysel Mammadova", service: "Instagram",
        chat: [
          { who: "customer", message: "Hi! Can I ask about your products?" },
          { who: "agent", message: "Absolutely! Happy to help. 🌿" },
          { who: "customer", message: "Do you offer delivery?" },
        ],
      },
      {
        name: "Automatic booking", headline: "AI checks the calendar", detail: "An open time is selected and booked.",
        customer: "Narmin Aliyeva", service: "WhatsApp",
        chat: [
          { who: "customer", message: "Hi, is 3 pm tomorrow available?" },
          { who: "agent", message: "Let me check the calendar. ✨" },
          { who: "agent", message: "Yes, 3 pm is open. You're booked! ✅" },
        ],
      },
      {
        name: "Sales management", headline: "From message to sale", detail: "A deal moves to its next stage.",
        customer: "Elvin Gasimov", service: "Telegram",
        chat: [
          { who: "customer", message: "Hello, I'd like to order this set." },
          { who: "agent", message: "Great! Let's confirm the details." },
          { who: "customer", message: "Confirmed, thank you!" },
        ],
      },
      {
        name: "Sales report", headline: "See every outcome", detail: "Track the journey from chats to sales.",
        customer: "Pani", service: "AI summary",
        chat: [
          { who: "agent", message: "WhatsApp brought the most inquiries this week." },
          { who: "agent", message: "24 new leads and 8 completed sales." },
          { who: "agent", message: "Suggestion: follow up with unanswered leads." },
        ],
      },
    ] satisfies Scene[],
    previewLeads: ["Kamran Huseynov", "Lala Rzayeva"],
    responseTime: "2 min",
    newly: "New inquiries",
    captured: "New customer added",
    incoming: "New message",
    created: "New customer card",
    open: "Customer profile",
    booking: "Appointments",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    booked: "Booking confirmed",
    consultation: "Customer appointment",
    stages: ["New", "In progress", "Completed"],
    deal: "New order",
    won: "Sale completed",
    metrics: ["New leads", "Completed sales", "Response time"],
    insight: "AI insight",
    chart: "Leads by channel",
    viewLabel: "Preview",
    typing: "Pani is typing",
    online: "Online",
    catalog: "Product catalog",
    product: "Daily care gift set",
    productPrice: "149 AZN",
    order: "Product selected",
    guide: "See Pani handle this automatically",
    demo: "Demo",
  },
} as const;

