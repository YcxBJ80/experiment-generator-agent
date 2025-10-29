import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/database';

type AccessType = 'software' | 'api' | null;

function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'software' | 'api' | 'unassigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : '获取用户数据失败');
    } finally {
      setLoading(false);
    }
  };

  const updateUserAccessType = async (userId: string, accessType: AccessType) => {
    try {
      setSavingUserId(userId);
      setError(null);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ access_type: accessType })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 更新本地状态
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, access_type: accessType }
          : user
      ));

    } catch (err) {
      console.error('Error updating user access type:', err);
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setSavingUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredUsers = () => {
    let filtered = users;

    // 按访问类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(user => {
        if (filterType === 'unassigned') return !user.access_type;
        return user.access_type === filterType;
      });
    }

    // 按搜索词过滤
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">用户管理</h2>
          <p className="text-gray-400 text-sm mt-1">
            管理用户访问权限和分配类型
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          刷新数据
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 过滤和搜索 */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 过滤按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              全部 ({users.length})
            </button>
            <button
              onClick={() => setFilterType('software')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'software'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              软件 ({users.filter(u => u.access_type === 'software').length})
            </button>
            <button
              onClick={() => setFilterType('api')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'api'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              API ({users.filter(u => u.access_type === 'api').length})
            </button>
            <button
              onClick={() => setFilterType('unassigned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'unassigned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              未分配 ({users.filter(u => !u.access_type).length})
            </button>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  邮箱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  访问类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-400">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.access_type === 'software' 
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700' 
                        : user.access_type === 'api'
                        ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                    }`}>
                      {user.access_type === 'software' ? '软件访问' : user.access_type === 'api' ? 'API访问' : '未分配'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateUserAccessType(user.id, 'software')}
                        disabled={savingUserId === user.id || user.access_type === 'software'}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          user.access_type === 'software'
                            ? 'bg-blue-900/30 text-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {savingUserId === user.id ? '保存中...' : '软件'}
                      </button>
                      <button
                        onClick={() => updateUserAccessType(user.id, 'api')}
                        disabled={savingUserId === user.id || user.access_type === 'api'}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          user.access_type === 'api'
                            ? 'bg-purple-900/30 text-purple-400 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        {savingUserId === user.id ? '保存中...' : 'API'}
                      </button>
                      {user.access_type && (
                        <button
                          onClick={() => updateUserAccessType(user.id, null)}
                          disabled={savingUserId === user.id}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          清除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              没有找到匹配的用户
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm">总用户数</div>
          <div className="text-2xl font-bold text-white mt-1">{users.length}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm">软件访问</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {users.filter(u => u.access_type === 'software').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm">API访问</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {users.filter(u => u.access_type === 'api').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-gray-400 text-sm">未分配</div>
          <div className="text-2xl font-bold text-gray-400 mt-1">
            {users.filter(u => !u.access_type).length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;

