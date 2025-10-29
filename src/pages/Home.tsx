import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Send, Play, Plus, Trash2, ChevronDown } from 'lucide-react';
import { apiClient, type Conversation as ApiConversation, type Message as ApiMessage } from '@/lib/api';
import { useAuth, useAuthActions } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const { clearAuth } = useAuthActions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string>('');
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai/gpt-5');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Streaming response state
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Scroll-to-bottom button visibility
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // Search-and-generate indicator state
  const [isSearchingGenerating, setIsSearchingGenerating] = useState(false);
  // Survey modal state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyExperimentId, setSurveyExperimentId] = useState<string>('');
  const userInitial = useMemo(() => {
    const source = (user?.username || user?.email || '').trim();
    if (!source) return 'U';
    const [firstChar] = Array.from(source);
    return firstChar ? firstChar.toUpperCase() : 'U';
  }, [user?.username, user?.email]);

  const handleUnauthorized = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      clearAuth();
      navigate('/', { replace: true });
    }
  };

  const markdownRemarkPlugins = useMemo(() => [remarkGfm, remarkMath, remarkBreaks], []);
  const markdownRehypePlugins = useMemo(() => [rehypeRaw, rehypeKatex], []);
  type MarkdownElementProps = { node?: unknown; children?: ReactNode } & Record<string, unknown>;

  const markdownComponents = useMemo(
    () => ({
      a: ({ node, ...props }: { node?: unknown; href?: string; children?: ReactNode }) => (
        <a {...props} target="_blank" rel="noreferrer" />
      ),
      parameter: ({ node, children, className, ...props }: MarkdownElementProps) => {
        const mergedClassName = [
          'bg-dark-bg-tertiary text-dark-text px-1 py-0.5 rounded',
          typeof className === 'string' ? className : ''
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <code className={mergedClassName} {...props}>
            {children}
          </code>
        );
      },
      invoke: ({ node, children, className, ...props }: MarkdownElementProps) => {
        const mergedClassName = [
          'bg-dark-bg-tertiary text-dark-text px-1 py-0.5 rounded',
          typeof className === 'string' ? className : ''
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <code className={mergedClassName} {...props}>
            {children}
          </code>
        );
      }
    }),
    []
  );

  // Supported model list
  const availableModels = [
    { id: 'openai/gpt-5', name: 'GPT-5' },
    { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
    { id: 'moonshotai/kimi-k2', name: 'Kimi K2' },
    { id: 'qwen/qwen3-coder', name: 'Qwen3 Coder' },
  ];

  // Load messages for a specific conversation on demand
  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    try {
      const messagesResponse = await apiClient.getMessages(conversationId);

      if (!messagesResponse.success || !messagesResponse.data) {
        if (messagesResponse.status === 401) {
          handleUnauthorized();
        } else {
          console.error('Failed to load messages:', messagesResponse.error);
        }
        return;
      }

      const messages: Message[] = messagesResponse.data.map((msg: ApiMessage) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        timestamp: new Date(msg.created_at),
        experiment_id: msg.experiment_id,
        is_conversation_root: msg.is_conversation_root ?? false
      }));

      // Update the selected conversation with fetched messages
      setConversations(prev => {
        if (!prev.some(conv => conv.id === conversationId)) {
          return prev;
        }
        return prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages }
            : conv
        );
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [handleUnauthorized]);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getConversations();

      if (!response.success || !response.data) {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          console.error('Failed to load conversation history:', response.error);
        }
        return;
      }

      // Load conversation list but defer messages until needed
      const conversationsWithoutMessages = response.data.map((conv: ApiConversation) => ({
        id: conv.id,
        title: conv.title,
        messages: [] as Message[], // Start empty and hydrate on demand
        lastUpdated: new Date(conv.updated_at)
      }));

      setConversations(conversationsWithoutMessages);

      if (conversationsWithoutMessages.length > 0) {
        const preferredConversationId =
          pendingConversationId && conversationsWithoutMessages.some(conv => conv.id === pendingConversationId)
            ? pendingConversationId
            : conversationsWithoutMessages[0].id;

        setCurrentConversation(preferredConversationId);
        await loadMessagesForConversation(preferredConversationId);
        if (pendingConversationId) {
          setPendingConversationId(null);
        }
      } else {
        setCurrentConversation('');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, loadMessagesForConversation, pendingConversationId]);

  // Handle survey trigger and conversation focus passed from the demo page
  useEffect(() => {
    const state = location.state as { showSurvey?: boolean; experimentId?: string; conversationId?: string } | null;
    if (!state) {
      return;
    }

    if (state.conversationId) {
      setPendingConversationId(state.conversationId);
    }

    if (state.showSurvey && state.experimentId) {
      setShowSurveyModal(true);
      setSurveyExperimentId(state.experimentId);
    }

    navigate(location.pathname, { replace: true, state: undefined });
  }, [location.pathname, location.state, navigate]);

  // Load conversation list
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Scroll observer
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollToBottom(!isNearBottom && scrollHeight > clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    // Initial position check
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentConversation, conversations]);

  // Smoothly scroll to the bottom of the message list
  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };



  const handleNewChat = async () => {
    try {
      const response = await apiClient.createConversation('New Conversation');

      if (!response.success || !response.data) {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          console.error('Failed to create conversation:', response.error);
        }
        return;
      }

      const newConversation: Conversation = {
        id: response.data.id,
        title: response.data.title,
        messages: [],
        lastUpdated: new Date(response.data.created_at)
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(response.data.id);
      setInputMessage('');

      // Auto-focus the input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation row

    // Verbose logging to make delete flow traceable
    console.warn('🗑️ [DELETE DEBUG] Delete button clicked, conversation ID:', conversationId);
    console.warn('📊 [DELETE DEBUG] Conversation count before delete:', conversations.length);
    console.warn('📋 [DELETE DEBUG] Conversation list snapshot:', conversations.map(c => ({ id: c.id, title: c.title })));

    // Confirmation helper for environments where confirm might behave differently
    let userConfirmed: boolean;
    try {
      console.warn('🔍 [DELETE DEBUG] Opening confirmation dialog...');
      const confirmResult = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
      console.warn('👤 [DELETE DEBUG] Raw confirm result (type:', typeof confirmResult, ', value:', confirmResult, ')');

      // Handle cases where confirm returns an object (e.g., some Electron builds)
      if (typeof confirmResult === 'boolean') {
        userConfirmed = confirmResult;
      } else if (typeof confirmResult === 'object' && confirmResult !== null) {
        // Coerce confirm result objects into booleans
        userConfirmed = Boolean((confirmResult as any).result || (confirmResult as any).value || confirmResult);
      } else {
        // Fallback to boolean cast
        userConfirmed = Boolean(confirmResult);
      }

      console.warn('👤 [DELETE DEBUG] Normalized confirm result:', userConfirmed);
    } catch (error) {
      console.error('❌ [DELETE DEBUG] Confirm dialog failed:', error);
      userConfirmed = false;
    }

    // Respect the confirmation result
    if (!userConfirmed) {
      console.warn('❌ [DELETE DEBUG] User canceled deletion; aborting.');
      console.warn('📊 [DELETE DEBUG] Conversation count unchanged:', conversations.length);
      return;
    }

    console.warn('✅ [DELETE DEBUG] User confirmed deletion; proceeding...');

    try {
      console.warn('🌐 [DELETE DEBUG] Sending delete request...');
      console.warn('🔗 [DELETE DEBUG] Request URL: /api/messages/conversations/' + conversationId);

      const response = await apiClient.deleteConversation(conversationId);
      console.warn('📡 [DELETE DEBUG] Server response:', JSON.stringify(response, null, 2));

      if (!response.success) {
        if (response.status === 401) {
          handleUnauthorized();
        } else {
          console.error('Failed to delete conversation:', response.error);
        }
        return;
      }

      console.warn('✅ [DELETE DEBUG] Deletion succeeded; updating UI...');

      const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
      console.warn('📊 [DELETE DEBUG] Remaining conversation count:', remainingConversations.length);
      console.warn('📋 [DELETE DEBUG] Remaining conversation list:', remainingConversations.map(c => ({ id: c.id, title: c.title })));

      console.warn('🔄 [DELETE DEBUG] Updating local state...');
      setConversations(remainingConversations);

      if (currentConversation === conversationId) {
        console.warn('🔄 [DELETE DEBUG] Deleted conversation was active; switching...');
        if (remainingConversations.length > 0) {
          console.warn('➡️ [DELETE DEBUG] Switching to first remaining conversation:', remainingConversations[0].id);
          setCurrentConversation(remainingConversations[0].id);
        } else {
          console.warn('🆕 [DELETE DEBUG] No conversations left; creating a new one...');
          setCurrentConversation('');
          handleNewChat();
        }
      }

      console.warn('🎉 [DELETE DEBUG] Delete flow completed');

      console.warn('🔄 [DELETE DEBUG] Reloading conversations to ensure sync...');
      try {
        const conversationsResponse = await apiClient.getConversations();
        if (!conversationsResponse.success || !conversationsResponse.data) {
          if (conversationsResponse.status === 401) {
            handleUnauthorized();
          } else {
            console.error('Failed to reload conversations:', conversationsResponse.error);
          }
        } else {
          console.warn('📋 [DELETE DEBUG] Server conversation count after reload:', conversationsResponse.data.length);
          setConversations(conversationsResponse.data.map(conv => ({
            id: conv.id,
            title: conv.title,
            messages: [],
            lastUpdated: new Date(conv.updated_at)
          })));
        }
      } catch (reloadError) {
        console.error('❌ [DELETE DEBUG] Failed to reload conversations:', reloadError);
      }
    } catch (error) {
      console.error('❌ [DELETE DEBUG] Delete conversation threw:', error);
      alert('Failed to delete the conversation. Please try again later.');
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
          console.log(`Streaming experiment_id check attempt ${attempt}`);
          const latestExperimentId = await fetchLatestExperimentId();
          if (latestExperimentId) {
            console.log('✅ experiment_id acquired mid-stream:', latestExperimentId);
            applyExperimentIdToAssistantMessage(latestExperimentId);
            return;
          }
        } catch (streamError) {
          console.error('Failed to obtain experiment_id during stream:', streamError);
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
          console.log(`Post-stream experiment_id check attempt ${attempt}`);
          const latestExperimentId = await fetchLatestExperimentId();
          if (latestExperimentId) {
            console.log('✅ experiment_id fetched:', latestExperimentId);
            applyExperimentIdToAssistantMessage(latestExperimentId);
            return;
          }
        } catch (error) {
          console.error('Failed to fetch experiment_id:', error);
        }

        if (!hasResolvedExperimentId && attempt < maxAttempts) {
          setTimeout(() => {
            void pollExperimentIdAfterStream(attempt + 1, maxAttempts);
          }, 1000);
        } else if (!hasResolvedExperimentId) {
          console.warn('⚠️ Max retries reached without resolving experiment_id');
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
        console.log('🔧 Starting experiment_id polling right after user input');
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
      console.error('Failed to generate experiment:', error);
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

  return (
    <div className="h-screen flex relative" style={{ backgroundColor: '#2D3748' }}>
      {/* Hover target to reveal the sidebar when it is collapsed */}
      {!isSidebarOpen && (
        <div 
          className="fixed left-0 top-0 h-full z-30"
          style={{ width: 'calc(100vw / 6)' }}
          onMouseEnter={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Conversation sidebar occupying roughly one-sixth of the viewport */}
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
                // Load messages the first time this conversation is opened
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

      {/* Primary content area */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-4 right-4 sm:right-6 z-20">
          <div className="flex items-center gap-3 px-4 py-2 bg-dark-bg-secondary border border-dark-border rounded-full shadow-lg">
            <div className="w-8 h-8 rounded-full bg-primary text-white font-semibold flex items-center justify-center border border-primary/70">
              {userInitial}
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-dark-bg-tertiary border border-dark-border text-dark-text hover:bg-dark-bg-secondary transition-colors"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Message stream */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 pt-24 pb-32 relative">
          {!isLoading && currentConversation && conversations.find(c => c.id === currentConversation) ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Display the hero state only while the conversation is empty */}
              {conversations.find(c => c.id === currentConversation)?.messages.length === 0 && (
                <div className="flex-1 flex justify-center relative" style={{ paddingTop: 'calc(33.33vh - 2rem)' }}>
                  {/* Light rays background */}
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

                        {/* Show the demo button when the assistant returned an experiment ID */}
                        {message.experiment_id && streamingMessageId !== message.id && (
                          <div className="mt-4 pt-3 border-t border-dark-border">
                            <button
                              onClick={() =>
                                navigate(`/demo/${message.experiment_id}`, {
                                  state: { conversationId: currentConversation }
                                })
                              }
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
              {/* Light rays background */}
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
          
          {/* Scroll-to-bottom shortcut */}
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

        {/* Input section */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-3/5">
          <div className="bg-dark-bg-secondary border border-dark-border rounded-3xl shadow-2xl p-3 w-full">
            {/* Compose and send controls */}
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
      
      {/* Donation button is only visible on the home page */}
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
