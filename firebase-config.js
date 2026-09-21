// ================================================================
// CẤU HÌNH FIREBASE — dự án "tienghancocham" của Cô Châm
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyC7uhZf-3Fu4OsdHcvSmTECnN761YouLZ4",
  authDomain: "tienghancocham-1bd93.firebaseapp.com",
  projectId: "tienghancocham-1bd93",
  storageBucket: "tienghancocham-1bd93.firebasestorage.app",
  messagingSenderId: "40234579680",
  appId: "1:40234579680:web:8aba17e10134e5bab78285"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
