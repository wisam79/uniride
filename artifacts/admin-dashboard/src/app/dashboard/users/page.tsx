import React from 'react';
import { profileRepository } from '@workspace/db/repositories';
import UserForm from './UserForm';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from '@/components/ui';
import { usersSearchParamsCache } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams?: Promise<Record<string, string>>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params = usersSearchParamsCache.parse(await searchParams ?? {});
  const page = params.page;
  const limit = params.limit;
  const offset = (page - 1) * limit;

  const [users, totalCount] = await Promise.all([
    profileRepository.findAllFiltered(limit, offset, {
      search: params.search,
      role: params.role ?? undefined,
      status: params.status ?? undefined,
    }),
    profileRepository.countFiltered({
      search: params.search,
      role: params.role ?? undefined,
      status: params.status ?? undefined,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const roleVariant: Record<string, 'default' | 'success' | 'warning'> = {
    student: 'default',
    driver: 'success',
    admin: 'warning',
  };

  const roleLabel: Record<string, string> = {
    student: 'طالب',
    driver: 'سائق',
    admin: 'مدير',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h3>
        <UserForm />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead>الاسم الكامل</TableHead>
              <TableHead>رقم الهاتف</TableHead>
              <TableHead>الدور</TableHead>
              <TableHead>حالة التفعيل</TableHead>
              <TableHead>تاريخ الانضمام</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-gray-900">{user.fullName}</TableCell>
                <TableCell className="text-gray-600" dir="ltr">
                  {user.phone}
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariant[user.role] || 'default'}>
                    {roleLabel[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.isActivated ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      مفعل
                    </span>
                  ) : (
                    <span className="text-gray-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                      غير مفعل
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad' }).format(
                    new Date(user.createdAt),
                  )}
                </TableCell>
              </TableRow>
            ))}

            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  لا يوجد مستخدمين بعد.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {totalCount} مستخدم | صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-2" dir="ltr">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none text-gray-300 border-gray-200' : ''}
                onClick={() => window.location.href = `/dashboard/users?page=${Math.max(1, page - 1)}&limit=${limit}&search=${params.search}&role=${params.role || ''}&status=${params.status || ''}`}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                className={
                  page >= totalPages ? 'pointer-events-none text-gray-300 border-gray-200' : ''
                }
                onClick={() => window.location.href = `/dashboard/users?page=${Math.min(totalPages, page + 1)}&limit=${limit}&search=${params.search}&role=${params.role || ''}&status=${params.status || ''}`}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
