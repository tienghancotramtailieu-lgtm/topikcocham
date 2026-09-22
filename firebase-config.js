// ================================================================
// CẤU HÌNH FIREBASE — dự án "topik-co-cham" (riêng cho web TOPIK)
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyANC3UXqLzvI9rurorANaz9HadMbG_8944",
  authDomain: "topik-co-cham.firebaseapp.com",
  projectId: "topik-co-cham",
  storageBucket: "topik-co-cham.firebasestorage.app",
  messagingSenderId: "672025201059",
  appId: "1:672025201059:web:b9ec88f95b26a0cc7bf216"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
