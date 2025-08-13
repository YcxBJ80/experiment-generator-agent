import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase.js';

const router = express.Router();

// Get all conversations
router.get('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create new conversation
router.post('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    const conversation = await DatabaseService.createConversation(title);
    
    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all messages in conversation
router.get('/:conversationId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create message in conversation
router.post('/:conversationId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversationId } = req.params;
    const { role, content } = req.body;
    
    if (!role || !['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'role must be user or assistant' });
    }
    
    if (role === 'user' && !content) {
      return res.status(400).json({ error: 'User message content cannot be empty' });
    }
    
    const message = await DatabaseService.createMessage({
      conversation_id: conversationId,
      type: role,
      content: content || ''
    });
    
    if (!message) {
      return res.status(500).json({ error: 'Failed to create message' });
    }
    
    res.json({ data: message });
  } catch (error) {
    console.error('Failed to create message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update conversation title
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update conversation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update conversation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete conversation
router.delete('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    
    const success = await DatabaseService.deleteConversation(id);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;