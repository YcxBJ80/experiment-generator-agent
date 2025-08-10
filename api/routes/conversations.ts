import express, { Request, Response } from 'express';
import { DatabaseService } from '../lib/supabase';

const router = express.Router();

// Get all conversations
router.get('/', async (req: Request, res: Response) => {
  try {
    const conversations = await DatabaseService.getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation
router.post('/', async (req: Request, res: Response) => {
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

// Update conversation title
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const success = await DatabaseService.updateConversationTitle(id, title);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update conversation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await DatabaseService.deleteConversation(id);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get messages for a specific conversation
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const messages = await DatabaseService.getMessages(id);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;