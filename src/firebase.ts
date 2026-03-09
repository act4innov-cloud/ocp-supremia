import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

// Auth Helpers
let isSigningIn = false;

export const signInWithGoogle = async () => {
  if (isSigningIn) return;
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Auth Error Detail:', error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("Erreur : Ce domaine n'est pas autorisé. Veuillez vérifier la configuration Firebase.");
    } else if (error.code === 'auth/popup-blocked') {
      alert("Erreur : Le popup a été bloqué. Veuillez autoriser les popups pour ce site.");
    } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      // Silently handle cancellation
    } else if (error.code === 'auth/internal-error' || error.message.includes('INTERNAL ASSERTION FAILED')) {
      alert("Une erreur interne est survenue. Veuillez rafraîchir la page et réessayer.");
    } else {
      alert("Erreur d'authentification : " + (error.message || "Erreur réseau ou configuration"));
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = () => auth.signOut();

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error('Email Login Error:', error);
    if (error.code === 'auth/operation-not-allowed') {
      alert("Erreur : La connexion par Email/Mot de passe n'est pas activée dans votre console Firebase. Veuillez l'activer dans l'onglet Authentication > Sign-in method.");
    } else {
      alert("Erreur de connexion : " + (error.message || "Identifiants invalides"));
    }
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error: any) {
    console.error('Registration Error:', error);
    if (error.code === 'auth/operation-not-allowed') {
      alert("Erreur : L'inscription par Email/Mot de passe n'est pas activée dans votre console Firebase. Veuillez l'activer dans l'onglet Authentication > Sign-in method.");
    } else {
      alert("Erreur d'inscription : " + (error.message || "Impossible de créer le compte"));
    }
    throw error;
  }
};
