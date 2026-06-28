import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, Habit, Goal, ActivityLog, ChatSession } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Error handler conforming to standard firebase-integration guidelines
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 2. Auth State Listening
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// 3. Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      console.warn('Did not receive calendar access token on popup sign-in, but login succeeded.');
    }
    cachedAccessToken = credential?.accessToken || null;
    
    // Create/update user document profile
    const userDocRef = doc(db, 'users', result.user.uid);
    try {
      await setDoc(userDocRef, {
        uid: result.user.uid,
        name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        role: 'User'
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${result.user.uid}`);
    }

    return { user: result.user, accessToken: cachedAccessToken || '' };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// 4. Email Sign-Up
export const emailSignUp = async (email: string, password: string, name: string): Promise<User> => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    
    // Initialize profile doc
    const userDocRef = doc(db, 'users', cred.user.uid);
    try {
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        name: name,
        role: 'User'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${cred.user.uid}`);
    }

    return cred.user;
  } catch (error) {
    console.error('Email sign up error:', error);
    throw error;
  }
};

// 5. Email Sign-In
export const emailSignIn = async (email: string, password: string): Promise<User> => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (error) {
    console.error('Email sign in error:', error);
    throw error;
  }
};

// 6. Sign Out
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// 7. Validate connection as per standard guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error && (error.code === 'permission-denied' || error.message?.includes('permission-denied') || error.message?.includes('Permission denied'))) {
      return true;
    }
    console.error("Firebase connection check failed:", error);
    throw error;
  }
}

// 8. Firestore Data Services (User-Owned Documents)

// --- User Profile ---
export async function getUserProfile(userId: string): Promise<{ name: string; role: string } | null> {
  const path = `users/${userId}`;
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      return userSnap.data() as { name: string; role: string };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// --- Tasks ---
export async function loadUserTasks(userId: string): Promise<Task[]> {
  const path = `users/${userId}/tasks`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
    const items: Task[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Task);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserTask(userId: string, task: Task): Promise<void> {
  const path = `users/${userId}/tasks/${task.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'tasks', task.id), task);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserTask(userId: string, taskId: string): Promise<void> {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Habits ---
export async function loadUserHabits(userId: string): Promise<Habit[]> {
  const path = `users/${userId}/habits`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'habits'));
    const items: Habit[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Habit);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserHabit(userId: string, habit: Habit): Promise<void> {
  const path = `users/${userId}/habits/${habit.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'habits', habit.id), habit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserHabit(userId: string, habitId: string): Promise<void> {
  const path = `users/${userId}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Goals ---
export async function loadUserGoals(userId: string): Promise<Goal[]> {
  const path = `users/${userId}/goals`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'goals'));
    const items: Goal[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Goal);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserGoal(userId: string, goal: Goal): Promise<void> {
  const path = `users/${userId}/goals/${goal.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'goals', goal.id), goal);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserGoal(userId: string, goalId: string): Promise<void> {
  const path = `users/${userId}/goals/${goalId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Activity Logs ---
export async function loadUserActivityLogs(userId: string): Promise<ActivityLog[]> {
  const path = `users/${userId}/activityLogs`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'activityLogs'));
    const items: ActivityLog[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ date: doc.id, ...doc.data() } as ActivityLog);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserActivityLog(userId: string, log: ActivityLog): Promise<void> {
  const path = `users/${userId}/activityLogs/${log.date}`;
  try {
    await setDoc(doc(db, 'users', userId, 'activityLogs', log.date), {
      date: log.date,
      count: log.count
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserProfile(userId: string, profile: { name: string; role: string }): Promise<void> {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      name: profile.name,
      role: profile.role
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Chat Sessions ---
export async function loadUserChatSessions(userId: string): Promise<ChatSession[]> {
  const path = `users/${userId}/chatSessions`;
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'chatSessions'));
    const items: ChatSession[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as ChatSession);
    });
    // Sort by createdAt descending
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveUserChatSession(userId: string, session: ChatSession): Promise<void> {
  const path = `users/${userId}/chatSessions/${session.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'chatSessions', session.id), session);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserChatSession(userId: string, sessionId: string): Promise<void> {
  const path = `users/${userId}/chatSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'chatSessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
