import express from 'express';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DatabaseService } from '../lib/supabase.js';

const router = express.Router();

// Get all conversations
router.get('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation
router.post('/', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { title } = req.body;
    const conversation = await DatabaseService.createConversation(title);
    
    if (!conversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a specific conversation
router.get('/:conversationId/messages', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Update conversation title
router.put('/:id', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update conversation title' });
    }
    
    res.json({ success: true, message: 'Conversation title updated' });
  } catch (error) {
    console.error('Error updating conversation title:', error);
    res.status(500).json({ error: 'Failed to update conversation title' });
  }
});

export default router;