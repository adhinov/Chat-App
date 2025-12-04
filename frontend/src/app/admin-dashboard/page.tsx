// src/app/admin-dashboard/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  phone: string;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLogin, setLastLogin] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

  // Fix SSR localStorage issue
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const payload: any = jwtDecode(token);

      if (payload.role?.toUpperCase() !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }

      const now = new Date();
      setLastLogin(now.toLocaleString('id-ID'));

      fetchUsers();
    } catch (error) {
      console.error('Token decode error:', error);
      router.push('/');
    }
  }, [isClient, router]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-300 py-6 px-4 flex justify-center items-start">

      <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl overflow-hidden border border-gray-300">

        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Login: {lastLogin}
            </p>
          </div>

          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="h-8 px-4 text-xs"
          >
            Logout
          </Button>
        </div>

        <div className="p-4">

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-700">
              List Users{' '}
              <span className="text-xs font-normal text-gray-500">
                ({filteredUsers.length})
              </span>
            </h2>

            <div className="flex w-full sm:w-auto gap-2">
              <input
                type="text"
                placeholder="Cari user..."
                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-full sm:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                onClick={fetchUsers}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold w-12">ID</th>
                    <th className="px-3 py-2 text-left font-semibold">Email</th>
                    <th className="px-3 py-2 text-left font-semibold">Username</th>
                    <th className="px-3 py-2 text-left font-semibold w-24">Role</th>
                    <th className="px-3 py-2 text-left font-semibold">Created At</th>
                    <th className="px-3 py-2 text-left font-semibold">Phone</th>
                  </tr>
                </thead>

                <tbody className="text-sm divide-y divide-gray-200 bg-white">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-1 text-gray-600 font-medium whitespace-nowrap">
                          {user.id}
                        </td>
                        <td className="px-3 py-1 text-gray-700 whitespace-nowrap">{user.email}</td>
                        <td className="px-3 py-1 font-medium text-gray-900 whitespace-nowrap">
                          {user.username}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-[1px] rounded text-[10px] font-bold uppercase ${
                              user.role === 'admin'
                                ? 'bg-red-500 text-white'
                                : 'bg-green-500 text-white'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-3 py-1 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-1 text-gray-600 whitespace-nowrap">
                          {user.phone || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400 text-sm"
                      >
                        Data tidak ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
