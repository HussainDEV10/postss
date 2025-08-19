import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, getDoc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

const updateProfileInfo = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            // عرض اسم المستخدم
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                const username = userDoc.data().username || "مستخدم";
                profileUsername.textContent = username;
                localStorage.setItem('username', username);
            }
            
            // حساب عدد المنشورات للمستخدم الحالي
            const querySnapshot = await getDocs(collection(db, "posts"));
            const userPosts = querySnapshot.docs.filter(doc => doc.data().authorEmail === currentUser.email);
            postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
        } catch (error) {
            console.error("خطأ في تحديث معلومات الملف الشخصي:", error);
        }
    }
};

publishBtn.addEventListener("click", async () => {
    await addPost();
    await updateProfileInfo();
});

// Theme toggle
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.body.classList.add(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme')?'dark-theme':'light-theme');
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

const displayPosts = async () => {
    try {
        // جلب جميع المنشورات مرتبة حسب التاريخ
        let querySnapshot;
        try {
            // محاولة ترتيب المنشورات حسب timestamp
            const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
            querySnapshot = await getDocs(q);
        } catch (error) {
            // في حالة فشل الترتيب، جلب جميع المنشورات بدون ترتيب
            console.log("لا يمكن ترتيب المنشورات، جلب جميع المنشورات...");
            querySnapshot = await getDocs(collection(db, "posts"));
        }
        
        postList.innerHTML = '';
        const currentUserEmail = auth.currentUser?.email || localStorage.getItem('email');
        
        // تحويل المنشورات إلى array وترتيبها يدوياً إذا لزم الأمر
        const posts = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            posts.push({ id: docSnap.id, ...data });
        });
        
        // ترتيب المنشورات حسب التاريخ (الأحدث أولاً)
        posts.sort((a, b) => {
            const timestampA = a.timestamp ? a.timestamp.seconds : 0;
            const timestampB = b.timestamp ? b.timestamp.seconds : 0;
            return timestampB - timestampA;
        });
        
        // عرض جميع المنشورات
        posts.forEach((post) => {
            const data = post;
            const timestamp = data.timestamp ? new Date(data.timestamp.seconds*1000) : new Date();
            let hours = timestamp.getHours(); 
            const minutes = timestamp.getMinutes().toString().padStart(2,'0');
            const period = hours>=12?'م':'ص'; 
            hours=hours%12||12;
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
                ${currentUserEmail===data.authorEmail ? `<button class="delete-btn" data-id="${post.id}"></button>
                <button class="edit-btn" data-id="${post.id}"></button>` : ''}
                <h3 class="post-title">${data.title}</h3>
                <p class="post-description">${convertToLinks(data.description)}</p>
                ${data.fileUrl ? (data.fileType==='image'? `<img src="${data.fileUrl}" class="post-media">`:`<video src="${data.fileUrl}" class="post-media" controls></video>`) : ''}
                <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
                ${editedText}
                <p class="post-time">${formattedDateTime}</p>
            `;
            postList.appendChild(postItem);
        });
        
        console.log(`تم عرض ${posts.length} منشور`);
    } catch (error) {
        console.error("خطأ في عرض المنشورات:", error);
        showNotification("خطأ في تحميل المنشورات", "error");
    }
};

// إضافة منشور
const addPost = async () => {
    const title = postTitleInput.value.trim();
    const description = postDescriptionInput.value.trim();
    const author = localStorage.getItem('username');
    const authorEmail = localStorage.getItem('email');
    const file = postFileInput.files[0];

    if(title && description && author && authorEmail){
        let fileUrl=''; let fileType='';
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
        await displayPosts();
    } else showNotification("يرجى ملء جميع الحقول","error");
};

// زر إضافة منشور
addPostBtn.addEventListener('click',()=>{
    overlay.classList.add('show');
    postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
});

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
            await displayPosts();
            await updateProfileInfo();
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
        title, description, edited:true
    }, {merge:true});

    showNotification("تم تعديل المنشور بنجاح","success");
    editOverlay.classList.remove('show');
    editingPostId=null; editPostTitle.value=''; editPostDescription.value='';
    await displayPosts();
});

// تسجيل خروج
logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    localStorage.removeItem('email'); localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من تسجيل الدخول وعرض المنشورات
onAuthStateChanged(auth, async (user)=>{
    if(user){
        localStorage.setItem('email',user.email);
        try {
            const userDoc = await getDoc(doc(db,"users",user.uid));
            if(userDoc.exists()){
                const username = userDoc.data().username;
                localStorage.setItem('username', username);
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
        }
        
        // تحديث معلومات الملف الشخصي وعرض المنشورات فور تسجيل الدخول
        await updateProfileInfo();
        await displayPosts();
    } else {
        window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
    }
});
