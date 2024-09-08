import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
const postFileInput = document.getElementById('postFile');
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
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم إسترجاع المنشور', 'restore');
        displayPosts();
        lastDeletedPost = null;
    }
};

function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

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
            ${data.fileUrl ? `<img src="${data.fileUrl}" alt="Media" class="post-media"/>` : ''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
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
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];
    
    if (title && description && author && authorEmail) {
        let fileUrl = '';
        
        if (file) {
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(storageRef);
        }
        
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            timestamp: serverTimestamp(),
            fileUrl
        });
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        postFileInput.value = '';
        overlay.classList.remove('show');
showNotification('تم نشر المنشور بنجاح', 'success');
        displayPosts();
    } else {
        showNotification('يرجى ملء جميع الحقول', 'error');
    }
});

postList.addEventListener('click', async (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.getAttribute('data-id');
        const postDoc = await getDoc(doc(db, 'posts', postId));
        
        if (postDoc.exists()) {
            lastDeletedPost = {
                id: postDoc.id,
                data: postDoc.data()
            };
            
            await deleteDoc(doc(db, 'posts', postId));
            showNotification('تم حذف المنشور', 'delete');
            displayPosts();
        }
    }
});

const checkAuthState = async () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const email = user.email;
            const username = localStorage.getItem('username') || user.displayName || 'مستخدم';
            localStorage.setItem('email', email);
            usernameDisplay.textContent = `مرحباً، ${username}`;
            displayPosts();
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/'; // إعادة التوجيه إلى صفحة تسجيل الدخول
        }
    });
};

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
    }).catch((error) => {
        showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // الحصول على عنصر قائمة المنشورات
    const postList = document.getElementById('postList');

    // افترض أن لديك دالة لتحميل المنشورات من قاعدة البيانات
    loadPosts();

    // وظيفة لتحميل المنشورات وعرضها
    function loadPosts() {
        // هنا يجب أن تكون لديك دالة لتحميل المنشورات من قاعدة البيانات
        // على سبيل المثال، البيانات هنا افتراضية
        const posts = [
            { id: '1', title: 'منشور 1', description: 'وصف المنشور 1', likes: 10, dislikes: 2 },
            { id: '2', title: 'منشور 2', description: 'وصف المنشور 2', likes: 5, dislikes: 1 },
            // أضف المزيد من المنشورات هنا
        ];

        // تنظيف القائمة الحالية
        postList.innerHTML = '';

        // إضافة المنشورات إلى القائمة
        posts.forEach(post => {
            const listItem = document.createElement('li');
            listItem.classList.add('post-item');
            listItem.innerHTML = `
                <h3 class="post-title">${post.title}</h3>
                <p class="post-description">${post.description}</p>
                <div class="post-footer">
                    <button class="dislike-btn" data-id="${post.id}">👎 <span class="dislike-count">${post.dislikes}</span></button>
                    <button class="like-btn" data-id="${post.id}">👍 <span class="like-count">${post.likes}</span></button>
                </div>
            `;
            postList.appendChild(listItem);
        });
    }

    // إدارة التفاعل مع أزرار الإعجاب وعدم الإعجاب
    postList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('like-btn') || event.target.classList.contains('dislike-btn')) {
            const postId = event.target.getAttribute('data-id');
            const isLike = event.target.classList.contains('like-btn');
            const field = isLike ? 'likes' : 'dislikes';

            // افترض أنك تتعامل مع قاعدة بيانات، ستحتاج إلى الكود الخاص بك هنا
            // على سبيل المثال:
            // await updatePostInDatabase(postId, field);

            // تحديث العرض
            const countElement = event.target.querySelector(`.${field}-count`);
            countElement.textContent = parseInt(countElement.textContent) + 1;
        }
    });
});

checkAuthState();
    
