import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

const editOverlay = document.getElementById('editOverlay');
const closeEditBtn = document.getElementById('closeEditBtn');
const editPostTitle = document.getElementById('editPostTitle');
const editPostDescription = document.getElementById('editPostDescription');
const publishEditBtn = document.getElementById('publishEditBtn');

const notificationContainer = document.getElementById('notificationContainer');
const logoutBtn = document.getElementById('logoutBtn');
let lastDeletedPost = null;
let editingPostId = null;

const themeToggleBtn = document.getElementById('themeToggleBtn');

const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

profileIcon.addEventListener("click", () => {
    profileInfo.classList.toggle("hidden");
});

const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `<span>${message}</span>`;
    notificationContainer.innerHTML = '';
    notificationContainer.appendChild(notification);
    setTimeout(()=>notification.classList.add('show'),10);
    setTimeout(()=>notification.classList.add('hide'),5000);
    setTimeout(()=>notification.remove(),5500);
};

function convertToLinks(text){ return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); }

/**
 * تحديث معلومات الملف الشخصي (الاسم وعدد المنشورات).
 * يستخدم استعلامًا لعد المنشورات الخاصة بالمستخدم لضمان دقة العدد عند التحميل.
 */
const updateProfileInfo = async (user) => {
    if(!user) return;
    // name from localStorage or users collection
    let username = localStorage.getItem('username');
    if(!username){
        try{
            const userDoc = await getDoc(doc(db,"users", user.uid));
            if(userDoc.exists()){
                username = userDoc.data().username || 'مستخدم';
                localStorage.setItem('username', username);
            } else {
                username = 'مستخدم';
            }
        } catch(e){
            console.error("failed to fetch user doc:", e);
            username = localStorage.getItem('username') || 'مستخدم';
        }
    }
    profileUsername.textContent = username;
    // عد المنشورات عبر استعلام where
    try{
        const q = query(collection(db,"posts"), where("authorEmail","==", user.email));
        const snap = await getDocs(q);
        postCount.textContent = `عدد المنشورات: ${snap.size}`;
    } catch(e){
        console.error("failed to count posts:", e);
        postCount.textContent = `عدد المنشورات: -`;
    }
};

/**
 * عرض المنشورات باستخدام مستمع (onSnapshot) بحيث تبقى الواجهة متزامنة مع قاعدة البيانات.
 * يتم ترتيب المنشورات حسب timestamp تنازليًا إن أمكن.
 */
let unsubscribePosts = null;
const startPostsListener = () => {
    // فك الاشتراك القديم إن وُجد
    if(unsubscribePosts) unsubscribePosts();

    // نستخدم query مع orderBy إذا كان الحقل موجوداً؛ لاستخراج الأحدث أولاً.
    const postsCollection = collection(db, "posts");
    const postsQuery = query(postsCollection, orderBy("timestamp", "desc"));

    unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // احمِ العالم من حالات عدم وجود timestamp
            const timestamp = data.timestamp && data.timestamp.seconds ? new Date(data.timestamp.seconds*1000) : new Date();
            let hours = timestamp.getHours(); const minutes = timestamp.getMinutes().toString().padStart(2,'0');
            const period = hours>=12?'م':'ص'; hours=hours%12||12;
            const day = timestamp.getDate().toString().padStart(2,'0');
            const month = (timestamp.getMonth()+1).toString().padStart(2,'0');
            const year = timestamp.getFullYear();
            // تحويل الأرقام للعربية (مباشر)
            const arabicDigits = (str) => str.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
            const arabicFormattedDate = arabicDigits(`${day}/${month}/${year}`);
            const formattedTime = `${hours.toString().padStart(2,'0')}:${minutes} ${period}`;
            const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${formattedTime}`;

            const editedText = data.edited ? `<p class="post-edited">(تم تعديله)</p>` : '';

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                ${currentUserEmail===data.authorEmail ? `<button class="delete-btn" data-id="${docSnap.id}"></button>
                <button class="edit-btn" data-id="${docSnap.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" class="post-media">`:`<video src="${data.fileUrl}" class="post-media" controls></video>`) : ''}
                <p class="post-author">من قِبَل: ${data.author || 'مستخدم'}</p>
                ${editedText}
                <p class="post-time">${formattedDateTime}</p>
            `;
            postList.appendChild(postItem);
        });
        // بعد تحديث العرض، حدّث معلومات الملف الشخصي (قد تتغير العدادات)
        const email = localStorage.getItem('email');
        if(email && auth.currentUser) updateProfileInfo(auth.currentUser);
    }, (err) => {
        console.error("posts listener error:", err);
        // كحل احتياطي: استرجاع عادي إن فشل المستمع
        displayPostsFallback();
    });
};

// عرض احتياطي يستخدم getDocs (في حالة فشل onSnapshot)
const displayPostsFallback = async () => {
    try{
        const querySnapshot = await getDocs(collection(db, "posts"));
        postList.innerHTML = '';
        const currentUserEmail = localStorage.getItem('email');
        querySnapshot.forEach((docSnap)=>{
            const data = docSnap.data();
            const timestamp = data.timestamp ? new Date(data.timestamp.seconds*1000) : new Date();
            let hours = timestamp.getHours(); const minutes = timestamp.getMinutes().toString().padStart(2,'0');
            const period = hours>=12?'م':'ص'; hours=hours%12||12;
            const day = timestamp.getDate().toString().padStart(2,'0');
            const month = (timestamp.getMonth()+1).toString().padStart(2,'0');
            const year = timestamp.getFullYear();
            const arabicFormattedDate = `${day}/${month}/${year}`.replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
            const formattedTime = `${hours.toString().padStart(2,'0')}:${minutes} ${period}`;
            const formattedDateTime = `<span dir="rtl">${arabicFormattedDate}</span> | ${formattedTime}`;

            const editedText = data.edited ? `<p class="post-edited">(تم تعديله)</p>` : '';

            const postItem = document.createElement('li');
            postItem.classList.add('post-item');
            postItem.innerHTML = `
                ${currentUserEmail===data.authorEmail ? `<button class="delete-btn" data-id="${docSnap.id}"></button>
                <button class="edit-btn" data-id="${docSnap.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" class="post-media">`:`<video src="${data.fileUrl}" class="post-media" controls></video>`) : ''}
                <p class="post-author">من قِبَل: ${data.author || 'مستخدم'}</p>
                ${editedText}
                <p class="post-time">${formattedDateTime}</p>
            `;
            postList.appendChild(postItem);
        });
        updateProfileInfo(auth.currentUser);
    } catch(e){
        console.error("displayPostsFallback failed:", e);
    }
};

// إضافة منشور
const addPost = async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username') || 'مستخدم';
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];

    if(title && description && author && authorEmail){
        let fileUrl=''; let fileType='';
        try{
            if(file){
                const storageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef,file);
                fileUrl = await getDownloadURL(storageRef);
                fileType = file.type.startsWith('image/')?'image':'video';
            }
            await addDoc(collection(db,"posts"),{
                title, description, author, authorEmail, fileUrl, fileType, timestamp:serverTimestamp()
            });
            showNotification("تم نشر المنشور بنجاح","success");
            overlay.classList.remove('show');
            postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
            // لا حاجة لاستدعاء displayPosts لأن onSnapshot سيحدث الواجهة تلقائياً
            if(auth.currentUser) updateProfileInfo(auth.currentUser);
        } catch(e){
            console.error("addPost failed:", e);
            showNotification("فشل أثناء رفع المنشور، حاول مرة أخرى","error");
        }
    } else showNotification("يرجى ملء جميع الحقول","error");
};

// زر إضافة منشور
addPostBtn.addEventListener('click',()=>{
    overlay.classList.add('show');
    postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
});

// ربط زر النشر بالدالة addPost (حل المشكلة: زر النشر لم يكن مربوطاً)
if (publishBtn) {
    publishBtn.addEventListener('click', addPost);
}

// إغلاق form إضافة منشور
closeBtn.addEventListener('click',()=> overlay.classList.remove('show'));

// إغلاق form تعديل منشور
closeEditBtn.addEventListener('click',()=>{
    editOverlay.classList.remove('show');
    editingPostId=null;
});

// حدث حذف وتعديل المنشور
document.addEventListener('click', async (event)=>{
    const target = event.target;
    if(target.classList.contains('delete-btn')){
        const postId = target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postDoc = await getDoc(postRef);
        if(postDoc.exists()){
            lastDeletedPost={id:postId,data:postDoc.data()};
            await deleteDoc(postRef);
            showNotification("تم حذف المنشور","success");
            // onSnapshot سيهتم بتحديث العرض وعدد المنشورات
        }
    }
    else if(target.classList.contains('edit-btn')){
        const postId = target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postDoc = await getDoc(postRef);
        if(postDoc.exists()){
            editingPostId=postId;
            editPostTitle.value=postDoc.data().title;
            editPostDescription.value=postDoc.data().description;
            editOverlay.classList.add('show');
        }
    }
});

// حفظ التعديل
publishEditBtn.addEventListener('click', async ()=>{
    if(!editingPostId) return;
    const title = editPostTitle.value.trim();
    const description = editPostDescription.value.trim();
    if(!title || !description) return showNotification("يرجى ملء جميع الحقول","error");

    await setDoc(doc(db,"posts",editingPostId), {
        title, description, edited:true, editedAt: serverTimestamp()
    }, {merge:true});

    showNotification("تم تعديل المنشور بنجاح","success");
    editOverlay.classList.remove('show');
    editingPostId=null; editPostTitle.value=''; editPostDescription.value='';
    // onSnapshot سيهتم بتحديث العرض
});

// تغيير المظهر (dark / light) — ربط زر التبديل وحفظ الإعداد
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
        if(document.body.classList.contains("dark-theme")){
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
    });
}

// تطبيق الثيم المحفوظ عند تحميل الصفحة
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if(savedTheme === "dark"){
        document.body.classList.add("dark-theme");
    } else if (savedTheme === "light") {
        document.body.classList.remove("dark-theme");
    }
});

// تسجيل خروج
logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    localStorage.removeItem('email'); localStorage.removeItem('username');
    if(unsubscribePosts) unsubscribePosts();
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من تسجيل الدخول وعرض المنشورات
onAuthStateChanged(auth, async (user)=>{
    if(user){
        // احفظ الإيميل فورًا
        localStorage.setItem('email', user.email);
        // احصل على بيانات المستخدم ثم شغّل المستمع للمنشورات
        try{
            const userDoc = await getDoc(doc(db,"users", user.uid));
            if(userDoc.exists()){
                const username = userDoc.data().username || 'مستخدم';
                localStorage.setItem('username', username);
            }
        } catch(e){
            console.error("failed to fetch user doc on auth change:", e);
        }
        // شغّل المستمع للمنشورات (سيقوم أيضاً بتحديث العدّادات)
        startPostsListener();
        // حدّث ملف المستخدم فورًا
        updateProfileInfo(user);
    } else {
        if(unsubscribePosts) unsubscribePosts();
        window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
    }
});
