import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase';

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
    const conversation = await DatabaseService.createConversation(title);
    if (!conversation) {
      return res.status(400).json({ error: 'Failed to create conversation' });
    }
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// 更新对话标题
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// 删除对话
router.delete('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    
    const success = await DatabaseService.deleteConversation(id);
    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 获取特定对话的消息
router.get('/:id/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;