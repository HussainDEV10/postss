import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

// زر تبديل الوضع
const themeToggleBtn = document.getElementById('themeToggleBtn');

// أيقونة الحساب
const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

// عرض/إخفاء معلومات الحساب
profileIcon.addEventListener("click", () => {
    profileInfo.classList.toggle("hidden");
});

// تحديث معلومات الحساب
const updateProfileInfo = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            profileUsername.textContent = userDoc.data().username || "مستخدم";
        }

        const querySnapshot = await getDocs(collection(db, "posts"));
        const userPosts = querySnapshot.docs.filter(doc => doc.data().authorEmail === currentUser.email);
        postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
    }
};

// تبديل الوضع الداكن/الفاتح
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.classList.add(savedTheme);
    themeToggleBtn.textContent = savedTheme === 'dark-theme' ? '🌙' : '🌑';
}
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark-theme');
        themeToggleBtn.textContent = '🌙';
    } else {
        localStorage.setItem('theme', 'light-theme');
        themeToggleBtn.textContent = '🌑';
    }
});

// إشعارات
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <span>${message}</span>
        ${type === 'delete' ? '<button class="undo-btn" id="undoBtn">إسترجاع</button>' : ''}
        <div class="underline"></div>
    `;
    notificationContainer.innerHTML = '';
    notificationContainer.appendChild(notification);

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

// عرض المنشورات مع like/dislike
const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = new Date(data.timestamp.seconds * 1000);
            const day = timestamp.getDate().toString().padStart(2,'0');
            const month = (timestamp.getMonth()+1).toString().padStart(2,'0');
            const year = timestamp.getFullYear();
            const hours = timestamp.getHours().toString().padStart(2,'0');
            const minutes = timestamp.getMinutes().toString().padStart(2,'0');
            const seconds = timestamp.getSeconds().toString().padStart(2,'0');
            const formattedDateTime = `<span dir="rtl">${day}/${month}/${year} ${hours}:${minutes}:${seconds}</span>`;

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (data.fileType === 'image' ? `<img src="${data.fileUrl}" class="post-media"/>` : `<video src="${data.fileUrl}" controls class="post-media"></video>`) : ''}
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
                <p class="post-time">${formattedDateTime}</p>
                <div class="post-actions">
                    <button class="like-btn" data-id="${doc.id}">👍 <span>${data.likes?.length || 0}</span></button>
                    <button class="dislike-btn" data-id="${doc.id}">👎 <span>${data.dislikes?.length || 0}</span></button>
                </div>
            `;
            postList.appendChild(postItem);
        });
    } catch (error) {
        showNotification("حدث خطأ أثناء تحميل المنشورات", "error");
        console.error(error);
    }
};

// إضافة منشور
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
            likes: [],
            dislikes: [],
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

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// حالة تسجيل الدخول
const checkAuthState = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            localStorage.setItem('email', user.email);
            getDoc(doc(db, "users", user.uid)).then((doc) => {
                if (doc.exists()) {
                    const userData = doc.data();
                    localStorage.setItem('username', userData.username);
                    usernameDisplay.textContent = userData.username || "مستخدم";
                }
            });
            displayPosts();
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
        }
    });
};

// التعامل مع حذف المنشورات وأزرار اللايك والديسلايك
document.addEventListener('click', async (event) => {
    const currentUserEmail = localStorage.getItem('email');

    // حذف المنشور
    if (event.target.classList.contains('delete-btn')) {
        const postId = event.target.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);

        try {
            const postDoc = await getDoc(postRef);
            if (postDoc.exists()) {
                lastDeletedPost = { id: postId, data: postDoc.data() };
                await deleteDoc(postRef);
                showNotification("تم حذف المنشور", "delete");
                displayPosts();
            }
        } catch (error) {
            showNotification("حدث خطأ أثناء حذف المنشور", "error");
            console.error(error);
        }
    }

    // اللايك
    if (event.target.closest('.like-btn')) {
        const likeBtn = event.target.closest('.like-btn');
        const postId = likeBtn.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const data = postDoc.data();
            const likes = data.likes || [];
            const dislikes = data.dislikes || [];

            if (!likes.includes(currentUserEmail)) {
                likes.push(currentUserEmail);
                const newDislikes = dislikes.filter(email => email !== currentUserEmail);
                await updateDoc(postRef, { likes, dislikes: newDislikes });
                displayPosts();
            }
        }
    }

    // الديسلايك
    if (event.target.closest('.dislike-btn')) {
        const dislikeBtn = event.target.closest('.dislike-btn');
        const postId = dislikeBtn.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const data = postDoc.data();
            const likes = data.likes || [];
            const dislikes = data.dislikes || [];

            if (!dislikes.includes(currentUserEmail)) {
                dislikes.push(currentUserEmail);
                const newLikes = likes.filter(email => email !== currentUserEmail);
                await updateDoc(postRef, { likes: newLikes, dislikes });
                displayPosts();
            }
        }
    }
});

// فتح نافذة إضافة منشور
addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
});

// إغلاق نافذة إضافة منشور
closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
});

// التحقق من حالة تسجيل الدخول عند تحميل الصفحة
checkAuthState();
