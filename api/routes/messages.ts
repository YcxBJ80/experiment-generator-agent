import express from 'express';
import { DatabaseService } from '../lib/supabase.js';

const router = express.Router();

// Create a new message
router.post('/', async (req, res) => {
  try {
    const { conversation_id, content, type, experiment_id, html_content, css_content, js_content } = req.body;
    
    if (!conversation_id || !content || !type) {
      return res.status(400).json({ error: 'conversation_id, content, and type are required' });
    }
    
    const message = await DatabaseService.createMessage({
      conversation_id,
      content,
      type,
      experiment_id,
      html_content,
      css_content,
      js_content
    });
    
    if (!message) {
      return res.status(500).json({ error: 'Failed to create message' });
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Get messages for a conversation (this is also available in conversations route)
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await DatabaseService.getMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;