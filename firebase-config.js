// Configuración pública de Firebase Web.
// Reemplaza estos valores por los de tu proyecto en Firebase Console > Project settings > Your apps.
// La información de pendientes se guarda en Cloud Firestore; esta app no utiliza localStorage para los datos.
export const firebaseConfig = {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "REEMPLAZAR_PROJECT_ID.firebaseapp.com",
  projectId: "REEMPLAZAR_PROJECT_ID",
  storageBucket: "REEMPLAZAR_PROJECT_ID.appspot.com",
  messagingSenderId: "REEMPLAZAR_MESSAGING_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID"
};

export const firebaseConfigured = !Object.values(firebaseConfig).some((value) =>
  String(value).includes('REEMPLAZAR')
);
