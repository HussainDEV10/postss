import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const postList = document.getElementById('postList');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postMediaInput = document.getElementById('postMedia');

const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
    querySnapshot.forEach((doc) => {
        const postData = doc.data();
        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.innerHTML = `
            <h3 class="post-title">${postData.title}</h3>
            <p class="post-description">${postData.description}</p>
            ${postData.mediaUrl ? `<img src="${postData.mediaUrl}" class="post-media">` : ''}
            ${postData.videoUrl ? `<video src="${postData.videoUrl}" class="post-video" controls></video>` : ''}
        `;
        postList.appendChild(postItem);
    });
};

publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value;
    const description = postDescriptionInput.value;
    const file = postMediaInput.files[0];

    if (!title || !description || !file) {
        alert("يرجى ملء جميع الحقول واختيار صورة أو فيديو!");
        return;
    }

    let mediaUrl = null;
    let videoUrl = null;

    const storageRef = ref(storage, `media/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    if (file.type.startsWith("image/")) {
        mediaUrl = downloadUrl;
    } else if (file.type.startsWith("video/")) {
        videoUrl = downloadUrl;
    }

    await addDoc(collection(db, "posts"), {
        title,
        description,
        mediaUrl,
        videoUrl,
        timestamp: serverTimestamp()
    });

    postTitleInput.value = '';
    postDescriptionInput.value = '';
    postMediaInput.value = '';

    displayPosts();
});

displayPosts();
