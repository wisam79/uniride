export function formatIQD(amount: number | string): string {
  return Number(amount).toLocaleString("ar-IQ") + " د.ع";
}

export const BAGHDAD_AREAS = [
  "الكرادة", "المنصور", "الزعفرانية", "البياع", "الدورة",
  "الحارثية", "اليرموك", "شمال بغداد", "الأعظمية", "الكاظمية",
  "الدوحة", "القاهرة", "السيدية", "أبو غريب", "المحمودية",
];

export const IRAQI_UNIVERSITIES = [
  { id: "uob", name: "جامعة بغداد" },
  { id: "uot", name: "الجامعة التكنولوجية" },
  { id: "uom", name: "جامعة المستنصرية" },
  { id: "uoi", name: "الجامعة العراقية" },
  { id: "nou", name: "الجامعة الوطنية" },
  { id: "uok", name: "جامعة الكرخ" },
  { id: "uon", name: "جامعة النهرين" },
  { id: "uoal", name: "جامعة آل البيت" },
  { id: "other", name: "أخرى" },
];
