# Firebase Cloud Backup Setup

لە Firebase Console بۆ پڕۆژەی `orders-app-84cb4`، لە Authentication → Sign-in method، `Email/Password` چالاک بکە. پاشان لە Storage → Get started، Cloud Storage دروست بکە.

بۆ ئەوەی هەر بەکارهێنەر تەنها backup ـی خۆی ببینێت، Storage Rules ـەکان بەم شێوەیە دابنێ:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /backups/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

لە ئەپەکەدا بەشی Settings بکەرەوە، email و وشەی نهێنی دروست بکە، پاشان چوونەژوورەوە بکە. کاتێک `رۆژانە` یان `مانگانە` هەڵدەبژێریت، ئەپەکە لە کاتی کردنەوەی ئەپدا پشکنین دەکات؛ ئەگەر کاتی backup گەیشتبێت، داتا خۆکارانە upload دەکات. هەروەها notification ـی ناوخۆیی بۆ یادخستنەوە دەنێرێت.
