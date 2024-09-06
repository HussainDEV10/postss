import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
const storage = getStorage(app);
const auth = getAuth(app);

const postList = document.getElementById('postList');
const publishBtn = document.getElementById('publishBtn');
const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const mediaUpload = document.getElementById('mediaUpload');

// وظيفة لتحميل الوسائط على Firebase Storage
async function uploadMedia(file) {
    const storageRef = ref(storage, `media/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL; // إرجاع رابط التحميل
}

// نشر المنشور
publishBtn.addEventListener('click', async () => {
    const title = postTitleInput.value;
    const description = postDescriptionInput.value;
    const file = mediaUpload.files[0]; // الملف المرفق (إذا وجد)

    let mediaURL = '';
    if (file) {
        // تحميل الوسائط إذا تم اختيار ملف
        mediaURL = await uploadMedia(file);
    }

    const postData = {
        title: title,
        description: description,
        mediaURL: mediaURL,
        timestamp: new Date(),
        author: localStorage.getItem('username'), // افتراض أن اسم المستخدم محفوظ في localStorage
        email: localStorage.getItem('email') // حفظ البريد الإلكتروني للتأكد من أن صاحب المنشور يمكنه حذفه
    };

    await addDoc(collection(db, 'posts'), postData);

    // إعادة ضبط الحقول بعد النشر
    postTitleInput.value = '';
    postDescriptionInput.value = '';
    mediaUpload.value = '';
    
    // إعادة عرض المنشورات
    displayPosts();
});

// عرض المنشورات
async function displayPosts() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = ''; // مسح المحتوى الحالي قبل العرض
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const postElement = document.createElement('li');
        postElement.classList.add('post-item');

        // إنشاء HTML للمنشور
        let mediaHTML = '';
        if (data.mediaURL) {
            if (data.mediaURL.match(/\.(jpeg|jpg|gif|png)$/)) {
                mediaHTML = `<img src="${data.mediaURL}" alt="Image" style="max-width: 100%; height: auto;">`;
            } else if (data.mediaURL.match(/\.(mp4|webm|ogg)$/)) {
                mediaHTML = `<video controls style="max-width: 100%; height: auto;">
                                <source src="${data.mediaURL}" type="video/mp4">
                                Your browser does not support the video tag.
                             </video>`;
            }
        }

        postElement.innerHTML = `
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${data.description}</p>
            ${mediaHTML}  <!-- تضمين الوسائط (صورة أو فيديو) -->
            <p class="post-author">من قِبل: ${data.author}</p>
        `;

        // إضافة زر الحذف إذا كان البريد الإلكتروني للمستخدم هو نفسه كاتب المنشور
        if (data.email === localStorage.getItem('email')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'حذف المنشور';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', async () => {
                await deletePost(doc.id);
                displayPosts();
            });
            postElement.appendChild(deleteBtn);
        }

        postList.appendChild(postElement);
    });
}

// وظيفة لحذف المنشور
async function deletePost(postId) {
    await deleteDoc(doc(db, 'posts', postId));
}

// تحميل وعرض المنشورات عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    displayPosts();
});

// متابعة حالة تسجيل الدخول وإعادة التوجيه إذا لم يكن المستخدم مسجلاً دخوله
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';  // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
    }
});
