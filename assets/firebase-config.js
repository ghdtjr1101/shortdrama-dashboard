// Firebase 웹 설정 (공개용 식별자라 저장소에 있어도 괜찮음. 실제 보안은 Firestore 규칙이 담당)
export const firebaseConfig = {
  apiKey: "AIzaSyA6ML_2Yu62ATzcDz3PANKHasSAieVdTzA",
  authDomain: "studio-facet.firebaseapp.com",
  projectId: "studio-facet",
  storageBucket: "studio-facet.firebasestorage.app",
  messagingSenderId: "1070897013061",
  appId: "1:1070897013061:web:df6095c562bf9e11695e2c",
};

// 수정 권한이 있는 구글 계정
export const EDITORS = ["ghdtjr1101@gmail.com", "coalrla@gmail.com"];
