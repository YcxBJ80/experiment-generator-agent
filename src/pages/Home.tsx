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
  isTyping?: boolean;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 流式响应状态
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

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
      
      // 创建空的助手消息用于流式响应
      const assistantMessageResponse = await apiClient.createMessage({
        conversation_id: currentConversation,
        content: '',
        type: 'assistant'
      });
      
      if (assistantMessageResponse.success && assistantMessageResponse.data) {
        const assistantMessage: Message = {
          id: assistantMessageResponse.data.id,
          content: '',
          type: 'assistant',
          timestamp: new Date(assistantMessageResponse.data.created_at),
          isTyping: true
        };
        
        // 添加空的助手消息到状态
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversation 
            ? { ...conv, messages: [...conv.messages, assistantMessage], lastUpdated: new Date() }
            : conv
        ));
        
        // 设置流式响应状态
        setStreamingMessageId(assistantMessageResponse.data.id);
        
        // 调用流式API生成实验
         await apiClient.generateExperimentStream(
           {
             prompt: messageContent,
             conversation_id: currentConversation,
             message_id: assistantMessageResponse.data.id
           },
           (chunk: string) => {
             // 实时更新消息内容
             setConversations(prev => prev.map(conv => 
               conv.id === currentConversation 
                 ? {
                     ...conv,
                     messages: conv.messages.map(msg => 
                       msg.id === assistantMessageResponse.data.id 
                         ? { ...msg, content: msg.content + chunk }
                         : msg
                     )
                   }
                 : conv
             ));
           }
         );
         
         // 流式响应完成，更新状态并重新加载消息以获取experiment_id
         setConversations(prev => prev.map(conv => 
           conv.id === currentConversation 
             ? {
                 ...conv,
                 messages: conv.messages.map(msg => 
                   msg.id === assistantMessageResponse.data.id 
                     ? { ...msg, isTyping: false }
                     : msg
                 )
               }
             : conv
         ));
         
         // 延迟一下再重新加载消息，确保后端已经完成更新
         setTimeout(() => {
           loadMessagesForConversation(currentConversation);
         }, 1000);
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
      setStreamingMessageId(null);
    }
  };

  return (
    <div className="h-screen bg-dark-bg flex relative">
      {/* 鼠标悬停触发区域 - 左侧1/6宽度，只在边栏关闭时显示 */}
      {!isSidebarOpen && (
        <div 
          className="fixed left-0 top-0 h-full z-30"
          style={{ width: 'calc(100vw / 6)' }}
          onMouseEnter={() => setIsSidebarOpen(true)}
        />
      )}

      {/* 聊天历史边栏 */}
      <div 
        className={`fixed left-0 top-0 h-full bg-dark-bg-secondary border-r border-dark-border z-20 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '320px' }}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div className="p-4 border-b border-dark-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-low transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                setCurrentConversation(conv.id);
                // 如果该对话还没有加载消息，则加载消息
                if (conv.messages.length === 0) {
                  loadMessagesForConversation(conv.id);
                }
              }}
              className={`p-4 border-b border-dark-border cursor-pointer hover:bg-dark-bg-tertiary transition-colors ${
                currentConversation === conv.id ? 'bg-dark-bg-tertiary' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 text-dark-text-secondary flex-shrink-0" />
                  <span className="text-sm text-dark-text font-medium truncate">
                    {conv.title || '新对话'}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="p-1 text-dark-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                  title="删除对话"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-dark-text-secondary">
                {conv.lastUpdated ? new Date(conv.lastUpdated).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <div className="bg-dark-bg-secondary border-b border-dark-border p-4">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-dark-text">
              🧪 Interactive Experiment Platform
            </h1>
          </div>
          <p className="text-center text-dark-text-secondary mt-2">
            Create interactive experiments with AI-powered generation
          </p>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentConversation && conversations.find(c => c.id === currentConversation) ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {conversations
                .find(c => c.id === currentConversation)
                ?.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-low ${
                        message.type === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-dark-bg-secondary text-dark-text border border-dark-border'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                        {(message.isTyping || streamingMessageId === message.id) && (
                          <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse"></span>
                        )}
                      </div>
                      
                      {/* 如果消息有实验ID且不在流式响应中，显示查看演示按钮 */}
                      {message.experiment_id && streamingMessageId !== message.id && (
                        <div className="mt-4 pt-3 border-t border-dark-border">
                          <button
                            onClick={() => navigate(`/demo/${message.experiment_id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-low transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            查看交互式演示
                          </button>
                        </div>
                      )}
                      
                      {message.timestamp && (
                        <div className="text-xs opacity-70 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🧪</div>
                <h2 className="text-2xl font-bold text-dark-text mb-2">
                  Welcome to Interactive Experiment Platform
                </h2>
                <p className="text-dark-text-secondary mb-6 max-w-md">
                  Describe any experiment or concept you'd like to explore, and I'll create an interactive demo for you.
                </p>
                <div className="text-sm text-dark-text-secondary">
                  Hover over the left edge to access your conversation history
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-dark-border p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Describe the experiment you want to create..."
                className="flex-1 px-4 py-3 bg-dark-bg-secondary border border-dark-border rounded-low text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-primary"
                disabled={isGenerating}
              />
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || !inputMessage.trim()}
                className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-dark-bg-tertiary disabled:text-dark-text-secondary text-white rounded-low transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}