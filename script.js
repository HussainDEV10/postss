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

// العناصر الأساسية في الواجهة
const postList = document.getElementById('postList');
const overlay = document.getElementById('overlay');
const addPostBtn = document.getElementById('addPostBtn');
const closeBtn = document.getElementById('closeBtn');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');

// العناصر الخاصة بالملف الشخصي
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

// دالة لتحديث معلومات الملف الشخصي
const updateProfileInfo = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // استخدام displayName إذا وجد، وإلا اسم المستخدم، وإلا البريد الإلكتروني
                const username = userData.displayName || userData.username || currentUser.email.split('@')[0];
                profileUsername.textContent = username;
                localStorage.setItem('username', username);
                
                // تحديث عدد المنشورات
                const postsQuery = await getDocs(collection(db, "posts"));
                const userPosts = postsQuery.docs.filter(doc => doc.data().authorId === currentUser.uid);
                postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
            }
        } catch (error) {
            console.error("Error updating profile info:", error);
        }
    }
};

// دالة لإضافة منشور جديد
const addPost = async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        showNotification("يجب تسجيل الدخول أولاً", "error");
        return;
    }

    if (title && description) {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            let username = "مستخدم";
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                username = userData.displayName || userData.username || currentUser.email.split('@')[0];
            }

            let fileUrl = '';
            let fileType = '';
            const file = postFileInput.files[0];
            
            if (file) {
                const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(storageRef);
                fileType = file.type.startsWith('image/') ? 'image' : 'video';
            }

            await addDoc(collection(db, "posts"), {
                title,
                description,
                author: username,
                authorId: currentUser.uid,
                authorEmail: currentUser.email,
                fileUrl,
                fileType,
                timestamp: serverTimestamp(),
                edited: false
            });

            showNotification("تم نشر المنشور بنجاح", "success");
            overlay.classList.remove('show');
            postTitleInput.value = '';
            postDescriptionInput.value = '';
            postFileInput.value = '';
            
            // تحديث معلومات الملف الشخصي بعد النشر
            await updateProfileInfo();
            displayPosts();
        } catch (error) {
            console.error("Error adding post:", error);
            showNotification("حدث خطأ أثناء نشر المنشور", "error");
        }
    } else {
        showNotification("يرجى إدخال عنوان ووصف للمنشور", "error");
    }
};

// دالة لعرض المنشورات
const displayPosts = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUser = auth.currentUser;
        
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const timestamp = data.timestamp?.toDate() || new Date();
            
            // تنسيق التاريخ والوقت
            const formattedDate = formatArabicDate(timestamp);
            
            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            
            postItem.innerHTML = `
                ${currentUser && currentUser.uid === data.authorId ? `
                    <button class="delete-btn" data-id="${docSnap.id}">حذف</button>
                    <button class="edit-btn" data-id="${docSnap.id}">تعديل</button>
                ` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (
                    data.fileType === 'image' ? 
                    `<img src="${data.fileUrl}" class="post-media" alt="صورة المنشور">` : 
                    `<video src="${data.fileUrl}" class="post-media" controls></video>`
                ) : ''}
                <p class="post-author">نشر بواسطة: ${data.author}</p>
                ${data.edited ? `<p class="post-edited">(تم التعديل)</p>` : ''}
                <p class="post-time">${formattedDate}</p>
            `;
            
            postList.appendChild(postItem);
        });
    } catch (error) {
        console.error("Error displaying posts:", error);
        showNotification("حدث خطأ أثناء تحميل المنشورات", "error");
    }
};

// دالة مساعدة لتنسيق التاريخ بالعربية
function formatArabicDate(date) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
    };
    
    return new Intl.DateTimeFormat('ar-EG', options).format(date)
        .replace('ص', 'ص')
        .replace('م', 'م');
}

// دالة مساعدة لتحويل الروابط في النص
function convertToLinks(text) {
    if (!text) return '';
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
}

// دالة لعرض الإشعارات
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
};

// تهيئة الواجهة عند تحميل الصفحة
const initializeApp = async () => {
    // أحداث الأزرار
    addPostBtn.addEventListener('click', () => {
        overlay.classList.add('show');
        postTitleInput.focus();
    });
    
    closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
    
    publishBtn.addEventListener('click', addPost);
    
    // أحداث الملف الشخصي
    document.querySelector('.profile-icon').addEventListener('click', () => {
        profileInfo.classList.toggle('hidden');
    });
    
    // التحقق من حالة المستخدم
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            localStorage.setItem('email', user.email);
            await updateProfileInfo();
            displayPosts();
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
        }
    });
};

// بدء التطبيق
initializeApp();
