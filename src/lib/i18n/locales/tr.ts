import type { Dictionary } from "@/types/i18n";

export const tr: Dictionary = {
  brand: {
    name: "EduPilot",
  },
  nav: {
    dashboard: "Ana Sayfa",
    aiTools: "Yapay Zekâ Araçları",
    documents: "Belgeler",
    favorites: "Favoriler",
    history: "Geçmiş",
    settings: "Ayarlar",
  },
  sidebar: {
    promoTitle: "Zamandan tasarruf edin",
    promoDescription: "Sınıf iş akışınız için tasarlanmış tüm yapay zekâ araçlarını keşfedin.",
  },
  topbar: {
    searchPlaceholder: "EduPilot'a ne oluşturmasını istediğinizi yazın...",
    searchLabel: "Ara",
    openNavigation: "Menüyü aç",
    navigationTitle: "Gezinme",
    notifications: "Bildirimler",
    help: "Yardım ve destek",
    profile: "Profil",
    accountSettings: "Hesap ayarları",
    logout: "Çıkış yap",
  },
  commandCenter: {
    greeting: (name) => `Merhaba ${name} 👋`,
    heading: "Bugün ne oluşturmak istersiniz?",
    helperText:
      "EduPilot ile ders planı, quiz, çalışma kâğıdı, rubrik ve daha fazlasını saniyeler içinde oluşturabilirsiniz.",
    placeholder: "Ders planı, çalışma kâğıdı, quiz, rubrik veya etkinlik oluşturmasını isteyin...",
    inputLabel: "Ne oluşturmak istediğinizi yazın",
    generate: "Oluştur",
    generating: "Hazırlanıyor...",
  },
  quickPrompts: {
    lessonPlan: { label: "Ders Planı Oluştur", prompt: "Şu konu için bir ders planı oluştur: " },
    quiz: { label: "Quiz Hazırla", prompt: "Şu konu için bir quiz hazırla: " },
    worksheet: { label: "Çalışma Kâğıdı Oluştur", prompt: "Şu konu için bir çalışma kâğıdı oluştur: " },
    rubric: { label: "Rubrik Oluştur", prompt: "Şu ödev için bir değerlendirme rubriği oluştur: " },
    parentMessage: { label: "Veli Mesajı Yaz", prompt: "Şu konu hakkında bir veli mesajı yaz: " },
    classActivity: { label: "Sınıf Etkinliği Oluştur", prompt: "Şu konu için bir sınıf etkinliği oluştur: " },
  },
  quickTools: {
    title: "Hızlı Yapay Zekâ Araçları",
    description: "En sık kullandığınız araçlara hemen ulaşın.",
    seeAll: "Tümünü gör",
    quickStart: "Hızlı Başlat",
    addFavorite: (title) => `${title} aracını favorilere ekle`,
    removeFavorite: (title) => `${title} aracını favorilerden çıkar`,
    tools: {
      lessonPlanner: {
        title: "Ders Planlayıcı",
        description: "Standartlara uygun bir dersi dakikalar içinde hazırlayın.",
      },
      quizGenerator: {
        title: "Quiz Oluşturucu",
        description: "Herhangi bir konuyu sınıfta uygulamaya hazır bir quize dönüştürün.",
      },
      worksheetGenerator: {
        title: "Çalışma Kâğıdı Oluşturucu",
        description: "Seviyeye göre farklılaştırılmış çalışma kâğıtlarını anında oluşturun.",
      },
      rubricGenerator: {
        title: "Rubrik Oluşturucu",
        description: "Her ödev için net ve anlaşılır değerlendirme rubrikleri hazırlayın.",
      },
      presentationBuilder: {
        title: "Sunum Oluşturucu",
        description: "Ders notlarınızdan hızlıca bir slayt sunumu oluşturun.",
      },
      parentMessageGenerator: {
        title: "Veli Mesajı Oluşturucu",
        description: "Sıcak ve anlaşılır veli bildirimlerini birkaç saniyede yazın.",
      },
    },
  },
  continueWorking: {
    title: "Çalışmaya Devam Et",
    description: "Devam eden belgelerinizi kaldığınız yerden sürdürün.",
    viewAll: "Tümünü gör",
    continueLabel: "Devam Et",
    readyToUse: "Kullanıma hazır",
    editedPrefix: "Düzenlendi",
    statuses: {
      draft: "Taslak",
      "in-progress": "Devam Ediyor",
      ready: "Hazır",
    },
    kinds: {
      "lesson-plan": "Ders Planı",
      quiz: "Quiz",
      worksheet: "Çalışma Kâğıdı",
      rubric: "Rubrik",
      slides: "Sunum",
      letter: "Mektup",
    },
  },
  aiSuggestions: {
    title: "Bugün için öneriler",
    description: "Son etkinliklerinize göre hazırlanan akıllı öneriler.",
  },
  recentActivity: {
    title: "Son Etkinlikler",
    description: "Son zamanlarda neler olduğuna hızlı bir bakış.",
  },
};
