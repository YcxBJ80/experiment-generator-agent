import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase.js';

const router = express.Router();

// 获取所有对话
router.get('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 创建新对话
router.post('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    
    const conversation = await DatabaseService.createConversation(title);
    
    if (!conversation) {
      return res.status(500).json({ error: '创建对话失败' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('创建对话错误:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
});

// 获取对话的所有消息
router.get('/:conversationId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('获取消息错误:', error);
    res.status(500).json({ error: '获取消息失败' });
  }
});

// 在对话中创建消息
router.post('/:conversationId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversationId } = req.params;
    const { role, content } = req.body;
    
    if (!role || !['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'role必须是user或assistant' });
    }
    
    if (role === 'user' && !content) {
      return res.status(400).json({ error: '用户消息的content不能为空' });
    }
    
    const message = await DatabaseService.createMessage({
      conversation_id: conversationId,
      type: role,
      content: content || ''
    });
    
    if (!message) {
      return res.status(500).json({ error: '创建消息失败' });
    }
    
    res.json({ data: message });
  } catch (error) {
    console.error('创建消息错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 更新对话标题
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: '更新对话失败' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('更新对话错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 删除对话
router.delete('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    
    const success = await DatabaseService.deleteConversation(id);
    
    if (!success) {
      return res.status(500).json({ error: '删除对话失败' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除对话错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;