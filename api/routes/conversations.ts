import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase.js';

const router = express.Router();

// Get all sessions
router.get('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create new session
router.post('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    const session = await DatabaseService.createConversation(title);
    
    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Failed to create session:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all messages in session
router.get('/:sessionId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { sessionId } = req.params;
    const messages = await DatabaseService.getMessages(sessionId);
    res.json(messages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create message in session
router.post('/:sessionId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { sessionId } = req.params;
    const { role, content, title } = req.body;
    
    if (!role || !['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'role must be user or assistant' });
    }
    
    if (role === 'user' && !content) {
      return res.status(400).json({ error: 'User message content cannot be empty' });
    }
    
    const normalizedRole = role as 'user' | 'assistant';
    
    const message = await DatabaseService.createMessage({
      conversation_id: sessionId,
      type: normalizedRole,
      content: content || '',
      title
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

// Update session title
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update session' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete session
router.delete('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    
    const success = await DatabaseService.deleteConversation(id);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete session' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
