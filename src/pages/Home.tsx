import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Play, Plus, Trash2 } from 'lucide-react';
import { apiClient, type ExperimentData, type Conversation as ApiConversation, type Message as ApiMessage } from '@/lib/api';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  experiment_id?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export default function Home() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载对话历史
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();
      
      if (response.success && response.data) {
        // 只加载对话列表，不加载消息
        const conversationsWithoutMessages = response.data.map((conv: ApiConversation) => ({
          id: conv.id,
          title: conv.title,
          messages: [] as Message[], // 初始为空，按需加载
          lastUpdated: new Date(conv.updated_at)
        }));
        
        setConversations(conversationsWithoutMessages);
        
        // 如果有对话，选择第一个但不自动加载消息
        if (conversationsWithoutMessages.length > 0) {
          const firstConvId = conversationsWithoutMessages[0].id;
          setCurrentConversation(firstConvId);
          // 移除自动加载消息，让用户手动点击对话来加载
        }
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增：按需加载特定对话的消息
  const loadMessagesForConversation = async (conversationId: string) => {
    try {
      const messagesResponse = await apiClient.getMessages(conversationId);
      
      if (messagesResponse.success && messagesResponse.data) {
        const messages: Message[] = messagesResponse.data.map((msg: ApiMessage) => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          timestamp: new Date(msg.created_at),
          experiment_id: msg.experiment_id
        }));
        
        // 更新特定对话的消息
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages }
            : conv
        ));
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  };

  const currentConv = conversations.find(conv => conv.id === currentConversation);

  const handleNewChat = async () => {
    try {
      const response = await apiClient.createConversation('新对话');
      
      if (response.success && response.data) {
        const newConversation: Conversation = {
          id: response.data.id,
          title: response.data.title,
          messages: [],
          lastUpdated: new Date(response.data.created_at)
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversation(response.data.id);
        setInputMessage('');
        
        // 自动聚焦到输入框
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('创建新对话失败:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发对话选择
    
    console.log('🗑️ 删除按钮被点击，对话ID:', conversationId);
    
    const userConfirmed = confirm('确定要删除这个对话吗？此操作无法撤销。');
    console.log('👤 用户确认结果:', userConfirmed);
    
    if (!userConfirmed) {
      console.log('❌ 用户取消删除');
      return;
    }
    
    console.log('✅ 用户确认删除，开始执行删除操作...');
    
    try {
      const response = await apiClient.deleteConversation(conversationId);
      
      if (response.success) {
        // 更新本地状态
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // 如果删除的是当前对话，需要切换到其他对话或创建新对话
        if (currentConversation === conversationId) {
          const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
          if (remainingConversations.length > 0) {
            setCurrentConversation(remainingConversations[0].id);
          } else {
            // 如果没有其他对话，创建新对话
            handleNewChat();
          }
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
      alert('删除对话失败，请稍后重试。');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversation) return;
    
    const messageContent = inputMessage;
    setInputMessage('');
    setIsGenerating(true);
    
    try {
      // 保存用户消息到数据库
      const userMessageResponse = await apiClient.createMessage({
        conversation_id: currentConversation,
        content: messageContent,
        type: 'user'
      });
      
      if (userMessageResponse.success && userMessageResponse.data) {
        const userMessage: Message = {
          id: userMessageResponse.data.id,
          content: userMessageResponse.data.content,
          type: 'user',
          timestamp: new Date(userMessageResponse.data.created_at)
        };
        
        // 更新本地状态
        setConversations(prev => prev.map(conv => {
          if (conv.id === currentConversation) {
            const updatedMessages = [...conv.messages, userMessage];
            // 如果是新对话的第一条消息，更新标题
            const title = conv.messages.length === 0 
              ? messageContent.length > 20 ? messageContent.substring(0, 20) + '...' : messageContent
              : conv.title;
            
            // 如果标题需要更新，调用API更新
            if (conv.messages.length === 0) {
              apiClient.updateConversationTitle(currentConversation, title);
            }
            
            return { ...conv, messages: updatedMessages, title, lastUpdated: new Date() };
          }
          return conv;
        }));
      }
      
      // 调用API生成实验
      const response = await apiClient.generateExperiment({
        prompt: messageContent,
        conversation_id: currentConversation
      });

      if (response.success && response.data) {
        const assistantContent = `我已经为您创建了一个实验演示。这个实验展示了${messageContent}的相关内容，您可以点击下方按钮查看交互式演示。`;
        
        // 保存助手消息到数据库
        const assistantMessageResponse = await apiClient.createMessage({
          conversation_id: currentConversation,
          content: assistantContent,
          type: 'assistant',
          experiment_id: response.data.experiment_id,
          html_content: response.data.html_content,
          css_content: response.data.css_content,
          js_content: response.data.js_content
        });
        
        if (assistantMessageResponse.success && assistantMessageResponse.data) {
          const assistantMessage: Message = {
            id: assistantMessageResponse.data.id,
            content: assistantMessageResponse.data.content,
            type: 'assistant',
            timestamp: new Date(assistantMessageResponse.data.created_at),
            experiment_id: assistantMessageResponse.data.experiment_id
          };
          
          // 更新本地状态
          setConversations(prev => prev.map(conv => 
            conv.id === currentConversation 
              ? { ...conv, messages: [...conv.messages, assistantMessage], lastUpdated: new Date() }
              : conv
          ));
        }

        // 存储实验数据到localStorage（简单实现）
        localStorage.setItem(`experiment_${response.data.experiment_id}`, JSON.stringify(response.data));
        
        // 自动跳转到demo页面
        setTimeout(() => {
          navigate(`/demo/${response.data.experiment_id}`);
        }, 1000);
      } else {
        throw new Error(response.error || '生成实验失败');
      }
    } catch (error) {
      console.error('生成实验失败:', error);
      const errorContent = `抱歉，生成实验时出现错误：${error instanceof Error ? error.message : '未知错误'}。请稍后重试。`;
      
      // 保存错误消息到数据库
      const errorMessageResponse = await apiClient.createMessage({
        conversation_id: currentConversation,
        content: errorContent,
        type: 'assistant'
      });
      
      if (errorMessageResponse.success && errorMessageResponse.data) {
        const errorMessage: Message = {
          id: errorMessageResponse.data.id,
          content: errorMessageResponse.data.content,
          type: 'assistant',
          timestamp: new Date(errorMessageResponse.data.created_at)
        };
        
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversation 
            ? { ...conv, messages: [...conv.messages, errorMessage], lastUpdated: new Date() }
            : conv
        ));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-dark-bg flex">
      {/* 左侧聊天历史区域 */}
      <div className="w-80 bg-dark-bg-secondary border-r border-dark-border flex flex-col">
        {/* 标题 */}
        <div className="p-4 border-b border-dark-border">
          <h1 className="text-lg font-semibold text-dark-text flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            实验生成平台
          </h1>
        </div>
        
        {/* 新建聊天按钮 */}
        <div className="p-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-dark-bg-tertiary hover:bg-dark-bg-tertiary/80 text-dark-text rounded-low transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">新建聊天</span>
          </button>
        </div>
        
        {/* 对话历史列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="text-dark-text-muted text-sm">加载中...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <div className="text-dark-text-muted text-sm">暂无对话历史</div>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setCurrentConversation(conv.id);
                  // 如果该对话还没有加载消息，则加载消息
                  if (conv.messages.length === 0) {
                    loadMessagesForConversation(conv.id);
                  }
                }}
                className={`group p-3 mb-2 rounded-low cursor-pointer transition-colors relative ${
                  currentConversation === conv.id
                    ? 'bg-dark-bg-tertiary'
                    : 'hover:bg-dark-bg-tertiary/50'
                }`}
              >
                <div className="text-sm font-medium text-dark-text truncate pr-8">
                  {conv.title}
                </div>
                <div className="text-xs text-dark-text-muted mt-1">
                  {conv.lastUpdated.toLocaleTimeString()}
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all duration-200 z-10"
                  title="删除对话"
                >
                  <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧对话区域 */}
      <div className="flex-1 flex flex-col">
        {/* 对话内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentConv?.messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-2xl px-4 py-3 rounded-low ${
                  message.type === 'user'
                    ? 'bg-accent-blue text-dark-text'
                    : 'bg-dark-bg-secondary text-dark-text-secondary'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-dark-text-muted">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                  {message.type === 'assistant' && message.experiment_id && (
                    <button
                      onClick={() => navigate(`/demo/${message.experiment_id}`)}
                      className="flex items-center gap-1 px-2 py-1 bg-accent-blue hover:bg-accent-gray rounded-low text-xs text-dark-text transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      查看实验
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* 生成状态指示器 */}
          {isGenerating && (
            <div className="flex justify-start mb-6">
              <div className="bg-dark-bg-secondary px-4 py-3 rounded-low">
                <div className="flex items-center gap-2 text-dark-text-secondary">
                  <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse"></div>
                  <span className="text-sm">正在生成实验...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-dark-border p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="描述您想要的实验..."
              className="flex-1 px-4 py-3 bg-dark-bg-secondary border border-dark-border rounded-low text-dark-text placeholder-dark-text-muted focus:outline-none focus:border-dark-border-light"
              disabled={isGenerating}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isGenerating}
              className="px-4 py-3 bg-accent-blue hover:bg-accent-gray disabled:opacity-50 disabled:cursor-not-allowed rounded-low transition-colors"
            >
              <Send className="w-5 h-5 text-dark-text" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}