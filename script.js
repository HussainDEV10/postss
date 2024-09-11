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

// عرض المنشورات

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
            <div class="like-dislike">
                <span class="like-btn" data-id="${doc.id}">👍</span><span class="like-count">${data.likes || 0}</span>
                <span class="dislike-btn" data-id="${doc.id}">👎</span><span class="dislike-count">${data.dislikes || 0}</span>
            </div>
        `;
        postList.appendChild(postItem);

        // إضافة حدث زر الإعجاب
        const likeBtn = postItem.querySelector('.like-btn');
        const likeCount = postItem.querySelector('.like-count');
        
        likeBtn.addEventListener('click', async () => {
            const postId = likeBtn.getAttribute('data-id');
            const postDoc = doc(db, "posts", postId);
            const postSnapshot = await getDoc(postDoc);

            if (postSnapshot.exists()) {
                const currentLikes = postSnapshot.data().likes || 0;
                const newLikes = currentLikes + 1;

                await setDoc(postDoc, { likes: newLikes }, { merge: true });

                likeCount.textContent = newLikes;
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
            <div class="like-dislike">
                <span class="like-btn" data-id="${doc.id}">👍</span><span class="like-count">${data.likes || 0}</span>
                <span class="dislike-btn" data-id="${doc.id}">👎</span><span class="dislike-count">${data.dislikes || 0}</span>
            </div>
        `;
        postList.appendChild(postItem);

        // إضافة حدث زر الإعجاب
        const likeBtn = postItem.querySelector('.like-btn');
        const likeCount = postItem.querySelector('.like-count');
        
        likeBtn.addEventListener('click', async () => {
            const postId = likeBtn.getAttribute('data-id');
            const postDoc = doc(db, "posts", postId);
            const postSnapshot = await getDoc(postDoc);

            if (postSnapshot.exists()) {
                const currentLikes = postSnapshot.data().likes || 0;
                const newLikes = currentLikes + 1;

                await updateDoc(postDoc, { likes: newLikes });

                likeCount.textContent = newLikes;
            }
        });

        // إضافة حدث زر الدسلايك
        const dislikeBtn = postItem.querySelector('.dislike-btn');
        const dislikeCount = postItem.querySelector('.dislike-count');
        
        dislikeBtn.addEventListener('click', async () => {
            const postId = dislikeBtn.getAttribute('data-id');
            const postDoc = doc(db, "posts", postId);
            const postSnapshot = await getDoc(postDoc);

            if (postSnapshot.exists()) {
                const currentDislikes = postSnapshot.data().dislikes || 0;
                const newDislikes = currentDislikes + 1;

                await updateDoc(postDoc, { dislikes: newDislikes });

                dislikeCount.textContent = newDislikes;
            }
        });
    });
};
                
// تحديث CSS لتعديل موقع وحجم الأزرار
const cssStyles = `
.like-dislike {
    display: flex;
    justify-content: flex-end;
    gap: 20px;
    font-size: 20px; /* تكبير الإيموجي */
    margin-top: 10px;
}
.like-btn, .dislike-btn {
    cursor: pointer;
    font-size: 24px; /* تكبير الإيموجي */
}
.like-count, .dislike-count {
    margin-left: 5px;
}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = cssStyles;
document.head.appendChild(styleSheet);

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
    fileUrl,
    likes: 0, // تهيئة الإعجابات بصفر
    dislikes: 0 // تهيئة الدسلايكات بصفر
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
            window.location.href = 'login.html'; // إعادة التوجيه إلى صفحة تسجيل الدخول
        }
    });
};

logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = 'login.html';
    }).catch((error) => {
        showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
    });
});

checkAuthState();
