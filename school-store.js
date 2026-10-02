window.SchoolStore = (()=>{
  const localKey='taikachisu-editor-preview-v1';let cloudPromise;
  function localRead(){try{return JSON.parse(localStorage.getItem(localKey))||null;}catch{return null;}}
  function localWrite(data){localStorage.setItem(localKey,JSON.stringify(data));}
  async function cloud(){
    if(!window.TAIKA_FIREBASE_CONFIG)return null;
    if(!cloudPromise)cloudPromise=(async()=>{
      const base='https://www.gstatic.com/firebasejs/12.19.0/';
      const [app,auth,db,storage]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js','firebase-storage.js'].map(file=>import(base+file)));
      const instance=app.initializeApp(window.TAIKA_FIREBASE_CONFIG);return {auth,db,storage,authentication:auth.getAuth(instance),database:db.getFirestore(instance),bucket:storage.getStorage(instance)};
    })();return cloudPromise;
  }
  async function list(api,name,admin=false){const ref=api.db.collection(api.database,name);const q=admin?ref:api.db.query(ref,api.db.where('published','==',true));const snap=await api.db.getDocs(q);return snap.docs.map(doc=>({...doc.data(),id:doc.id}));}
  async function loadPublic(){
    if(new URLSearchParams(location.search).get('preview')==='1'){const data=localRead();if(data)return {articles:data.articles.filter(a=>a.published),events:data.events.filter(e=>e.published),preview:true};}
    const api=await cloud();if(!api)return null;
    const state=await api.db.getDoc(api.db.doc(api.database,'site','content'));
    if(!state.exists()||!state.data().initialized)return null;
    const [articles,events]=await Promise.all([list(api,'articles'),list(api,'events')]);return {articles,events,preview:false};
  }
  async function save(name,item){const api=await cloud();if(!api)throw new Error('Firebase todavía no está conectado');await api.db.setDoc(api.db.doc(api.database,name,item.id),{...item,updatedAt:api.db.serverTimestamp()});}
  async function seed(articles,events){const api=await cloud();const batch=api.db.writeBatch(api.database);for(const item of articles)batch.set(api.db.doc(api.database,'articles',String(item.id)),item);for(const item of events)batch.set(api.db.doc(api.database,'events',item.id),item);batch.set(api.db.doc(api.database,'site','content'),{initialized:true,updatedAt:api.db.serverTimestamp()});await batch.commit();}
  return {cloud,list,loadPublic,save,seed,localRead,localWrite};
})();
