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

const postList = document.getElementById('postList');
const overlayAdd = document.getElementById('overlayAdd');
const overlayEdit = document.getElementById('overlayEdit');

const addPostBtn = document.getElementById('addPostBtn');
const closeAddBtn = document.getElementById('closeAddBtn');
const closeEditBtn = document.getElementById('closeEditBtn');

const postTitleInput = document.getElementById('postTitle');
const postDescriptionInput = document.getElementById('postDescription');
const postFileInput = document.getElementById('postFile');
const publishBtn = document.getElementById('publishBtn');

const editPostTitle = document.getElementById('editPostTitle');
const editPostDescription = document.getElementById('editPostDescription');
const publishEditBtn = document.getElementById('publishEditBtn');

const notificationContainer = document.getElementById('notificationContainer');

const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const profileIcon = document.querySelector(".profile-icon");
const profileInfo = document.getElementById("profile-info");
const profileUsername = document.getElementById("profileUsername");
const postCount = document.getElementById("postCount");

let lastDeletedPost = null;
let editingPostId = null;

// عرض معلومات الحساب
profileIcon.addEventListener("click", () => profileInfo.classList.toggle("hidden"));

// تحديث معلومات الحساب
const updateProfileInfo = async () => {
    const currentUser = auth.currentUser;
    if(currentUser){
        const userDoc = await getDoc(doc(db,"users",currentUser.uid));
        if(userDoc.exists()) profileUsername.textContent = userDoc.data().username || "مستخدم";

        const querySnapshot = await getDocs(collection(db,"posts"));
        const userPosts = querySnapshot.docs.filter(d => d.data().authorEmail === currentUser.email);
        postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
    }
};

// فتح وإغلاق Form إضافة منشور
addPostBtn.addEventListener('click', () => overlayAdd.classList.add('show'));
closeAddBtn.addEventListener('click', () => {
    overlayAdd.classList.remove('show');
    postTitleInput.value = '';
    postDescriptionInput.value = '';
    postFileInput.value = '';
});

// فتح وإغلاق Form تعديل منشور
closeEditBtn.addEventListener('click', () => {
    overlayEdit.classList.remove('show');
    editPostTitle.value='';
    editPostDescription.value='';
    editingPostId=null;
});

// نشر منشور جديد
publishBtn.addEventListener('click', async () => {
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
            title, description, author, authorEmail, fileUrl, fileType, timestamp: serverTimestamp()
        });

        showNotification("تم نشر المنشور بنجاح","success");
        overlayAdd.classList.remove('show');
        postTitleInput.value='';
        postDescriptionInput.value='';
        postFileInput.value='';
        displayPosts();
        updateProfileInfo();
    } else showNotification("يرجى ملء جميع الحقول","error");
});

// حفظ تعديل المنشور
publishEditBtn.addEventListener('click', async ()=>{
    if(!editingPostId) return;
    const title = editPostTitle.value.trim();
    const description = editPostDescription.value.trim();
    if(!title || !description) return showNotification("يرجى ملء جميع الحقول","error");

    await setDoc(doc(db,"posts",editingPostId),{
        title, description, edited:true
    },{merge:true});

    showNotification("تم تعديل المنشور بنجاح","success");
    overlayEdit.classList.remove('show');
    editPostTitle.value='';
    editPostDescription.value='';
    editingPostId=null;
    displayPosts();
});

// عرض المنشورات
const convertToLinks = text => text.replace(/(https?:\/\/[^\s]+)/g,'<a href="$1" target="_blank">$1</a>');

const displayPosts = async ()=>{
    const querySnapshot = await getDocs(collection(db,"posts"));
    postList.innerHTML='';
    const currentUserEmail = localStorage.getItem('email');

    querySnapshot.forEach(docSnap=>{
        const data = docSnap.data();
        const editedText = data.edited ? '<span class="edited-label">تم تعديله</span>' : '';
        const postItem = document.createElement('li');
        postItem.classList.add('post-item');
        postItem.innerHTML=`
            ${currentUserEmail===data.authorEmail?`
            <button class="delete-btn" data-id="${docSnap.id}"></button>
            <button class="edit-btn" data-id="${docSnap.id}"></button>` : ''}
            <h3 class="post-title">${data.title}</h3>
            <p class="post-description">${convertToLinks(data.description)}</p>
            ${data.fileUrl?(data.fileType==='image'?`<img src="${data.fileUrl}" class="post-media">`:`<video src="${data.fileUrl}" class="post-media" controls></video>`):''}
            <p class="post-author">من قِبل: ${data.author || 'مستخدم'} ${editedText}</p>
        `;
        postList.appendChild(postItem);
    });
};

// التعديل والحذف
document.addEventListener('click', async event=>{
    const target = event.target;

    // حذف
    if(target.classList.contains('delete-btn')){
        const postId = target.dataset.id;
        const postRef = doc(db,"posts",postId);
        const postDoc = await getDoc(postRef);
        if(postDoc.exists()){
            lastDeletedPost={id:postId,data:postDoc.data()};
            await deleteDoc(postRef);
            showNotification("تم حذف المنشور","delete");
            displayPosts();
            updateProfileInfo();
        }
    }

    // تعديل
    if(target.classList.contains('edit-btn')){
        const postId = target.dataset.id;
        const postDoc = await getDoc(doc(db,"posts",postId));
        if(postDoc.exists()){
            editingPostId = postId;
            editPostTitle.value = postDoc.data().title;
            editPostDescription.value = postDoc.data().description;
            overlayEdit.classList.add('show');
        }
    }
});

// إشعارات
const showNotification = (msg,type)=>{
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `<span>${msg}</span>`;
    notificationContainer.innerHTML=''; notificationContainer.appendChild(notification);
    setTimeout(()=>notification.classList.add('show'),10);
    setTimeout(()=>notification.classList.add('hide'),5000);
    setTimeout(()=>notification.remove(),5500);
};

// تسجيل الخروج
logoutBtn.addEventListener('click',async()=>{
    await signOut(auth);
    localStorage.removeItem('email');
    localStorage.removeItem('username');
    window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});

// التحقق من تسجيل الدخول
onAuthStateChanged(auth,user=>{
    if(user){
        localStorage.setItem('email',user.email);
        getDoc(doc(db,"users",user.uid)).then(docSnap=>{
            if(docSnap.exists()){
                localStorage.setItem('username',docSnap.data().username);
            }
        });
        displayPosts();
        updateProfileInfo();
    }else window.location.href='https://hussaindev10.github.io/Dhdhririeri/';
});
