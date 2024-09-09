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

// إضافة عناصر اللايكات والديسلايكات للمنشورات
const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
    const currentUserEmail = localStorage.getItem('email'); // الحصول على البريد الإلكتروني للمستخدم الحالي
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);
        const formattedDateTime = `
            <span dir="rtl">${timestamp.toLocaleDateString('ar-EG')}</span> | ${timestamp.toLocaleTimeString('ar-EG')}
        `;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            ${data.fileUrl ? `<img src="${data.fileUrl}" alt="Media" class="post-media"/>` : ''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
            <div class="likes-container">
                <button class="like-btn" data-id="${doc.id}">👍 <span class="likes-count">${data.likes || 0}</span></button>
                <button class="dislike-btn" data-id="${doc.id}">👎 <span class="dislikes-count">${data.dislikes || 0}</span></button>
            </div>
        `;
        postList.appendChild(postItem);
    });

    // إضافة الاستماع لأحداث اللايك والديسلايك
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const postId = button.getAttribute('data-id');
            const postRef = doc(db, "posts", postId);
            const postDoc = await getDoc(postRef);
            let currentLikes = postDoc.data().likes || 0;
            await setDoc(postRef, { likes: currentLikes + 1 }, { merge: true });
            displayPosts();
        });
    });

    document.querySelectorAll('.dislike-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const postId = button.getAttribute('data-id');
            const postRef = doc(db, "posts", postId);
            const postDoc = await getDoc(postRef);
            let currentDislikes = postDoc.data().dislikes || 0;
            await setDoc(postRef, { dislikes: currentDislikes + 1 }, { merge: true });
            displayPosts();
        });
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

    if (title && description) {
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            timestamp: serverTimestamp(),
            likes: 0, // تعيين قيم اللايك والديسلايك الأولية
            dislikes: 0
        });
        overlay.classList.remove('show');
        displayPosts();
        showNotification('تم نشر المنشور بنجاح', 'success');
    } else {
        showNotification('يرجى ملء الحقول المطلوبة', 'error');
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

checkAuthState();
        
