'use client';

import React, { useState } from 'react';
import { createRoute, updateRoute, deleteRoute, toggleRouteActive } from './actions';
import { Plus, X, Edit, Trash2 } from 'lucide-react';

interface DriverOption {
  id: string;
  fullName: string | null;
  phone: string | null;
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface Route {
  id: string;
  driverId: string;
  driverName: string | null;
  fromArea: string;
  toUniversity: string;
  departureMorning: string;
  departureEvening: string;
  totalSeats: number;
  availableSeats: number;
  monthlyFare: number;
  genderPreference: string;
  totalStudents: number;
  isActive: boolean;
  institutionId: string | null;
  notes: string | null;
}

interface Props {
  drivers: DriverOption[];
  institutions: InstitutionOption[];
  editRoute?: Route;
}

export default function RouteForm({ drivers, institutions, editRoute }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!editRoute;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const result = isEdit
      ? await updateRoute(editRoute!.id, formData)
      : await createRoute(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }

    setLoading(false);
  }

  async function handleDelete() {
    if (!editRoute) return;
    if (!confirm('هل أنت متأكد من حذف هذا المسار؟')) return;

    setLoading(true);
    const result = await deleteRoute(editRoute.id);
    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
    setLoading(false);
  }

  async function handleToggleActive() {
    if (!editRoute) return;

    setLoading(true);
    const result = await toggleRouteActive(editRoute.id, !editRoute.isActive);
    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
    setLoading(false);
  }

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setIsOpen(true)}
          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
          title="تعديل"
        >
          <Edit size={18} />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#FF6B35] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#e85a25] transition-colors"
        >
          <Plus size={18} />
          إضافة مسار جديد
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {isEdit ? 'تعديل المسار' : 'إضافة مسار جديد'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السائق</label>
                <select
                  name="driverId"
                  required
                  defaultValue={editRoute?.driverId ?? ''}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>اختر السائق</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">منطقة الانطلاق</label>
                <input
                  type="text"
                  name="fromArea"
                  required
                  defaultValue={editRoute?.fromArea ?? ''}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="مثال: المنصور"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجامعة</label>
                <input
                  type="text"
                  name="toUniversity"
                  required
                  defaultValue={editRoute?.toUniversity ?? ''}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="مثال: جامعة بغداد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المؤسسة التعليمية</label>
                <select
                  name="institutionId"
                  defaultValue={editRoute?.institutionId ?? ''}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">بدون (اختياري)</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت الذهاب</label>
                  <input
                    type="time"
                    name="departureMorning"
                    required
                    defaultValue={editRoute?.departureMorning ?? ''}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت العودة</label>
                  <input
                    type="time"
                    name="departureEvening"
                    required
                    defaultValue={editRoute?.departureEvening ?? ''}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عدد المقاعد</label>
                  <input
                    type="number"
                    name="totalSeats"
                    required
                    min={1}
                    defaultValue={editRoute?.totalSeats ?? 4}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الأجرة الشهرية (د.ع)</label>
                  <input
                    type="number"
                    name="monthlyFare"
                    required
                    min={0}
                    defaultValue={editRoute?.monthlyFare ?? 90000}
                    className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تفضيل الجنس</label>
                <select
                  name="genderPreference"
                  defaultValue={editRoute?.genderPreference ?? 'any'}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">الكل</option>
                  <option value="female">إناث فقط</option>
                  <option value="male">ذكور فقط</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editRoute?.notes ?? ''}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#0D2847] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#153b66] transition-colors disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ وإضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>

              {isEdit && (
                <div className="pt-2 flex gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={loading}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
                      editRoute.isActive
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {editRoute.isActive ? 'تعطيل المسار' : 'تفعيل المسار'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center justify-center gap-1 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    حذف
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}