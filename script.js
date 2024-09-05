import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

// إظهار الإشعارات
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}
        <div class="underline"></div>
    `;
    notificationContainer.innerHTML = ''; // مسح الإشعارات السابقة
    notificationContainer.appendChild(notification);

    // باقي كود الإشعارات هنا...
};

// استعادة المنشور المحذوف
const undoDelete = async () => {
    if (lastDeletedPost) {
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم إسترجاع المنشور', 'restore');
        displayPosts();
        lastDeletedPost = null;
    }
};

// تحويل النصوص إلى روابط قابلة للنقر
function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

// عرض المنشورات
const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي
    const currentUserEmail = localStorage.getItem('email'); // الحصول على البريد الإلكتروني للمستخدم الحالي
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);

        // تنسيق الوقت والتاريخ
        let hours = timestamp.getHours();
        const minutes = timestamp.getMinutes().toString().padStart(2, '0');
        const seconds = timestamp.getSeconds().toString().padStart(2, '0');
        const period = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12;
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${period}`;
        const day = timestamp.getDate().toString().padStart(2, '0');
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
        const year = timestamp.getFullYear();
        const formattedDate = `${year}/${month}/${day}`;

        // إنشاء العنصر الخاص بالمنشور
        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.style.fontFamily = 'Rubik, sans-serif';
        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            <p class="post-author">من قِبل: ${data.author}</p> <!-- عرض اسم المستخدم -->
            <p class="post-time">${formattedDate} | ${formattedTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

// فتح واجهة إضافة المنشور
addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
});

// إغلاق واجهة إضافة المنشور
closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
});

// نشر المنشور
publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    
    if (title && description && author && authorEmail) {
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            timestamp: serverTimestamp()
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        overlay.classList.remove('show');
        showNotification('تم نشر المنشور بنجاح!', 'publish');
        displayPosts();
    }
});

// حذف المنشور
postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.dataset.id;
        const postDoc = await getDoc(doc(db, "posts", postId));
        const postData = postDoc.data();

        // التحقق من أن البريد الإلكتروني يطابق صاحب المنشور
        if (postData.authorEmail === localStorage.getItem('email')) {
            lastDeletedPost = { id: postId, data: postData };
            await deleteDoc(doc(db, "posts", postId));
            showNotification('تم حذف المنشور', 'delete');
            displayPosts();
        } else {
            showNotification('لا يمكنك حذف منشور ليس لك', 'error');
        }
    }
});

// تسجيل الخروج
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

// تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = `${username}`;
    } else {
        usernameDisplay.textContent = 'مستخدم';
    }
    displayPosts();
});

// مراقبة حالة المستخدم
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    } else {
        localStorage.setItem('username', user.displayName || 'مستخدم');
        localStorage.setItem('email', user.email);  // تخزين البريد الإلكتروني }
});
