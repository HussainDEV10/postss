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
const mediaInput = document.getElementById('mediaUpload');
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
    notificationContainer.innerHTML = ''; // مسح الإشعارات القديمة
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
    const currentUserEmail = localStorage.getItem('email'); 

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);
        const formattedDateTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        
        let mediaContent = '';
        if (data.mediaUrl) {
            if (data.mediaUrl.endsWith('.mp4')) {
                mediaContent = `<video src="${data.mediaUrl}" controls style="max-width: 100%; height: auto;"></video>`;
            } else {
                mediaContent = `<img src="${data.mediaUrl}" style="max-width: 100%; height: auto;">`;
            }
        }

        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${data.description}</p>
            ${mediaContent}
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
    const mediaFile = mediaInput.files[0];

    if (title && description && author && authorEmail) {
        let mediaUrl = '';

        if (mediaFile) {
            const mediaRef = ref(storage, `posts/${Date.now()}_${mediaFile.name}`);
            try {
                await uploadBytes(mediaRef, mediaFile);
                showNotification('تم رفع الملف بنجاح!', 'success');
                mediaUrl = await getDownloadURL(mediaRef);
                showNotification(`تم الحصول على رابط الملف: ${mediaUrl}`, 'success');
            } catch (error) {
                showNotification(`خطأ في تحميل الملف: ${error.message}`, 'error');
                return;
            }
        }

        try {
            await addDoc(collection(db, "posts"), {
                title,
                description,
                author,
                authorEmail,
                mediaUrl,
                timestamp: serverTimestamp()
            });
            showNotification('تم نشر المنشور بنجاح!', 'publish');
            postTitleInput.value = '';
            postDescriptionInput.value = '';
            mediaInput.value = ''; 
            overlay.classList.remove('show');
            displayPosts(); // تحديث قائمة المنشورات بعد النشر
        } catch (error) {
            showNotification(`خطأ في نشر المنشور: ${error.message}`, 'error');
        }
    } else {
        showNotification('الرجاء ملء جميع الحقول!', 'error');
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        window.location.href = 'login.html'; // نقل المستخدم إلى صفحة تسجيل الدخول
        showNotification('تم تسجيل الخروج بنجاح!', 'success');
    }).catch((error) => {
        showNotification(`خطأ في تسجيل الخروج: ${error.message}`, 'error');
    });
});

// التحقق من حالة تسجيل الدخول عند تحميل الصفحة
onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = localStorage.getItem('username') || user.displayName;
        const email = user.email;
        usernameDisplay.textContent = username || 'مستخدم';
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        displayPosts(); // عرض المنشورات عند تسجيل الدخول
    } else {
        window.location.href = 'login.html'; // نقل المستخدم إلى صفحة تسجيل الدخول إذا لم يكن مسجلاً
    }
});

// حذف المنشور
postList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const postId = e.target.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);
        
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            lastDeletedPost = {
                id: postDoc.id,
                data: postDoc.data()
            };
            await deleteDoc(postRef);
            showNotification('تم حذف المنشور بنجاح', 'delete');
            displayPosts(); // تحديث قائمة المنشورات بعد الحذف
        } else {
            showNotification('المنشور غير موجود', 'error');
        }
    }
});
