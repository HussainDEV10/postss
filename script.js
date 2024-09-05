import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
const fileInput = document.getElementById('postMedia');
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
    notificationContainer.innerHTML = '';
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

const uploadFile = async (file) => {
    const storageRef = ref(storage, `uploads/${file.name}`);
    try {
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);
        return fileURL;
    } catch (error) {
        showNotification('فشل في رفع الملف: ' + error.message, 'error');
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
                fileURL: fileURL || '', // إضافة رابط الصورة أو الفيديو إن وجد
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
    } else {
        showNotification('يرجى ملء جميع الحقول المطلوبة.', 'error');
    }
};

const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
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
            const formattedDate = `${day}/${month}/${year}`;

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                <h3>${data.title}</h3>
                <p>${convertToLinks(data.description)}</p>
                ${data.fileURL ? `<img src="${data.fileURL}" alt="Post Media" class="post-media">` : ''}
                <small>${formattedDate} ${formattedTime}</small>
                ${data.authorEmail === currentUserEmail ? `<button class="delete-btn" data-id="${doc.id}">حذف</button>` : ''}
            `;

            postList.appendChild(postItem);
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const postId = event.target.getAttribute('data-id');
                if (confirm('هل أنت متأكد أنك تريد حذف هذا المنشور؟')) {
                    try {
                        const postDoc = doc(db, "posts", postId);
                        const postSnapshot = await getDoc(postDoc);
                        lastDeletedPost = { id: postId, data: postSnapshot.data() };
                        await deleteDoc(postDoc);
                        showNotification('تم حذف المنشور', 'delete');
                        displayPosts();
                    } catch (error) {
                        showNotification('فشل في حذف المنشور: ' + error.message, 'error');
                    }
                }
            });
        });

    } catch (error) {
        showNotification('فشل في تحميل المنشورات: ' + error.message, 'error');
    }
};

addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
});

closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
});

publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value;
    const description = postDescriptionInput.value;
    const file = fileInput.files[0];

    let fileURL = '';

    if (file) {
        fileURL = await uploadFile(file);
    }

    await publishPost(title, description, fileURL);
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.clear();
        window.location.href = 'login.html'; // تحويل المستخدم إلى صفحة تسجيل الدخول
    } catch (error) {
        showNotification('فشل في تسجيل الخروج: ' + error.message, 'error');
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        localStorage.setItem('username', user.displayName);
        localStorage.setItem('email', user.email);
        usernameDisplay.textContent = user.displayName || 'مستخدم';
        displayPosts();
    } else {
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        usernameDisplay.textContent = 'مستخدم غير معروف';
        window.location.href = 'login.html'; // تحويل المستخدم إلى صفحة تسجيل الدخول
    }
});
