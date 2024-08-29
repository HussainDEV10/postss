import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBwIhzy0_RBqhMBlvJxbs5_760jP-Yv2fw",
    authDomain: "facebookweb-2030.firebaseapp.com",
    projectId: "facebookweb-2030",
    storageBucket: "facebookweb-2030.appspot.com",
    messagingSenderId: "912333220741",
    appId: "1:912333220741:web:1c7425f4248b7465b45c67",
    measurementId: "G-ZJ6M2D8T3M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const notificationContainer = document.getElementById('notificationContainer');

let lastDeletedPost = null;
let username = localStorage.getItem('username'); // جلب اسم المستخدم من localStorage

// التحقق من حالة تسجيل الدخول
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    } else {
        username = user.displayName || 'Anonymous';
    }
});

const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}
        <div class="underline"></div>
    `;
    notificationContainer.innerHTML = ''; // Clear existing notifications
    notificationContainer.appendChild(notification);

    let startX = 0;

    notification.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX;
    });

    notification.addEventListener('touchmove', (event) => {
        const touch = event.touches[0];
        const diffX = touch.clientX - startX;
        notification.style.transform = `translate(${diffX}px, 0)`;
    });

    notification.addEventListener('touchend', () => {
        const finalPosition = parseFloat(notification.style.transform.split('(')[1]);

        if (Math.abs(finalPosition) > 10) {
            notification.classList.add('hide');
            notification.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            setTimeout(() => notification.remove(), 300);
        } else {
            notification.style.transform = `translateX(0)`;
        }
    });

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => notification.classList.add('hide'), 5000);
    setTimeout(() => notification.remove(), 5500);

    if (type === 'delete') {
        document.getElementById('undoBtn').addEventListener('click', undoDelete);
    }
};

const undoDelete = async () => {
    if (lastDeletedPost) {
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم إسترجاع المنشور', 'restore');
        displayPosts();
        lastDeletedPost = null;
    }
};

const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);

        const formattedTime = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
        const formattedDate = `${timestamp.getFullYear()}/${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')}`;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.style.fontFamily = 'Rubik, sans-serif';
        postItem.innerHTML = `
            <button class="delete-btn" data-id="${doc.id}">🗑️</button>
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${data.description}</p>
            <p class="post-author">من قِبل: ${data.author}</p>
            <p class="post-time">${formattedDate} | ${formattedTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
});

closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
});

publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();

    if (title && description) {
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author: username, // استخدام اسم المستخدم من localStorage أو من Firebase Auth
            timestamp: serverTimestamp()
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        overlay.classList.remove('show');
        showNotification('تم نشر المنشور بنجاح!', 'publish');
        displayPosts();
    }
});

postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.dataset.id;
        const postDoc = await getDoc(doc(db, "posts", postId));
        lastDeletedPost = { id: postId, data: postDoc.data() };
        await deleteDoc(doc(db, "posts", postId));
        showNotification('تم حذف المنشور', 'delete');
        displayPosts();
    }
});

displayPosts();
