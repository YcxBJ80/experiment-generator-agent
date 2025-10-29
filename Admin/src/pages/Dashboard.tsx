import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserStats } from '../types/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function Dashboard() {
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取所有用户
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        setUserStats([]);
        setTotalUsers(0);
        setTotalMessages(0);
        setLoading(false);
        return;
      }

      setTotalUsers(users.length);

      // 为每个用户获取消息统计
      const statsPromises = users.map(async (user) => {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('created_at')
          .eq('user_id', user.id);

        if (messagesError) {
          console.error('Error fetching messages for user:', user.id, messagesError);
          return {
            userId: user.id,
            username: user.username,
            email: user.email,
            messageCount: 0,
            lastActiveAt: user.created_at,
            createdAt: user.created_at,
            accessType: user.access_type || null
          };
        }

        const messageCount = messages?.length || 0;
        const lastActiveAt = messages && messages.length > 0
          ? messages.reduce((latest, msg) => {
              return new Date(msg.created_at) > new Date(latest) ? msg.created_at : latest;
            }, messages[0].created_at)
          : user.created_at;

        return {
          userId: user.id,
          username: user.username,
          email: user.email,
          messageCount,
          lastActiveAt,
          createdAt: user.created_at,
          accessType: user.access_type || null
        };
      });

      const stats = await Promise.all(statsPromises);
      setUserStats(stats);
      
      const total = stats.reduce((sum, stat) => sum + stat.messageCount, 0);
      setTotalMessages(total);

    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
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

  const getAccessTypeData = () => {
    const softwareCount = userStats.filter(u => u.accessType === 'software').length;
    const apiCount = userStats.filter(u => u.accessType === 'api').length;
    const unassignedCount = userStats.filter(u => !u.accessType).length;

    return [
      { name: '软件访问', value: softwareCount },
      { name: 'API访问', value: apiCount },
      { name: '未分配', value: unassignedCount }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
        错误: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">总用户数</h3>
          <p className="text-3xl font-bold text-white">{totalUsers}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">总消息数</h3>
          <p className="text-3xl font-bold text-white">{totalMessages}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">平均消息数</h3>
          <p className="text-3xl font-bold text-white">
            {totalUsers > 0 ? (totalMessages / totalUsers).toFixed(1) : 0}
          </p>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户消息数柱状图 */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">用户消息数统计</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userStats.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="username" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
              />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Bar dataKey="messageCount" fill="#3b82f6" name="消息数量" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 访问类型饼图 */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">用户访问类型分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getAccessTypeData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {getAccessTypeData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 用户详情表格 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">用户详情</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  用户名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  邮箱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  消息数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  最后活跃
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  访问类型
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {userStats.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.messageCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(user.lastActiveAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.accessType === 'software' 
                        ? 'bg-blue-900/50 text-blue-300' 
                        : user.accessType === 'api'
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {user.accessType === 'software' ? '软件' : user.accessType === 'api' ? 'API' : '未分配'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

