export interface IraqiUniversity {
  name: string;
  city: string;
  type: "public" | "private" | "technical";
}

export const IRAQI_UNIVERSITIES: IraqiUniversity[] = [
  // بغداد — حكومية
  { name: "جامعة بغداد", city: "بغداد", type: "public" },
  { name: "الجامعة المستنصرية", city: "بغداد", type: "public" },
  { name: "جامعة التكنولوجيا", city: "بغداد", type: "technical" },
  { name: "جامعة النهرين", city: "بغداد", type: "public" },
  { name: "جامعة الكرخ للعلوم", city: "بغداد", type: "public" },
  { name: "الجامعة التقنية الوسطى", city: "بغداد", type: "technical" },
  { name: "جامعة ديالى", city: "ديالى", type: "public" },
  // بغداد — أهلية
  { name: "الجامعة الأمريكية في بغداد", city: "بغداد", type: "private" },
  { name: "جامعة البيان الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة الرافدين الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة اليرموك الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة ابن رشد الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة الأمة الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة المنصور الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة الزيتونة الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة القاسم الخضراء", city: "بغداد", type: "private" },
  { name: "جامعة الإسراء الأهلية", city: "بغداد", type: "private" },
  { name: "جامعة الحكمة الأهلية", city: "بغداد", type: "private" },
  // البصرة
  { name: "جامعة البصرة", city: "البصرة", type: "public" },
  { name: "جامعة البصرة للنفط والغاز", city: "البصرة", type: "public" },
  { name: "الجامعة التقنية الجنوبية", city: "البصرة", type: "technical" },
  // الموصل
  { name: "جامعة الموصل", city: "الموصل", type: "public" },
  { name: "الجامعة التقنية الشمالية", city: "الموصل", type: "technical" },
  // النجف وكربلاء
  { name: "جامعة الكوفة", city: "النجف", type: "public" },
  { name: "جامعة كربلاء", city: "كربلاء", type: "public" },
  { name: "جامعة بابل", city: "بابل", type: "public" },
  // أربيل وكردستان
  { name: "جامعة صلاح الدين", city: "أربيل", type: "public" },
  { name: "الجامعة الأمريكية في كردستان", city: "أربيل", type: "private" },
  { name: "جامعة سوران", city: "أربيل", type: "public" },
  // محافظات أخرى
  { name: "جامعة الأنبار", city: "الأنبار", type: "public" },
  { name: "جامعة تكريت", city: "صلاح الدين", type: "public" },
  { name: "جامعة السليمانية", city: "السليمانية", type: "public" },
  { name: "جامعة دهوك", city: "دهوك", type: "public" },
  { name: "جامعة واسط", city: "واسط", type: "public" },
  { name: "جامعة ذي قار", city: "ذي قار", type: "public" },
  { name: "جامعة القادسية", city: "القادسية", type: "public" },
  { name: "جامعة الكوت الأهلية", city: "واسط", type: "private" },
  { name: "جامعة المثنى", city: "المثنى", type: "public" },
  { name: "جامعة ميسان", city: "ميسان", type: "public" },
  { name: "جامعة كركوك", city: "كركوك", type: "public" },
];

export const IRAQ_CITIES = [
  "بغداد",
  "البصرة",
  "الموصل",
  "النجف",
  "كربلاء",
  "بابل",
  "أربيل",
  "السليمانية",
  "دهوك",
  "الأنبار",
  "صلاح الدين",
  "ديالى",
  "واسط",
  "ذي قار",
  "القادسية",
  "المثنى",
  "ميسان",
  "كركوك",
];

export const BAGHDAD_AREAS = [
  "الكرادة",
  "المنصور",
  "الجادرية",
  "الزعفرانية",
  "الوزيرية",
  "العامرية",
  "الغزالية",
  "الأعظمية",
  "الكاظمية",
  "شارع فلسطين",
  "حي القادسية",
  "حي الجهاد",
  "بغداد الجديدة",
  "الدورة",
  "المدينة",
  "حي أور",
  "الحبيبية",
  "الباب المعظم",
  "باب الشيخ",
  "شارع المشتل",
  "الإسكان",
  "حي الرشيد",
  "حي الأمين",
  "حي التضامن",
  "حي الشعلة",
  "حي الفضل",
  "ساحة التحرير",
  "ابو غريب",
  "المحمودية",
  "اليوسفية",
  "الطارمية",
];

export function formatIQD(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} م.د`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k د.ع`;
  }
  return `${amount} د.ع`;
}

export function formatIQDFull(amount: number): string {
  return `${amount.toLocaleString("ar-IQ")} دينار`;
}
