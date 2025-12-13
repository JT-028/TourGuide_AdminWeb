// Firebase Configuration for TourApp Admin Web Interface
// This configuration connects to the same Firebase project as the Android app

const firebaseConfig = {
    apiKey: "AIzaSyBDF1FPiNiOuJiIO1rarzJtQCyQUgyq0Q4",
    authDomain: "tourapp-69eaf.firebaseapp.com",
    projectId: "tourapp-69eaf",
    storageBucket: "tourapp-69eaf.firebasestorage.app",
    messagingSenderId: "625079611731",
    appId: "1:625079611731:web:admin-interface"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Initialize functions service only if available (not all pages need it)
let functions = null;
try {
    if (typeof firebase.functions === 'function') {
        functions = firebase.functions();
    }
} catch (error) {
    console.log('Firebase Functions not available on this page');
}

// Firebase collections references
const usersCollection = db.collection('users');
const tripsCollection = db.collection('trips');
const messagesCollection = db.collection('messages');
const locationsCollection = db.collection('locations');

// Export for use in other files
window.firebaseServices = {
    auth,
    db,
    storage,
    functions,
    usersCollection,
    tripsCollection,
    messagesCollection,
    locationsCollection
};
