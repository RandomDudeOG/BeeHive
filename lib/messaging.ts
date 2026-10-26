import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  runTransaction, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { aiCall } from '@/lib/ai-client';

// ============================================================================
// TYPES
// ============================================================================

export interface Conversation {
  id?: string;
  participants: string[];
}

export interface ModerationResult {
  safe: boolean;
  category: 'safe' | 'toxic' | 'spam' | 'inappropriate';
  confidence: number;
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  flagged: boolean;
  category: string;
  status: 'sent' | 'flagged' | 'hidden';
  reports: number;
  reportedBy: string[];
}

export interface MessageLog {
  id?: string;
  to: string;
  from: string;
  text: string;
  timestamp: number;
  flagged: boolean;
  category: string;
  aiConfidence: number;
}

export interface ModerationStatus {
  flagCount: number;
  lastFlaggedAt: number;
  restricted: boolean;
}

export interface FlaggedMessage {
  id?: string;
  messageRef: string;
  senderId: string;
  receiverId: string;
  text: string;
  category: string;
  flaggedAt: number;
  aiConfidence: number;
  reports: number;
}

// ============================================================================
// MODERATION
// ============================================================================

/**
 * Moderates a message via the server-side AI route (the Gemini key never reaches the browser).
 */
export async function moderateMessage(text: string): Promise<ModerationResult> {
  return aiCall<ModerationResult>({ action: 'moderate', text });
}

// ============================================================================
// CORE MESSAGING
// ============================================================================

/**
 * Gets or creates a conversation between two users using a deterministic ID.
 */
export async function getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
  // Deterministic ID ensures we don't create duplicates
  const conversationId = [user1Id, user2Id].sort().join('_');
  const convRef = doc(db, 'conversations', conversationId);
  
  const snap = await getDoc(convRef);
  if (!snap.exists()) {
    await setDoc(convRef, {
      participants: [user1Id, user2Id]
    });
  }
  
  return conversationId;
}

/**
 * Gets all conversations for a user.
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
}

/**
 * Sends a message, runs moderation, and updates all necessary collections.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<{ flagged: boolean; category?: string }> {
  // 1. Moderate the message
  const moderation = await moderateMessage(text);
  const isFlagged = !moderation.safe;
  const status = isFlagged ? 'flagged' : 'sent';
  const timestamp = Date.now();

  const batch = writeBatch(db);

  // 2. Create Message Object
  const messageRef = doc(collection(db, `conversations/${conversationId}/messages`));
  const messageId = messageRef.id;

  const messageData: Message = {
    senderId,
    receiverId,
    text,
    timestamp,
    flagged: isFlagged,
    category: moderation.category,
    status,
    reports: 0,
    reportedBy: []
  };

  batch.set(messageRef, messageData);

  // 3. Save to Sender's Message Logs
  const senderLogRef = doc(db, `users/${senderId}/messageLogs`, messageId);
  const logData: MessageLog = {
    to: receiverId,
    from: senderId,
    text,
    timestamp,
    flagged: isFlagged,
    category: moderation.category,
    aiConfidence: moderation.confidence
  };
  batch.set(senderLogRef, logData);

  // 4. Handle Flagged Messages & User Moderation Status
  if (isFlagged) {
    // Store in flaggedMessages
    const flaggedMsgRef = doc(db, 'flaggedMessages', messageId);
    const flaggedData: FlaggedMessage = {
      messageRef: messageRef.path,
      senderId,
      receiverId,
      text,
      category: moderation.category,
      flaggedAt: timestamp,
      aiConfidence: moderation.confidence,
      reports: 0
    };
    batch.set(flaggedMsgRef, flaggedData);

    // Update User Moderation Stats
    const modStatusRef = doc(db, `users/${senderId}/moderation`, 'status');
    const modStatusSnap = await getDoc(modStatusRef);
    
    let currentFlagCount = 0;
    if (modStatusSnap.exists()) {
      currentFlagCount = modStatusSnap.data().flagCount || 0;
    }

    const newFlagCount = currentFlagCount + 1;
    const isRestricted = newFlagCount >= 5; // Threshold for restriction

    batch.set(modStatusRef, {
      flagCount: newFlagCount,
      lastFlaggedAt: timestamp,
      restricted: isRestricted
    }, { merge: true });
  }

  // Ensure conversation participants are set
  const convRef = doc(db, 'conversations', conversationId);
  batch.set(convRef, {
    participants: [senderId, receiverId]
  }, { merge: true });

  await batch.commit();

  return { flagged: isFlagged, category: moderation.category };
}

/**
 * Reports a message. If reports >= 3, hides the message and updates flaggedMessages.
 */
export async function reportMessage(
  conversationId: string,
  messageId: string,
  reporterId: string
): Promise<void> {
  const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
  const flaggedMsgRef = doc(db, 'flaggedMessages', messageId);

  await runTransaction(db, async (transaction) => {
    const messageSnap = await transaction.get(messageRef);
    if (!messageSnap.exists()) {
      throw new Error("Message does not exist!");
    }

    const messageData = messageSnap.data() as Message;
    
    if (messageData.reportedBy.includes(reporterId)) {
      throw new Error("User already reported this message.");
    }

    const newReports = (messageData.reports || 0) + 1;
    const newReportedBy = [...(messageData.reportedBy || []), reporterId];
    
    let newStatus = messageData.status;
    let isNowHidden = false;

    if (newReports >= 3) {
      newStatus = 'hidden';
      isNowHidden = true;
    }

    // Update the message document
    transaction.update(messageRef, {
      reports: newReports,
      reportedBy: newReportedBy,
      status: newStatus
    });

    // If it becomes hidden or was already flagged, update flaggedMessages
    if (isNowHidden || messageData.flagged) {
      if (messageData.flagged || newReports > 3) {
        // It already exists in flaggedMessages
        transaction.update(flaggedMsgRef, {
          reports: newReports
        });
      } else if (newReports === 3) {
        // It just became hidden, so it doesn't exist in flaggedMessages yet
        const newFlaggedData: FlaggedMessage = {
          messageRef: messageRef.path,
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          text: messageData.text,
          category: 'user_reported',
          flaggedAt: Date.now(),
          aiConfidence: 0,
          reports: newReports
        };
        transaction.set(flaggedMsgRef, newFlaggedData);
      }
    }
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Gets all messages in a conversation.
 */
export async function getAllMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}

/**
 * Gets only visible messages (status == 'sent') in a conversation.
 */
export async function getVisibleMessages(conversationId: string): Promise<Message[]> {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    where('status', '==', 'sent'),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
}

/**
 * Gets all flagged messages across the platform.
 */
export async function getFlaggedMessages(): Promise<FlaggedMessage[]> {
  const q = query(
    collection(db, 'flaggedMessages'),
    orderBy('flaggedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlaggedMessage));
}

/**
 * Gets a user's message logs.
 */
export async function getUserMessageLogs(userId: string): Promise<MessageLog[]> {
  const q = query(
    collection(db, `users/${userId}/messageLogs`),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
}

/**
 * Gets moderation stats for a user.
 */
export async function getUserModerationStats(userId: string): Promise<ModerationStatus | null> {
  const docRef = doc(db, `users/${userId}/moderation`, 'status');
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as ModerationStatus;
  }
  return null;
}
