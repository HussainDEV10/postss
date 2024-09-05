import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
const fileInput = document.getElementById('fileInput'); // عنصر لإدخال الصورة أو الفيديو
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
let lastDeletedPost = null;

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
            setTimeout(() => notification.remove(), 300); // إزالة الإشعار بعد 300 مللي ثانية
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
        try {
            await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
            showNotification('تم إسترجاع المنشور', 'restore');
            displayPosts();
            lastDeletedPost = null;
        } catch (error) {
            showNotification('فشل في إسترجاع المنشور: ' + error.message, 'error');
        }
    }
};

function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

const uploadFile = async (file) => {
    const storageRef = ref(storage, `uploads/${file.name}`);
    try {
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);
        return fileURL;
    } catch (error) {
        throw new Error('فشل في رفع الملف: ' + error.message);
    }
};

const publishPost = async (title, description, fileURL) => {
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    if (title && description && author && authorEmail) {
        try {
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
        } catch (error) {
            showNotification('فشل في نشر المنشور: ' + error.message, 'error');
        }
    }
};

const displayPosts = async () => {
    try {
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
    } catch (error) {
        showNotification('فشل في عرض المنشورات: ' + error.message, 'error');
    }
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
    const file = fileInput.files[0]; // الحصول على الملف
    let fileURL = '';

    if (file) {
        try {
            fileURL = await uploadFile(file); // رفع الملف والحصول على الرابط
        } catch (error) {
            showNotification('فشل في رفع الملف: ' + error.message, 'error');
            return;
        }
    }

    try {
        await publishPost(title, description, fileURL); // نشر المنشور مع الرابط
    } catch (error) {
        showNotification('فشل في نشر المنشور: ' + error.message, 'error');
    }
});

postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.dataset.id;
        try {
            const postDoc = await getDoc(doc(db, "posts", postId));
            const postData = postDoc.data();
            // التحقق من أن صاحب المنشور هو نفس المستخدم الذي يحاول الحذف
            if (postData.authorEmail === localStorage.getItem('email')) {
                lastDeletedPost = { id: postId, data: postData };
                await deleteDoc(doc(db, "posts", postId));
                showNotification('تم حذف المنشور', 'delete');
                displayPosts();
            } else {
                showNotification('لا يمكنك حذف منشور ليس لك', 'error');
            }
        } catch (error) {
            showNotification('فشل في حذف المنشور: ' + error.message, 'error');
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
        showNotification('خطأ في تسجيل الخروج: ' + error.message, 'error');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded');
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = `${username}`;
    } else {
        usernameDisplay.textContent = 'مستخدم';
    }
    displayPosts(); // تأكد من أن هذه الدالة تعمل بدون أخطاء
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
