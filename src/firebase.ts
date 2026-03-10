import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, updatePassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
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
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      // Silently handle cancellation
      return null;
    }
    
    console.error('Auth Error Detail:', error);
    if (error.code === 'auth/unauthorized-domain') {
      alert("Erreur : Ce domaine n'est pas autorisé dans la console Firebase. Veuillez ajouter les domaines suivants aux 'Domaines autorisés' dans Authentication > Settings : \n- ais-dev-vq2upgkmoko2wa5pcdvbo3-136729896699.europe-west2.run.app\n- ais-pre-vq2upgkmoko2wa5pcdvbo3-136729896699.europe-west2.run.app");
    } else if (error.code === 'auth/popup-blocked') {
      alert("Erreur : Le popup a été bloqué. Veuillez autoriser les popups pour ce site.");
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

export const updateUserProfile = async (name: string, photoURL: string) => {
  if (!auth.currentUser) throw new Error("Utilisateur non connecté");
  try {
    // Update Auth Profile
    await updateProfile(auth.currentUser, { displayName: name, photoURL });
    
    // Update Firestore Profile
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      displayName: name,
      photoURL: photoURL
    }).catch(e => {
      console.warn("Firestore profile update failed (might not exist yet):", e);
      // If document doesn't exist, it will be created by the listener in App.tsx
    });

    return auth.currentUser;
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    alert("Erreur lors de la mise à jour du profil : " + error.message);
    throw error;
  }
};

export const updateUserPassword = async (newPassword: string) => {
  if (!auth.currentUser) throw new Error("Utilisateur non connecté");
  try {
    await updatePassword(auth.currentUser, newPassword);
  } catch (error: any) {
    console.error('Update Password Error:', error);
    if (error.code === 'auth/requires-recent-login') {
      alert("Cette opération est sensible et nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter avant de réessayer.");
    } else {
      alert("Erreur lors de la mise à jour du mot de passe : " + error.message);
    }
    throw error;
  }
};

export const uploadProfileImage = async (file: File) => {
  if (!auth.currentUser) throw new Error("Utilisateur non connecté");
  
  const fileRef = ref(storage, `profiles/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('Upload Error:', error);
    throw new Error("Erreur lors de l'upload de l'image : " + error.message);
  }
};
