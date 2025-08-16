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

// عناصر إضافة المنشور
const addOverlay = document.getElementById('addOverlay');
const addPostTitle = document.getElementById('addPostTitle');
const addPostDescription = document.getElementById('addPostDescription');
const addPostFile = document.getElementById('addPostFile');
const publishAddBtn = document.getElementById('publishAddBtn');
const closeAddBtn = document.getElementById('closeAddBtn');
const addPostBtn = document.getElementById('addPostBtn');

// عناصر تعديل المنشور
const editOverlay = document.getElementById('editOverlay');
const editPostTitle = document.getElementById('editPostTitle');
const editPostDescription = document.getElementById('editPostDescription');
const publishEditBtn = document.getElementById('publishEditBtn');
const closeEditBtn = document.getElementById('closeEditBtn');

const postList = document.getElementById('postList');
const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");
const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");

let lastDeletedPost = null;
let editingPostId = null;

// التبديل بين الوضع الداكن والفاتح
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.body.classList.add(savedTheme);
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme');
});

// عرض معلومات الحساب عند النقر على الأيقونة
profileIcon.addEventListener("click", () => profileInfo.classList.toggle("hidden"));

// إشعار
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

// استرجاع المنشور المحذوف
const undoDelete = async () => {
    if (lastDeletedPost) {
        await setDoc(doc(db, "posts", lastDeletedPost.id), lastDeletedPost.data);
        showNotification('تم إسترجاع المنشور', 'restore');
        displayPosts();
        lastDeletedPost = null;
    }
};

// تحويل الروابط في النص
function convertToLinks(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');
}

// عرض المنشورات
const displayPosts = async () => {
    const querySnapshot = await getDocs(collection(db, "posts"));
    postList.innerHTML = '';
    const currentUserEmail = localStorage.getItem('email');

    querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const timestamp = data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date();
        const hours = timestamp.getHours();
        const minutes = timestamp.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? 'م' : 'ص';
        const formattedTime = `${hours % 12 || 12}:${minutes} ${period}`;
        const day = timestamp.getDate().toString().padStart(2, '0');
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
        const year = timestamp.getFullYear();
        const arabicFormattedDate = `${day}/${month}/${year}`.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
        const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${formattedTime}`;

        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.innerHTML = `
            ${currentUserEmail === data.authorEmail ? `
            <button class="delete-btn" data-id="${docSnap.id}"></button>
            <button class="edit-btn" data-id="${docSnap.id}"></button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" class="post-media">`:`<video src="${data.fileUrl}" class="post-media" controls></video>`) : ''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            <p class="post-time">${formattedDateTime}</p>
        `;
        postList.appendChild(postItem);
    });
};

// إضافة منشور
addPostBtn.addEventListener('click', () => {
    addOverlay.classList.add('show');
});

closeAddBtn.addEventListener('click', () => {
    addOverlay.classList.remove('show');
    addPostTitle.value = '';
    addPostDescription.value = '';
    addPostFile.value = '';
});

publishAddBtn.addEventListener('click', async () => {
    const title = addPostTitle.value.trim();
    const description = addPostDescription.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    const file = addPostFile.files[0];

    if (!title || !description || !author || !authorEmail) return showNotification("يرجى ملء جميع الحقول", "error");

    let fileUrl = '', fileType = '';
    if(file){
        const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
        fileType = file.type.startsWith('image/')?'image':'video';
    }

    await addDoc(collection(db,"posts"), { title, description, author, authorEmail, fileUrl, fileType, timestamp:serverTimestamp() });
    showNotification("تم نشر المنشور بنجاح","success");
    addOverlay.classList.remove('show');
    addPostTitle.value=''; addPostDescription.value=''; addPostFile.value='';
    displayPosts();
});

// تعديل المنشور
document.addEventListener('click', async (e) => {
    if(e.target.classList.contains('edit-btn')){
        editingPostId = e.target.dataset.id;
        const docSnap = await getDoc(doc(db,"posts",editingPostId));
        if(docSnap.exists()){
            const data = docSnap.data();
            editPostTitle.value = data.title;
            editPostDescription.value = data.description;
            editOverlay.classList.add('show');
        }
    }
    else if(e.target.classList.contains('delete-btn')){
        const postId = e.target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postSnap = await getDoc(postRef);
        if(postSnap.exists()){
            lastDeletedPost = {id: postId, data: postSnap.data()};
            await deleteDoc(postRef);
            showNotification("تم حذف المنشور","delete");
            displayPosts();
        }
    }
});

closeEditBtn.addEventListener('click', () => {
    editOverlay.classList.remove('show');
    editingPostId=null;
});

// حفظ التعديل
publishEditBtn.addEventListener('click', async () => {
    if(!editingPostId) return;
    const title = editPostTitle.value.trim();
    const description = editPostDescription.value.trim();
    if(!title || !description) return showNotification("يرجى ملء جميع الحقول","error");
    await setDoc(doc(db,"posts",editingPostId), { title, description, timestamp: serverTimestamp() }, { merge:true });
    showNotification("تم تعديل المنشور بنجاح","success");
    editOverlay.classList.remove('show');
    editPostTitle.value=''; editPostDescription.value='';
    editingPostId=null;
    displayPosts();
});

// تسجيل الخروج
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('email'); localStorage.removeItem('username');
    window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من تسجيل الدخول
onAuthStateChanged(auth, async (user) => {
    if(user){
        localStorage.setItem('email',user.email);
        const userDoc = await getDoc(doc(db,"users",user.uid));
        if(userDoc.exists()){
            localStorage.setItem('username',userDoc.data().username);
            profileUsername.textContent=userDoc.data().username||"مستخدم";
        }
        displayPosts();
    } else window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});
