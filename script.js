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

const themeToggleBtn = document.getElementById('themeToggleBtn');
const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

// وظيفة عرض/إخفاء معلومات الحساب
profileIcon.addEventListener("click", () => {
    profileInfo.classList.toggle("hidden");
});

// تحديث معلومات الحساب وعدد المنشورات
const updateProfileInfo = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) profileUsername.textContent = userDoc.data().username || "مستخدم";

        const querySnapshot = await getDocs(collection(db, "posts"));
        const userPosts = querySnapshot.docs.filter(doc => doc.data().authorEmail === currentUser.email);
        postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
    }
};

publishBtn.addEventListener("click", async () => {
    await addPost();
    updateProfileInfo();
});

// التحقق من حالة theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.classList.add(savedTheme);
    themeToggleBtn.textContent = savedTheme === 'dark-theme' ? '🌙' : '🌑';
}

// تبديل theme
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

// عرض المنشورات
const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = new Date(data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now());
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
            const isAuthor = currentUserEmail === data.authorEmail;
            postItem.innerHTML = `
                ${isAuthor ? `
                    <button class="delete-btn" data-id="${doc.id}"></button>
                    <button class="edit-btn" data-id="${doc.id}">✎</button>
                ` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${
                    data.fileUrl
                    ? data.fileType === 'image'
                        ? `<img src="${data.fileUrl}" class="post-media"/>`
                        : `<video src="${data.fileUrl}" class="post-media" controls></video>`
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

// فتح form لإضافة منشور جديد
addPostBtn.addEventListener('click', () => {
    overlay.classList.add('show');
    document.querySelector('.post-form h2').textContent = "أضف منشور";
    publishBtn.textContent = "نشر";
    publishBtn.querySelector('span').textContent = "+";
    postTitleInput.value = '';
    postDescriptionInput.value = '';
    postFileInput.value = '';
    postFileInput.style.display = '';
    publishBtn.onclick = null; // إعادة تعيين الحدث إذا كان سابقًا تعديل
});

// إغلاق form ومسح المسودة
closeBtn.addEventListener('click', () => {
    overlay.classList.remove('show');
    postTitleInput.value = '';
    postDescriptionInput.value = '';
    postFileInput.value = '';
    postFileInput.style.display = '';
});

// إضافة منشور جديد
const addPost = async () => {
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
};

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من حالة تسجيل الدخول
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

// حذف أو تعديل المنشور
document.addEventListener('click', async (event) => {
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
        }
    } else if (event.target.classList.contains('edit-btn')) {
        const postId = event.target.getAttribute('data-id');
        const postRef = doc(db, "posts", postId);
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
            const data = postDoc.data();
            overlay.classList.add('show');
            document.querySelector('.post-form h2').textContent = "تعديل المنشور";
            postTitleInput.value = data.title;
            postDescriptionInput.value = data.description;
            postFileInput.style.display = 'none'; // إخفاء حقل الصورة/الفيديو عند التعديل

            publishBtn.textContent = "حفظ التعديل";
            publishBtn.querySelector('span').textContent = "✓";

            // إعادة تعيين onclick للنشر ليصبح تعديل
            publishBtn.onclick = async () => {
                const newTitle = postTitleInput.value.trim();
                const newDescription = postDescriptionInput.value.trim();
                if (newTitle && newDescription) {
                    await setDoc(postRef, {
                        ...data,
                        title: newTitle,
                        description: newDescription,
                        timestamp: serverTimestamp()
                    });
                    showNotification("تم تعديل المنشور بنجاح", "success");
                    overlay.classList.remove('show');
                    postTitleInput.value = '';
                    postDescriptionInput.value = '';
                    postFileInput.style.display = '';
                    displayPosts();
                } else {
                    showNotification("يرجى ملء العنوان والوصف", "error");
                }
            };
        }
    }
});

// التحقق من حالة تسجيل الدخول عند تحميل الصفحة
checkAuthState();
