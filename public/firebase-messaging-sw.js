importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const q = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: q.get('apiKey'),
  authDomain: q.get('authDomain'),
  projectId: q.get('projectId'),
  messagingSenderId: q.get('messagingSenderId'),
  appId: q.get('appId'),
});

firebase.messaging();
