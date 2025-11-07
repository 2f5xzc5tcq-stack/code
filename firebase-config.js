const firebaseConfig = {
  apiKey: "AIzaSyCGsy5DvM95clZLQJLajkIKtqCPLoWEiqY",
  authDomain: "quiz-be35a.firebaseapp.com",
  databaseURL: "https://quiz-be35a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "quiz-be35a",
  storageBucket: "quiz-be35a.firebasestorage.app",
  messagingSenderId: "273159571040",
  appId: "1:273159571040:web:99ba579643d010f42f6505"
};

if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
}
