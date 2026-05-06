import React from 'react';
import { profileRepository } from '@workspace/db/repositories';
import UserForm from './UserForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<{ page?: string; limit?: string }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const page = Math.max(1, parseInt((params as any).page || '1'));
  const limit = Math.min(100, Math.max(10, parseInt((params as any).limit || '20')));
  const offset = (page - 1) * limit;

  const [users, totalCount] = await Promise.all([
    profileRepository.findAll(limit, offset),
    profileRepository.count(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h3>
        <UserForm />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">الاسم الكامل</th>
                <th className="px-6 py-4 font-medium">رقم الهاتف</th>
                <th className="px-6 py-4 font-medium">الدور</th>
                <th className="px-6 py-4 font-medium">حالة التفعيل</th>
                <th className="px-6 py-4 font-medium">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.fullName}</td>
                  <td className="px-6 py-4 text-gray-600" dir="ltr">{user.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'student' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'driver' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {user.role === 'student' ? 'طالب' : user.role === 'driver' ? 'سائق' : 'مدير'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActivated ? (
                      <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> مفعل</span>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> غير مفعل</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    لا يوجد مستخدمين بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount} مستخدم | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <a
                href={`/dashboard/users?page=${Math.max(1, page - 1)}&limit=${limit}`}
                className={`px-3 py-1 text-sm rounded border ${page <= 1 ? 'text-gray-300 border-gray-200 pointer-events-none' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                aria-disabled={page <= 1}
              >
                السابق
              </a>
              <a
                href={`/dashboard/users?page=${Math.min(totalPages, page + 1)}&limit=${limit}`}
                className={`px-3 py-1 text-sm rounded border ${page >= totalPages ? 'text-gray-300 border-gray-200 pointer-events-none' : 'text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                aria-disabled={page >= totalPages}
              >
                التالي
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}