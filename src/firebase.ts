import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Reemplaza estos valores con la configuración real de tu proyecto de Firebase
// Puedes encontrarlos en la consola de Firebase -> Project Settings -> General
const firebaseConfig = {
    apiKey: "AIzaSyAAjsYq2ElCTwm--VJyK9q5h4oF6VxRFdg", // Copiada de tu captura
    authDomain: "buzzy-app-8086f.firebaseapp.com",
    projectId: "buzzy-app-8086f",
    storageBucket: "buzzy-app-8086f.firebasestorage.app",
    messagingSenderId: "993295175092",
    appId: "1:993295175092:web:84a695e81329401dedb6e1",
    measurementId: "G-W1NH6JYNZH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
