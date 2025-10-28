import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all sessions
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conversations = await DatabaseService.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create new session
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    const session = await DatabaseService.createConversation(title, userId);
    
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
router.get('/:sessionId/messages', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sessionId } = req.params;
    const messages = await DatabaseService.getMessages(sessionId, userId);
    res.json(messages);
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create message in session
router.post('/:sessionId/messages', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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
      title,
      user_id: userId
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
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user?.id;
    
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title, userId);
    
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
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const success = await DatabaseService.deleteConversation(id, userId);
    
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
