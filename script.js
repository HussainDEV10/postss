import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

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
const storage = getStorage(app);

const usernameDisplay = document.getElementById('usernameDisplay');
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const fileInput = document.getElementById('fileInput');  // عنصر لإدخال الصورة أو الفيديو
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
let lastDeletedPost = null;

const showNotification = (message, type) => {
    // ... محتوى دالة الإشعار كما هو ...
};

const uploadFile = async (file) => {
    const storageRef = ref(storage, `uploads/${file.name}`);
    await uploadBytes(storageRef, file);
    const fileURL = await getDownloadURL(storageRef);
    return fileURL;
};

const publishPost = async (title, description, fileURL) => {
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    if (title && description && author && authorEmail) {
        await addDoc(collection(db, "posts"), {
            title,
            description,
            fileURL, // إضافة رابط الصورة أو الفيديو
            author,
            authorEmail,
            timestamp: serverTimestamp()
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        fileInput.value = ''; // تفريغ حقل الملف
        overlay.classList.remove('show');
        showNotification('تم نشر المنشور بنجاح!', 'publish');
        displayPosts();
    }
};

publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const file = fileInput.files[0]; // الحصول على الملف
    let fileURL = '';

    if (file) {
        fileURL = await uploadFile(file); // رفع الملف والحصول على الرابط
    }

    publishPost(title, description, fileURL); // نشر المنشور مع الرابط
});

const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
    const currentUserEmail = localStorage.getItem('email'); // الحصول على البريد الإلكتروني للمستخدم الحالي
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);

        let hours = timestamp.getHours();
        const minutes = timestamp.getMinutes().toString().padStart(2, '0');
        const seconds = timestamp.getSeconds().toString().padStart(2, '0');
        const period = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12 || 12; // تحويل الساعة لنظام 12 ساعة
        const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds} ${period}`;
        const day = timestamp.getDate().toString().padStart(2, '0');
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
        const year = timestamp.getFullYear();
        const formattedDate = `${year}/${month}/${day}`;
        const arabicNumbers = (number) => {
            const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
            return number.split('').map(digit => arabicDigits[digit] || digit).join('');
        };

        const arabicFormattedTime = arabicNumbers(formattedTime);
        const arabicFormattedDate = arabicNumbers(formattedDate);
        const formattedDateTime = `
            <span dir="rtl">${arabicFormattedDate}</span> | ${arabicFormattedTime}
        `;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.style.fontFamily = 'Rubik, sans-serif';
        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            ${data.fileURL ? `<p><a href="${data.fileURL}" target="_blank">عرض الوسائط</a></p>` : ''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

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
        const displayName = user.displayName || localStorage.getItem('username');
        localStorage.setItem('username', displayName);
        localStorage.setItem('email', user.email);
    }
});
