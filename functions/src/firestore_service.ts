import * as admin from 'firebase-admin';
import { ChatMessage, ChatSession, UserProfile } from './models';

const db = admin.firestore();

export async function createChatSession(userId: string): Promise<string> {
  const ref = await db.collection('chat_sessions').add({
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  } satisfies Partial<ChatSession>);
  return ref.id;
}

export async function appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
  await db.collection('chat_sessions').doc(sessionId).collection('messages').add(message);
  await db.collection('chat_sessions').doc(sessionId).update({
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const doc = await db.collection('user_profiles').doc(uid).get();
  return doc.exists ? (doc.data() as UserProfile) : null;
}

export async function cacheBusinessDatum(documentId: string, data: Record<string, unknown>): Promise<void> {
  await db.collection('business_data_cache').doc(documentId).set(
    {
      ...data,
      lastSync: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}
