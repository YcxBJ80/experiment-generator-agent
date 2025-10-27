import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Send, Play, Plus, Trash2, ChevronDown } from 'lucide-react';
import { apiClient, type ExperimentData, type Conversation as ApiConversation, type Message as ApiMessage } from '@/lib/api';
import LightRays from '../components/LightRays';
import DonationButton from '../components/DonationButton';
import SurveyModal from '../components/SurveyModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  experiment_id?: string;
  conversation_id?: string;
  title?: string;
  is_conversation_root?: boolean;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  isTyping?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
  created_at?: string;
  updated_at?: string;
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5-mini');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // 流式响应状态
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // 滚动到底部按钮状态
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // 搜索生成状态
  const [isSearchingGenerating, setIsSearchingGenerating] = useState(false);
  // 问卷相关状态
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyExperimentId, setSurveyExperimentId] = useState<string>('');

  const markdownRemarkPlugins = useMemo(() => [remarkGfm, remarkMath, remarkBreaks], []);
  const markdownRehypePlugins = useMemo(() => [rehypeRaw, rehypeKatex], []);
  const markdownComponents = useMemo(
    () => ({
      a: ({ node, ...props }: { node?: unknown; href?: string; children?: ReactNode }) => (
        <a {...props} target="_blank" rel="noreferrer" />
      ),
    }),
    []
  );

  // 可选择的模型列表
  const availableModels = [
    { id: 'moonshotai/kimi-k2', name: 'Kimi K2' },
    { id: 'qwen/qwen3-coder', name: 'Qwen3 Coder' },
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
  ];

  // 加载对话历史
  useEffect(() => {
    loadConversations();
  }, []);

  // 处理从Demo页面传递过来的问卷触发状态
  useEffect(() => {
    const state = location.state as { showSurvey?: boolean; experimentId?: string } | null;
    if (state?.showSurvey && state?.experimentId) {
      setShowSurveyModal(true);
      setSurveyExperimentId(state.experimentId);
      // 清除location state以防止重复触发
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  // 滚动监听
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom && scrollHeight > clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    // 初始检查
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentConversation, conversations]);

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
          experiment_id: msg.experiment_id,
          is_conversation_root: msg.is_conversation_root ?? false
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

  // 滚动到底部函数
  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };



  const handleNewChat = async () => {
    try {
      const response = await apiClient.createConversation('New Conversation');
      
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
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发对话选择
    
    // 强制输出到控制台，确保日志可见
    console.warn('🗑️ [DELETE DEBUG] 删除按钮被点击，对话ID:', conversationId);
    console.warn('📊 [DELETE DEBUG] 删除前对话列表长度:', conversations.length);
    console.warn('📋 [DELETE DEBUG] 当前对话列表:', conversations.map(c => ({ id: c.id, title: c.title })));
    
    // 使用更可靠的确认机制，处理Electron环境中confirm的异常行为
    let userConfirmed: boolean;
    try {
      console.warn('🔍 [DELETE DEBUG] 准备显示确认对话框...');
      const confirmResult = window.confirm('确定要删除这个对话吗？此操作无法撤销。');
      console.warn('👤 [DELETE DEBUG] 原始确认结果 (类型:', typeof confirmResult, ', 值:', confirmResult, ')');
      
      // 处理Electron环境中confirm可能返回对象的情况
      if (typeof confirmResult === 'boolean') {
        userConfirmed = confirmResult;
      } else if (typeof confirmResult === 'object' && confirmResult !== null) {
        // 在某些Electron环境中，confirm可能返回包含结果的对象
        userConfirmed = Boolean((confirmResult as any).result || (confirmResult as any).value || confirmResult);
      } else {
        // 其他情况转换为boolean
        userConfirmed = Boolean(confirmResult);
      }
      
      console.warn('👤 [DELETE DEBUG] 处理后的确认结果:', userConfirmed);
    } catch (error) {
      console.error('❌ [DELETE DEBUG] 确认对话框出错:', error);
      userConfirmed = false;
    }
    
    // 严格检查确认结果
    if (!userConfirmed) {
      console.warn('❌ [DELETE DEBUG] 用户取消删除，停止删除操作');
      console.warn('📊 [DELETE DEBUG] 取消删除后对话列表长度:', conversations.length);
      return;
    }
    
    console.warn('✅ [DELETE DEBUG] 用户确认删除，开始执行删除操作...');
    
    try {
      console.warn('🌐 [DELETE DEBUG] 发送删除请求到服务器...');
      console.warn('🔗 [DELETE DEBUG] 请求URL: /api/messages/conversations/' + conversationId);
      
      const response = await apiClient.deleteConversation(conversationId);
      console.warn('📡 [DELETE DEBUG] 服务器响应:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.warn('✅ [DELETE DEBUG] 服务器确认删除成功，更新前端状态...');
        
        // 计算删除后的剩余对话
        const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
        console.warn('📊 [DELETE DEBUG] 删除后剩余对话数量:', remainingConversations.length);
        console.warn('📋 [DELETE DEBUG] 剩余对话列表:', remainingConversations.map(c => ({ id: c.id, title: c.title })));
        
        // 更新本地状态
        console.warn('🔄 [DELETE DEBUG] 更新本地状态...');
        setConversations(remainingConversations);
        
        // If the deleted conversation is the current one, switch to another conversation or create a new one
        if (currentConversation === conversationId) {
          console.warn('🔄 [DELETE DEBUG] 删除的是当前对话，需要切换...');
          if (remainingConversations.length > 0) {
            console.warn('➡️ [DELETE DEBUG] 切换到第一个剩余对话:', remainingConversations[0].id);
            setCurrentConversation(remainingConversations[0].id);
          } else {
            console.warn('🆕 [DELETE DEBUG] 没有剩余对话，创建新对话...');
            setCurrentConversation('');
            handleNewChat();
          }
        }
        
        console.warn('🎉 [DELETE DEBUG] 删除操作完成');
        
        // 强制重新加载对话列表以确保同步
        console.warn('🔄 [DELETE DEBUG] 重新加载对话列表以确保同步...');
        try {
          const conversationsResponse = await apiClient.getConversations();
          if (conversationsResponse.success && conversationsResponse.data) {
            console.warn('📋 [DELETE DEBUG] 从服务器重新加载的对话列表:', conversationsResponse.data.length);
            setConversations(conversationsResponse.data.map(conv => ({
              id: conv.id,
              title: conv.title,
              messages: [],
              lastUpdated: new Date(conv.updated_at)
            })));
          }
        } catch (reloadError) {
          console.error('❌ [DELETE DEBUG] 重新加载对话列表失败:', reloadError);
        }
        
      } else {
        console.error('❌ [DELETE DEBUG] 服务器删除失败:', response);
        alert('删除对话失败，请稍后重试。');
      }
    } catch (error) {
      console.error('❌ [DELETE DEBUG] 删除对话失败:', error);
      alert('删除对话失败，请稍后重试。');
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isGenerating) return;
    
    const messageContent = trimmedMessage;
    const derivedTitle = messageContent.length > 20 
      ? `${messageContent.substring(0, 20)}...`
      : messageContent;
    
    setInputMessage('');
    setIsGenerating(true);
    setIsSearchingGenerating(true);

    let activeConversationId = currentConversation;
    let conversationRecord = conversations.find(conv => conv.id === activeConversationId) || null;
    const meaningfulMessageCount = conversationRecord
      ? conversationRecord.messages.filter(msg => !msg.is_conversation_root).length
      : 0;
    let hadMessagesBeforeSend = meaningfulMessageCount > 0;

    try {
      if (!activeConversationId) {
        const newConversationResponse = await apiClient.createConversation(derivedTitle || 'New Conversation');
        
        if (!newConversationResponse.success || !newConversationResponse.data) {
          throw new Error('Failed to create new conversation');
        }

        activeConversationId = newConversationResponse.data.id;
        conversationRecord = {
          id: newConversationResponse.data.id,
          title: newConversationResponse.data.title,
          messages: [],
          lastUpdated: new Date(newConversationResponse.data.created_at)
        };
        hadMessagesBeforeSend = false;

        setConversations(prev => [conversationRecord!, ...prev]);
      } else if (!conversationRecord) {
        conversationRecord = {
          id: activeConversationId,
          title: 'New Conversation',
          messages: [],
          lastUpdated: new Date()
        };
        hadMessagesBeforeSend = false;
        setConversations(prev => {
          if (prev.some(conv => conv.id === activeConversationId)) {
            return prev;
          }
          return [conversationRecord!, ...prev];
        });
      }

      if (!activeConversationId) {
        throw new Error('Conversation creation failed');
      }

      setCurrentConversation(activeConversationId);

      if (!hadMessagesBeforeSend && conversationRecord && conversationRecord.title === 'New Conversation' && derivedTitle) {
        const updateTitleResponse = await apiClient.updateConversationTitle(activeConversationId, derivedTitle);
        if (updateTitleResponse.success) {
          setConversations(prev => prev.map(conv => 
            conv.id === activeConversationId
              ? { ...conv, title: derivedTitle }
              : conv
          ));
          conversationRecord = { ...conversationRecord, title: derivedTitle };
        }
      }

      const userMessageResponse = await apiClient.createMessage({
        conversation_id: activeConversationId,
        content: messageContent,
        type: 'user'
      });
      
      if (!userMessageResponse.success || !userMessageResponse.data) {
        throw new Error('Failed to create user message');
      }
      
      const userMessage: Message = {
        id: userMessageResponse.data.id,
        content: userMessageResponse.data.content,
        type: 'user',
        timestamp: new Date(userMessageResponse.data.created_at),
        is_conversation_root: false
      };
      
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, messages: [...conv.messages, userMessage], lastUpdated: new Date() }
            : conv
        );
        const target = updated.find(conv => conv.id === activeConversationId);
        if (!target) return updated;
        return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
      });

      const assistantMessageResponse = await apiClient.createMessage({
        conversation_id: activeConversationId,
        content: '',
        type: 'assistant'
      });
      
      if (!assistantMessageResponse.success || !assistantMessageResponse.data) {
        throw new Error('Failed to create assistant message');
      }

      const assistantMessage: Message = {
        id: assistantMessageResponse.data.id,
        content: '',
        type: 'assistant',
        timestamp: new Date(assistantMessageResponse.data.created_at),
        is_conversation_root: false,
        isTyping: true
      };
      
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === activeConversationId
            ? { ...conv, messages: [...conv.messages, assistantMessage], lastUpdated: new Date() }
            : conv
        );
        const target = updated.find(conv => conv.id === activeConversationId);
        if (!target) return updated;
        return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
      });

      setStreamingMessageId(assistantMessage.id);

      let hasStartedExperimentIdCheck = false;
      let hasResolvedExperimentId = false;
      let isFirstChunk = true;
      const expectExperimentResponse = !hadMessagesBeforeSend;
      if (!expectExperimentResponse) {
        hasResolvedExperimentId = true;
      }

      const applyExperimentIdToAssistantMessage = (experimentId: string) => {
        hasResolvedExperimentId = true;
        setConversations(prev => {
          const updated = prev.map(conv =>
            conv.id === activeConversationId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, experiment_id: experimentId }
                      : msg
                  )
                }
              : conv
          );
          const target = updated.find(conv => conv.id === activeConversationId);
          if (!target) return updated;
          return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
        });
      };

      const fetchLatestExperimentId = async (): Promise<string | null> => {
        const messagesResponse = await apiClient.getMessages(activeConversationId);
        if (messagesResponse.success && messagesResponse.data) {
          const updatedMessage = messagesResponse.data.find(msg => msg.id === assistantMessage.id);
          if (updatedMessage?.experiment_id) {
            return updatedMessage.experiment_id;
          }
        }
        return null;
      };

      const pollExperimentIdDuringStream = async (attempt = 1, maxAttempts = 5): Promise<void> => {
        if (hasResolvedExperimentId) return;
        try {
          console.log(`流式响应中检查experiment_id，第${attempt}次尝试`);
          const latestExperimentId = await fetchLatestExperimentId();
          if (latestExperimentId) {
            console.log('✅ 流式响应中获取到experiment_id:', latestExperimentId);
            applyExperimentIdToAssistantMessage(latestExperimentId);
            return;
          }
        } catch (streamError) {
          console.error('流式响应中获取experiment_id失败:', streamError);
        }

        if (!hasResolvedExperimentId && attempt < maxAttempts) {
          setTimeout(() => {
            void pollExperimentIdDuringStream(attempt + 1, maxAttempts);
          }, 2000);
        }
      };

      const pollExperimentIdAfterStream = async (attempt = 1, maxAttempts = 10): Promise<void> => {
        if (hasResolvedExperimentId) return;
        try {
          console.log(`检查experiment_id，第${attempt}次尝试`);
          const latestExperimentId = await fetchLatestExperimentId();
          if (latestExperimentId) {
            console.log('✅ 获取到experiment_id:', latestExperimentId);
            applyExperimentIdToAssistantMessage(latestExperimentId);
            return;
          }
        } catch (error) {
          console.error('获取experiment_id失败:', error);
        }

        if (!hasResolvedExperimentId && attempt < maxAttempts) {
          setTimeout(() => {
            void pollExperimentIdAfterStream(attempt + 1, maxAttempts);
          }, 1000);
        } else if (!hasResolvedExperimentId) {
          console.warn('⚠️ 达到最大重试次数，仍未获取到experiment_id');
        }
      };

      const startExperimentIdPolling = () => {
        if (!expectExperimentResponse) {
          return;
        }
        if (hasStartedExperimentIdCheck || hasResolvedExperimentId) {
          return;
        }
        hasStartedExperimentIdCheck = true;
        console.log('🔧 收到用户输入后立即开始检查experiment_id');
        setTimeout(() => {
          void pollExperimentIdDuringStream();
        }, 1000);
      };

      startExperimentIdPolling();

      await apiClient.generateExperimentStream(
        {
          prompt: messageContent,
          conversation_id: activeConversationId,
          message_id: assistantMessage.id,
          model: selectedModel
        },
        (chunk: string) => {
          if (isFirstChunk) {
            setIsSearchingGenerating(false);
            isFirstChunk = false;
          }

          setConversations(prev => {
            const updated = prev.map(conv =>
              conv.id === activeConversationId
                ? {
                    ...conv,
                    messages: conv.messages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    )
                  }
                : conv
            );
            const target = updated.find(conv => conv.id === activeConversationId);
            if (!target) return updated;
            return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
          });

          startExperimentIdPolling();
        }
      );

      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, isTyping: false }
                    : msg
                )
              }
            : conv
        );
        const target = updated.find(conv => conv.id === activeConversationId);
        if (!target) return updated;
        return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
      });

      setStreamingMessageId(null);

      if (hasStartedExperimentIdCheck && !hasResolvedExperimentId) {
        void pollExperimentIdAfterStream();
      }

      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('生成实验失败:', error);
      const errorContent = `Sorry, an error occurred while generating the response: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
      
      if (activeConversationId) {
        try {
          const errorMessageResponse = await apiClient.createMessage({
            conversation_id: activeConversationId,
            content: errorContent,
            type: 'assistant'
          });
          
          if (errorMessageResponse.success && errorMessageResponse.data) {
            const errorMessage: Message = {
              id: errorMessageResponse.data.id,
              content: errorMessageResponse.data.content,
              type: 'assistant',
              timestamp: new Date(errorMessageResponse.data.created_at),
              is_conversation_root: false
            };
            
            setConversations(prev => {
              const updated = prev.map(conv =>
                conv.id === activeConversationId
                  ? { ...conv, messages: [...conv.messages, errorMessage], lastUpdated: new Date() }
                  : conv
              );
              const target = updated.find(conv => conv.id === activeConversationId);
              if (!target) return updated;
              return [target, ...updated.filter(conv => conv.id !== activeConversationId)];
            });
          }
        } catch (persistError) {
          console.error('Failed to persist error message:', persistError);
        }
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessageId(null);
      setIsSearchingGenerating(false);
    }
  };

  // 检查当前对话是否有消息
  const hasMessages = currentConversation && 
    conversations.find(c => c.id === currentConversation)?.messages.length > 0;

  return (
    <div className="h-screen flex relative" style={{ backgroundColor: '#2D3748' }}>
      {/* 鼠标悬停触发区域 - 左侧1/7宽度，只在边栏关闭时显示 */}
      {!isSidebarOpen && (
        <div 
          className="fixed left-0 top-0 h-full z-30"
          style={{ width: 'calc(100vw / 6)' }}
          onMouseEnter={() => setIsSidebarOpen(true)}
        />
      )}

      {/* 聊天历史边栏 - 使用1/7的屏幕宽度 */}
      <div 
        className={`fixed left-1 top-1 bottom-1 bg-dark-bg-secondary border border-dark-border rounded-lg shadow-2xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto sidebar-scroll ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+0.25rem)]'
        }`}
        style={{ width: 'calc((100vw / 5) - 0.5rem)' }}
        onMouseLeave={() => setIsSidebarOpen(false)}
      >
        <div className="p-4 border-b border-dark-border">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-low transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Conversation
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
                    {conv.title || 'New Conversation'}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="p-1 text-dark-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                  title="Delete Conversation"
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


        {/* 消息区域 */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pb-32 relative">
          {!isLoading && currentConversation && conversations.find(c => c.id === currentConversation) ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* 只在没有消息时显示大标题和Light Rays背景 */}
              {conversations.find(c => c.id === currentConversation)?.messages.length === 0 && (
                <div className="flex-1 flex justify-center relative" style={{ paddingTop: 'calc(33.33vh - 2rem)' }}>
                  {/* Light Rays 背景 */}
                  <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
                    <LightRays 
                      raysOrigin="top-center" 
                      raysColor="#00ffff" 
                      raysSpeed={1.5} 
                      lightSpread={0.8} 
                      rayLength={1.2} 
                      followMouse={true} 
                      mouseInfluence={0.1} 
                      noiseAmount={0.1} 
                      distortion={0.05} 
                      className="custom-rays" 
                    />
                  </div>
                  <h1 className="text-4xl font-bold text-dark-text text-center relative z-20">Visualize an Experiment</h1>
                </div>
              )}
              {conversations
                .find(c => c.id === currentConversation)
                ?.messages.map((message, index) => {
                  const isAssistant = message.type === 'assistant';
                  const isStreamingAssistant =
                    isAssistant && streamingMessageId === message.id;
                  const showSearchState =
                    isSearchingGenerating && isStreamingAssistant && !message.content;

                  return (
                    <div
                      key={index}
                      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-low ${
                          isAssistant
                            ? 'bg-dark-bg-secondary text-dark-text border border-dark-border'
                            : 'bg-primary text-white'
                        }`}
                      >
                        <div className={isAssistant ? '' : 'whitespace-pre-wrap'}>
                          {showSearchState ? (
                            <div className="flex items-center gap-2 text-dark-text-secondary">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              <span>Searching & Generating...</span>
                            </div>
                          ) : isAssistant ? (
                            <>
                              {isStreamingAssistant ? (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.content}
                                  <span className="inline-block w-2 h-5 bg-primary animate-pulse"></span>
                                </div>
                              ) : (
                                <div className="markdown-content">
                                  <ReactMarkdown
                                    key={`${message.id}-${message.content.length}`}
                                    remarkPlugins={markdownRemarkPlugins}
                                    rehypePlugins={markdownRehypePlugins}
                                    components={markdownComponents}
                                  >
                                    {message.content || ''}
                                  </ReactMarkdown>
                                  {message.isTyping && (
                                    <span className="inline-block w-2 h-5 bg-primary animate-pulse"></span>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {message.content}
                              {(message.isTyping || streamingMessageId === message.id) && message.content && (
                                <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse"></span>
                              )}
                            </>
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
                              View Interactive Demo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-dark-text-secondary">Loading...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex justify-center relative" style={{ paddingTop: 'calc(33.33vh - 2rem)' }}>
              {/* Light Rays 背景 */}
              <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1 }}>
                <LightRays 
                  raysOrigin="top-center" 
                  raysColor="#00ffff" 
                  raysSpeed={1.5} 
                  lightSpread={0.8} 
                  rayLength={1.2} 
                  followMouse={true} 
                  mouseInfluence={0.1} 
                  noiseAmount={0.1} 
                  distortion={0.05} 
                  className="custom-rays" 
                />
              </div>
              <h1 className="text-4xl font-bold text-dark-text text-center relative z-20">Visualize an Experiment</h1>
            </div>
          )}
          
          {/* 滚动到底部按钮 */}
          {showScrollToBottom && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-32 right-8 w-12 h-12 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-20"
              title="Scroll to Bottom"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* 输入区域 */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-3/5">
          <div className="bg-dark-bg-secondary border border-dark-border rounded-3xl shadow-2xl p-3 w-full">
            {/* 输入和发送区域 */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Describe the experiment you want to create..."
                  className="w-full px-6 py-4 pr-48 bg-dark-bg border border-dark-border rounded-2xl text-dark-text placeholder-dark-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  disabled={isGenerating}
                />
                <select
                   value={selectedModel}
                   onChange={(e) => setSelectedModel(e.target.value)}
                   className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-dark-bg border border-dark-border rounded-lg px-2 py-1 text-dark-text text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer appearance-none"
                   disabled={isGenerating}
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                     backgroundPosition: 'right 0.5rem center',
                     backgroundRepeat: 'no-repeat',
                     backgroundSize: '1rem 1rem',
                     paddingRight: '2rem'
                   }}
                 >
                   {availableModels.map((model) => (
                     <option key={model.id} value={model.id} className="bg-dark-bg text-dark-text">
                       {model.name}
                     </option>
                   ))}
                 </select>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || !inputMessage.trim()}
                className="px-4 py-4 bg-primary hover:bg-primary-hover disabled:bg-dark-bg-tertiary disabled:text-dark-text-secondary text-white rounded-2xl transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Donation Button - 只在主页显示 */}
      <DonationButton />
      
      {/* Survey Modal */}
      {showSurveyModal && (
        <SurveyModal
          isOpen={showSurveyModal}
          experimentId={surveyExperimentId}
          onSubmit={() => setShowSurveyModal(false)}
          onClose={() => setShowSurveyModal(false)}
        />
      )}
    </div>
  );
};

export default Home;
