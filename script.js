import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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

const usernameDisplay = document.getElementById('usernameDisplay');
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
let lastDeletedPost = null;

const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}
    `;
    notificationContainer.innerHTML = ''; // Clear existing notifications
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 300);
    }, 3000);

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
    postList.innerHTML = ''; // Clear current content before display
    const currentUserEmail = localStorage.getItem('email'); // Get current user's email

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.style.fontFamily = 'Rubik, sans-serif';
        postItem.innerHTML = `
            ${currentUserEmail === 'trendshussain@gmail.com' ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${data.description}</p>
            <p class="post-author">من قِبل: ${data.author}</p>
            <p class="post-time">${new Date(data.timestamp.seconds * 1000).toLocaleString()}</p>
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
    const author = localStorage.getItem('username'); // استخدام اسم المستخدم من التخزين المحلي
    if (title && description && author) {
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            timestamp: serverTimestamp()
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        overlay.classList.remove('show');
        showNotification('تم نشر المنشور بنجاح!', 'publish');
        displayPosts();
    } else {
        showNotification('يرجى إدخال عنوان ووصف للمنشور', 'error');
    }
});

postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.dataset.id;
        const postDoc = doc(db, "posts", postId);
        const postData = (await getDoc(postDoc)).data();

        // تحقق من أن المستخدم الحالي هو صاحب المنشور قبل الحذف
        if (localStorage.getItem('email') === 'trendshussain@gmail.com') {
            lastDeletedPost = { id: postId, data: postData };
            await deleteDoc(postDoc);
            showNotification('تم حذف المنشور', 'delete');
            displayPosts();
        } else {
            showNotification('لا يمكنك حذف منشور ليس لك', 'error');
        }
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    if (username) {
        usernameDisplay.textContent = `${username}`;
    } else {
        usernameDisplay.textContent = 'مستخدم';
    }
    displayPosts();
});

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    } else {
        localStorage.setItem('username', user.displayName || `{username}`);
        localStorage.setItem('email', user.email); // تخزين البريد الإلكتروني للمستخدم
    }
});
