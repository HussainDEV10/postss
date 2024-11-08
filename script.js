// إعداد Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

// تكوين Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBwIhzy0_RBqhMBlvJxbs5_760jP-Yv2fw",
    authDomain: "facebookweb-2030.firebaseapp.com",
    projectId: "facebookweb-2030",
    storageBucket: "facebookweb-2030.appspot.com",
    messagingSenderId: "912333220741",
    appId: "1:912333220741:web:1c7425f4248b7465b45c67",
    measurementId: "G-ZJ6M2D8T3M"
};

// تهيئة التطبيق و Firestore و Auth و Storage
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// عناصر HTML
const usernameDisplay = document.getElementById('usernameDisplay');
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
let lastDeletedPost = null;

// دالة عرض الإشعارات
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

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => notification.classList.add('hide'), 5000);
    setTimeout(() => notification.remove(), 5500);

    if (type === 'delete') {
        document.getElementById('undoBtn').addEventListener('click', undoDelete);
    }
};

// دالة استرجاع المنشور بعد الحذف
const undoDelete = async () => {
    if (lastDeletedPost) {
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم إسترجاع المنشور', 'restore');
        displayPosts();
        lastDeletedPost = null;
    }
};

// دالة لتحويل الروابط داخل النص إلى روابط قابلة للنقر
function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

// دالة لعرض المنشورات
const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
        const currentUserEmail = localStorage.getItem('email');

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = new Date(data.timestamp.seconds * 1000);
            let hours = timestamp.getHours();
            const minutes = timestamp.getMinutes().toString().padStart(2, '0');
            const period = hours >= 12 ? 'م' : 'ص';
            hours = hours % 12 || 12;
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes} ${period}`;
            const day = timestamp.getDate().toString().padStart(2, '0');
            const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
            const year = timestamp.getFullYear();
            const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
            const formattedDate = `${day}/${month}/${year}`;
            const arabicFormattedDate = formattedDate.replace(/\d/g, (d) => arabicDigits[d]);
            const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${formattedTime}`;

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${
                    data.fileUrl 
                    ? data.fileType === 'image' 
                        ? `<img src="${data.fileUrl}" alt="Media" class="post-media" style="max-width: 100%; height: auto;" />` 
                        : `<video src="${data.fileUrl}" controls class="post-media" style="max-width: 100%; height: auto;"></video>`
                    : ''
                }
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
                <p class="post-time">${formattedDateTime}</p>
            `;
            postList.appendChild(postItem);
        });
    } catch (error) {
        showNotification("حدث خطأ أثناء تحميل المنشورات", "error");
    }
};

// دالة نشر منشور جديد
publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];
    
    if (title && description && author && authorEmail) {
        let fileUrl = '';
        let fileType = '';

        if (file) {
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(storageRef);
            fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : '');
        }
        
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            fileUrl,
            fileType,
            timestamp: serverTimestamp()
        });

        showNotification("تم نشر المنشور بنجاح", "success");
        overlay.classList.remove('show');
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        postFileInput.value = '';
        displayPosts();
    } else {
        showNotification("يرجى ملء جميع الحقول", "error");
    }
});

// دالة تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من حالة تسجيل الدخول
const checkAuthState = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('email', user.email);
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                localStorage.setItem('username', userData.username);
                usernameDisplay.textContent = userData.username || "مستخدم";
            } else {
                usernameDisplay.textContent = "مستخدم";
            }
            displayPosts();
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
        }
    });
};

// استدعاء التحقق من حالة تسجيل الدخول عند تحميل الصفحة
checkAuthState();
