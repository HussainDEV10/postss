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
const undoBtn = document.createElement('button'); // زر الاسترجاع
let lastDeletedPost = null;

// فتح النموذج عند الضغط على زر "إضافة منشور"
addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
});

// إغلاق النموذج عند الضغط على زر "إغلاق"
closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
});

// تحويل النص إلى روابط قابلة للنقر
function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

// وظيفة لعرض المنشورات
const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
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
            <button class="delete-btn" data-id="${doc.id}">🗑️</button>
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            <p class="post-author">من قِبل: ${data.author}</p>
            <p class="post-time">${formattedDateTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

// حدث عند نشر منشور جديد
publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    if (title && description && author) {
        await addDoc(collection(db, "posts"), {
            title,
            description, // سيتم تحويل النص إلى رابط في وقت العرض
            author,
            timestamp: serverTimestamp()
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        overlay.classList.remove('show');
        showNotification('تم نشر المنشور بنجاح!', 'publish');
        displayPosts();
    }
});

// إزالة المنشور عند الضغط على زر الحذف
postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.dataset.id;
        const postDoc = await getDoc(doc(db, "posts", postId));
        lastDeletedPost = { id: postId, data: postDoc.data() };
        await deleteDoc(doc(db, "posts", postId));
        showNotification('تم حذف المنشور', 'delete');
        displayPosts();
        showUndoOption(); // عرض زر الاسترجاع
    }
});

// وظيفة لإظهار زر الاسترجاع مع إشعار
function showUndoOption() {
    undoBtn.textContent = 'تراجع عن الحذف';
    undoBtn.style.display = 'block';
    undoBtn.style.marginTop = '10px';
    undoBtn.style.backgroundColor = '#f44336';
    undoBtn.style.color = 'white';
    undoBtn.style.border = 'none';
    undoBtn.style.padding = '10px';
    undoBtn.style.cursor = 'pointer';
    undoBtn.addEventListener('click', undoDelete);
    notificationContainer.appendChild(undoBtn);
}

// وظيفة للتراجع عن حذف المنشور
async function undoDelete() {
    if (lastDeletedPost) {
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم استرجاع المنشور', 'undo');
        displayPosts();
        undoBtn.style.display = 'none'; // إخفاء زر الاسترجاع بعد الاسترجاع
        lastDeletedPost = null;
    }
}

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.removeItem('username');
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
    }
});

// عرض اسم المستخدم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = `${username}`;
    } else {
        usernameDisplay.textContent = 'مرحباً، مستخدم';
    }
    displayPosts();
});

// تحقق من حالة المستخدم
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    }
});

// وظيفة لإظهار الإشعارات مع شريط متحرك
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <div class="progress-bar"></div>
    `;

    notificationContainer.appendChild(notification);

    let isDragging = false;
    let startPosX = 0;

    // دوال التعامل مع السحب بالفأرة
    const onMouseDown = (e) => {
        isDragging = true;
        startPosX = e.clientX;
    };

    const onMouseMove = (e) => {
        if (isDragging) {
            const dx = e.clientX - startPosX;
            notification.style.transform = `translateX(${dx}px)`;
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        if (parseInt(notification.style.transform.replace('translateX(', '').replace('px)', '')) > 100) {
            notificationContainer.removeChild(notification); // إزالة الإشعار عند سحبه كفاية
        } else {
            notification.style.transform = ''; // إرجاع الإشعار إلى مكانه إذا لم يتم سحبه كفاية
        }
    };

    // دوال التعامل مع السحب باللمس
    const onTouchStart = (e) => {
        isDragging = true;
        startPosX = e.touches[0].clientX;
    };

    const onTouchMove = (e) => {
        if (isDragging) {
            const dx = e.touches[0].clientX - startPosX;
            notification.style.transform = `translateX(${dx}px)`;
        }
    };

    const onTouchEnd = () => {
        isDragging = false;
        if (parseInt(notification.style.transform.replace('translateX(', '').replace('px)', '')) > 100) {
            notificationContainer.removeChild(notification); // إزالة الإشعار عند سحبه كفاية
        } else {
            notification.style.transform = ''; // إرجاع الإشعار إلى مكانه إذا لم يتم سحبه كفاية
        }
    };

    // إضافة الأحداث للفأرة
    notification.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // إضافة الأحداث لللمس
    notification.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    // إزالة الإشعار بعد 5 ثوانٍ إذا لم يتم سحبه
    setTimeout(() => {
        if (notificationContainer.contains(notification)) {
            notificationContainer.removeChild(notification);
        }
    }, 5000);
    }
