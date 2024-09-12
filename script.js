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
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
    const currentUserEmail = localStorage.getItem('email');
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = new Date(data.timestamp.seconds * 1000);

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
        postItem.setAttribute('data-id', doc.id); // إضافة معرف العنصر
        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${doc.id}">🗑️</button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            ${data.fileUrl ? `<img src="${data.fileUrl}" alt="Media" class="post-media"/>` : ''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
            <div class="like-dislike-btns">
                <div class="like-dislike-btn like-btn" data-id="${doc.id}" data-type="like">👍 <span>${data.likes || 0}</span></div>
                <div class="like-dislike-btn dislike-btn" data-id="${doc.id}" data-type="dislike">👎 <span>${data.dislikes || 0}</span></div>
            </div>
        `;
        postList.appendChild(postItem);
    });
};

const handleLikeDislike = async (postId, type) => {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);

    if (postDoc.exists()) {
        const data = postDoc.data();
        const updateData = {};

        if (type === 'like') {
            updateData.likes = (data.likes || 0) + 1;
        } else if (type === 'dislike') {
            updateData.dislikes = (data.dislikes || 0) + 1;
        }

        await updateDoc(postRef, updateData);

        // تحديث الأرقام دون تحريك الشاشة
        requestAnimationFrame(() => {
            const postItem = document.querySelector(`.post-item[data-id="${postId}"]`);
            if (postItem) {
                const countSpan = postItem.querySelector(`.like-dislike-btn[data-type="${type}"] span`);
                if (countSpan) {
                    countSpan.textContent = (parseInt(countSpan.textContent) || 0) + 1;
                }
            }
        });
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

        // إضافة المنشور الجديد إلى قاعدة البيانات
        await addDoc(collection(db, "posts"), {
            title,
            description,
            author,
            authorEmail,
            fileUrl,
            timestamp: serverTimestamp(),
            likes: 0,
            dislikes: 0
        });

        // إظهار رسالة نجاح
        showNotification('تم نشر المنشور بنجاح', 'success');

        // إخفاء الفورم وتفريغ الحقول
        overlay.classList.remove('show');
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        postFileInput.value = '';

        // تحديث قائمة المنشورات
        displayPosts();
    } else {
        showNotification('يرجى تعبئة جميع الحقول', 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    window.location.href = 'login.html'; // إعادة التوجيه لصفحة تسجيل الدخول
});

postList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const postId = e.target.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);
        const postDoc = await getDoc(postRef);

if (postDoc.exists()) {
            lastDeletedPost = {
                id: postId,
                data: postDoc.data()
            };
            await deleteDoc(postRef);
            showNotification('تم حذف المنشور', 'delete');
            displayPosts();
        }
    } else if (e.target.classList.contains('like-btn')) {
        const postId = e.target.getAttribute('data-id');
        await handleLikeDislike(postId, 'like');
    } else if (e.target.classList.contains('dislike-btn')) {
        const postId = e.target.getAttribute('data-id');
        await handleLikeDislike(postId, 'dislike');
    }
});

const convertToLinks = (text) => {
    const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlPattern, (url) => `<a href="${url}" target="_blank">${url}</a>`);
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        localStorage.setItem('username', user.displayName || 'مستخدم');
        localStorage.setItem('email', user.email);
        usernameDisplay.textContent = user.displayName || '${username}';
        displayPosts();
    } else {
        window.location.href = 'login.html';
    }
});
