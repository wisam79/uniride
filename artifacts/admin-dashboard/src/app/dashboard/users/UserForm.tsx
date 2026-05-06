'use client';

import React, { useState } from 'react';
import { createUser } from '@/lib/actions';
import { UserPlus, X } from 'lucide-react';

export default function UserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<'student' | 'driver'>('student');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    const result = await createUser(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
    
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-[#FF6B35] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#e85a25] transition-colors"
      >
        <UserPlus size={18} />
        إضافة مستخدم جديد
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">إضافة مستخدم جديد</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select 
                  name="role" 
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'student' | 'driver')}
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="student">طالب</option>
                  <option value="driver">سائق</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input 
                  type="text" 
                  name="fullName" 
                  required 
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500"
                  placeholder="محمد علي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border text-left focus:ring-blue-500 focus:border-blue-500"
                  placeholder="07700000000"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور (مؤقتة)</label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  className="w-full border-gray-300 rounded-lg shadow-sm p-3 border text-left focus:ring-blue-500 focus:border-blue-500"
                  placeholder="******"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">يجب أن تكون 6 أحرف على الأقل.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-[#0D2847] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#153b66] transition-colors disabled:opacity-50"
                >
                  {loading ? 'جاري الإضافة...' : 'حفظ وإضافة'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
