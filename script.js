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

// عناصر DOM
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

const themeToggleBtn = document.getElementById('themeToggleBtn');

const profileIcon = document.getElementById('profileIcon');
const profileInfo = document.getElementById('profileInfo');
const profileUsername = document.getElementById('profileUsername');
const postCount = document.getElementById('postCount');
const logoutBtn = document.getElementById('logoutBtn');

let lastDeletedPost = null;
let editingPostId = null;

// فتح/إغلاق قائمة المستخدم
profileIcon.addEventListener("click", () => profileInfo.classList.toggle("hidden"));

// تحديث اسم المستخدم وعدد منشوراته
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

// Theme toggle
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.body.classList.add(savedTheme);
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme')?'dark-theme':'light-theme');
});

// الإشعارات
const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `<span>${message}</span>`;
    notificationContainer.innerHTML = '';
    notificationContainer.appendChild(notification);
    setTimeout(()=>notification.classList.add('show'),10);
    setTimeout(()=>notification.classList.add('hide'),5000);
    setTimeout(()=>notification.remove(),5500);
};

// تحويل الروابط في النص
function convertToLinks(text){ return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); }

// عرض المنشورات
const displayPosts = async () => {
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
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'}</p>
            ${editedText}
            <p class="post-time">${formattedDateTime}</p>
        `;
        postList.appendChild(postItem);
    });
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
        showNotification("تم نشر المنشور بنجاح");
        overlay.classList.remove('show');
        postTitleInput.value=''; postDescriptionInput.value=''; postFileInput.value='';
        displayPosts();
        updateProfileInfo();
    } else showNotification("يرجى ملء جميع الحقول");
};

// أحداث DOM
addPostBtn.addEventListener('click',()=> overlay.classList.add('show'));
closeBtn.addEventListener('click',()=> overlay.classList.remove('show'));
closeEditBtn.addEventListener('click',()=>{
    editOverlay.classList.remove('show');
    editingPostId=null;
});

// حذف وتعديل المنشورات
document.addEventListener('click', async (event)=>{
    const target = event.target;
    if(target.classList.contains('delete-btn')){
        const postId = target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postDoc = await getDoc(postRef);
        if(postDoc.exists()){
            lastDeletedPost={id:postId,data:postDoc.data()};
            await deleteDoc(postRef);
            showNotification("تم حذف المنشور");
            displayPosts();
            updateProfileInfo();
        }
    } else if(target.classList.contains('edit-btn')){
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
    if(!title || !description) return showNotification("يرجى ملء جميع الحقول");

    await setDoc(doc(db,"posts",editingPostId), {
        title, description, edited:true
    }, {merge:true});

    showNotification("تم تعديل المنشور بنجاح");
    editOverlay.classList.remove('show');
    editingPostId=null; 
    editPostTitle.value=''; 
    editPostDescription.value='';
    displayPosts();
    updateProfileInfo();
});

// تسجيل خروج
logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    localStorage.removeItem('email'); 
    localStorage.removeItem('username');
    window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من تسجيل الدخول وعرض المنشورات
onAuthStateChanged(auth,(user)=>{
    if(user){
        localStorage.setItem('email',user.email);
        getDoc(doc(db,"users",user.uid)).then(doc=>{
            if(doc.exists()){
                localStorage.setItem('username',doc.data().username);
                updateProfileInfo();
            }
        });
        displayPosts();
    } else window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});
