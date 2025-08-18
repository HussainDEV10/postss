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
const profileUsername = document.getElementById('profileUsername');
const postCount = document.getElementById('postCount');

// دالة لإنشاء/تحديث مستخدم في Firestore
const createUserDocument = async (user) => {
    if (!user) return;
    
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        await setDoc(userRef, {
            email: user.email,
            username: user.email.split('@')[0], // اسم افتراضي من الإيميل
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });
    } else {
        await setDoc(userRef, {
            lastLogin: serverTimestamp()
        }, { merge: true });
    }
    return userRef;
};

// دالة لتحديث معلومات الملف الشخصي
const updateProfileInfo = async (user) => {
    if (!user) return;
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const username = userData.username || user.email.split('@')[0];
            profileUsername.textContent = username;
            
            // تحديث عدد المنشورات
            const postsQuery = await getDocs(collection(db, "posts"));
            const userPosts = postsQuery.docs.filter(doc => doc.data().authorId === user.uid);
            postCount.textContent = `عدد المنشورات: ${userPosts.length}`;
        }
    } catch (error) {
        console.error("Error updating profile:", error);
    }
};

// دالة لإضافة منشور جديد
const addPost = async () => {
    const title = document.getElementById('postTitle').value.trim();
    const description = document.getElementById('postDescription').value.trim();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        showNotification("يجب تسجيل الدخول أولاً", "error");
        return;
    }

    if (title && description) {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const username = userDoc.exists() ? 
                userDoc.data().username : currentUser.email.split('@')[0];

            const postData = {
                title,
                description,
                author: username,
                authorId: currentUser.uid,
                authorEmail: currentUser.email,
                timestamp: serverTimestamp(),
                edited: false
            };

            // رفع الملف إذا وجد
            const file = document.getElementById('postFile').files[0];
            if (file) {
                const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                postData.fileUrl = await getDownloadURL(storageRef);
                postData.fileType = file.type.startsWith('image/') ? 'image' : 'video';
            }

            await addDoc(collection(db, "posts"), postData);
            showNotification("تم نشر المنشور بنجاح", "success");
            
            // إغلاق النافذة وإعادة التحميل
            document.getElementById('overlay').classList.remove('show');
            document.getElementById('postTitle').value = '';
            document.getElementById('postDescription').value = '';
            document.getElementById('postFile').value = '';
            
            await updateProfileInfo(currentUser);
            displayPosts();
        } catch (error) {
            console.error("Error adding post:", error);
            showNotification("حدث خطأ أثناء نشر المنشور", "error");
        }
    } else {
        showNotification("يرجى إدخال عنوان ووصف للمنشور", "error");
    }
};

// تهيئة التطبيق
const initApp = async () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                localStorage.setItem('email', user.email);
                await createUserDocument(user);
                await updateProfileInfo(user);
                displayPosts();
            } catch (error) {
                console.error("Auth state error:", error);
            }
        } else {
            window.location.href = 'https://hussaindev10.github.io/Dhdhririeri/';
        }
    });

    // أحداث النقر
    document.getElementById('addPostBtn').addEventListener('click', () => {
        document.getElementById('overlay').classList.add('show');
    });

    document.getElementById('publishBtn').addEventListener('click', addPost);
};

// بدء التطبيق
initApp();
