import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');
const notificationContainer = document.getElementById('notificationContainer');

const themeToggleBtn = document.getElementById('themeToggleBtn');

// أيقونة المستخدم
const profileIcon = document.getElementById('profileIcon');
const profileInfo = document.getElementById('profileInfo');
const profileUsername = document.getElementById('profileUsername');
const postCount = document.getElementById('postCount');
const logoutBtn = document.getElementById('logoutBtn');

let editPostId = null; // لتعديل المنشورات
let lastDeletedPost = null;

// التبديل بين المظهر الليلي والفاتح
const savedTheme = localStorage.getItem('theme');
if(savedTheme) document.body.classList.add(savedTheme);

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

// فتح/إغلاق نافذة معلومات المستخدم
profileIcon.addEventListener('click', () => {
    profileIcon.classList.toggle('active');
});

// التحقق من حالة تسجيل الدخول وتحديث اسم المستخدم وعدد المنشورات
const checkAuthState = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if(userDoc.exists()){
                const userData = userDoc.data();
                profileUsername.textContent = `${userData.username}@`;
                localStorage.setItem('username', userData.username);
                localStorage.setItem('email', user.email);
            }
            displayPosts();
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
        }
    });
};

// عرض المنشورات
const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');
        let userPostsCount = 0;

        querySnapshot.forEach(docItem => {
            const data = docItem.data();
            if(data.authorEmail === currentUserEmail) userPostsCount++;

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');

            const editedText = data.edited ? '<p style="color:gray; font-size:12px;">(تم تعديله)</p>' : '';

            postItem.innerHTML = `
                ${currentUserEmail === data.authorEmail ? `<button class="delete-btn" data-id="${docItem.id}"></button>
                <button class="edit-btn" data-id="${docItem.id}" style="position:absolute; top:10px; left:50px;">✏️</button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${data.description}</p>
                ${data.fileUrl ? (data.fileType === 'image' ? `<img src="${data.fileUrl}" class="post-media" style="max-width:100%;height:auto;" />` 
                : `<video src="${data.fileUrl}" controls class="post-media" style="max-width:100%;height:auto;"></video>`) : ''}
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
                ${editedText}
            `;
            postList.appendChild(postItem);
        });

        postCount.textContent = `عدد المنشورات: ${userPostsCount}`;

        // إضافة أحداث أزرار التعديل والحذف بعد التحديث
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const postId = btn.getAttribute('data-id');
                const postRef = doc(db, "posts", postId);
                const postDoc = await getDoc(postRef);
                if(postDoc.exists()){
                    lastDeletedPost = {id: postId, data: postDoc.data()};
                    await deleteDoc(postRef);
                    showNotification("تم حذف المنشور", "delete");
                    displayPosts();
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const postId = btn.getAttribute('data-id');
                const postRef = doc(db, "posts", postId);
                const postDoc = await getDoc(postRef);
                if(postDoc.exists()){
                    const data = postDoc.data();
                    overlay.classList.add('show');
                    document.getElementById('formTitle').textContent = 'تعديل المنشور';
                    postTitleInput.value = data.title;
                    postDescriptionInput.value = data.description;
                    postFileInput.style.display = 'none'; // اخفاء حقل الصورة/فيديو عند التعديل
                    editPostId = postId; // حفظ id المنشور المراد تعديله
                }
            });
        });

    } catch (error) {
        showNotification("حدث خطأ أثناء تحميل المنشورات", "error");
    }
};

// فتح نافذة إضافة منشور
addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
    document.getElementById('formTitle').textContent = 'أضف منشور';
    postTitleInput.value = '';
    postDescriptionInput.value = '';
    postFileInput.value = '';
    postFileInput.style.display = 'block';
    editPostId = null; // لا تعديل حالياً
});

// إغلاق نافذة النشر
closeBtn.addEventListener('click', () => overlay.classList.remove('show'));

// نشر أو تعديل المنشور
publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');

    if(!title || !description) return showNotification("يرجى ملء جميع الحقول", "error");

    if(editPostId){
        // تعديل المنشور
        const postRef = doc(db, "posts", editPostId);
        await setDoc(postRef, { title, description, edited: true }, { merge: true });
        showNotification("تم تعديل المنشور بنجاح", "success");
        overlay.classList.remove('show');
        editPostId = null;
        postFileInput.style.display = 'block';
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        displayPosts();
    } else {
        // نشر منشور جديد
        const file = postFileInput.files[0];
        let fileUrl = '';
        let fileType = '';

        if(file){
            const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            fileUrl = await getDownloadURL(storageRef);
            fileType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : '');
        }

        await addDoc(collection(db, "posts"), {
            title, description, author, authorEmail, fileUrl, fileType, timestamp: serverTimestamp(), edited:false
        });

        showNotification("تم نشر المنشور بنجاح", "success");
        overlay.classList.remove('show');
        postTitleInput.value = '';
        postDescriptionInput.value = '';
        postFileInput.value = '';
        displayPosts();
    }
});

// تسجيل خروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// إشعارات
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `<span>${message}</span>`;
    notificationContainer.innerHTML = '';
    notificationContainer.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
};

// التحقق من تسجيل الدخول عند التحميل
checkAuthState();
