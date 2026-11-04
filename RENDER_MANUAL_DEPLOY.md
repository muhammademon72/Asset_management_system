# Render.com ম্যানুয়াল রিডিপ্লয় গাইড

## সমস্যা

`https://asset-management-system-vyjd.onrender.com` এখন 502 Bad Gateway দেখাচ্ছে।
এর মানে সার্ভার চালু নেই বা বিল্ড ফেইল করেছে।

## সমাধান (৩ ধাপ)

### ধাপ ১: Render ড্যাশবোর্ডে লগইন করুন

১. https://dashboard.render.com খুলুন
২. আপনার ইমেইল + পাসওয়ার্ড দিয়ে লগইন করুন (অথবা GitHub দিয়ে)
৩. আপনার সার্ভিস `asset-management-system` খুঁজে বের করুন

### ধাপ ২: বিল্ড সেটিংস যাচাই করুন

সার্ভিসে ক্লিক করুন → বাম পাশে **"Settings"** ট্যাব:

নিচের সেটিংস যাচাই করুন:

| Field | Value (এমন হওয়া উচিত) |
|-------|----------------------|
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `NODE_ENV=production node .next/standalone/server.js` |
| **Plan** | Free |
| **Branch** | main |

যদি এগুলো সঠিক না থাকে, এডিট করে সেভ করুন।

### ধাপ ৩: Environment Variables যাচাই করুন

Settings পেজে নিচে স্ক্রল করুন → **"Environment"** সেকশন:

এই ৪টি ভেরিয়েবল যাচাই করুন (থাকা উচিত):

```
NODE_ENV = production
DATABASE_URL = libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io
DATABASE_AUTH_TOKEN = eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA
PORT = 3000 (অথবা Render যা দেয়)
```

**গুরুত্বপূর্ণ:** যদি এই ভেরিয়েবলগুলো না থাকে, তাহলে:
- "Add Environment Variable" ক্লিক করুন
- উপরের মানগুলো যোগ করুন
- "Save Changes" ক্লিক করুন

### ধাপ ৪: ম্যানুয়াল রিডিপ্লয় করুন

১. উপরে ডান কোণায় **"Manual Deploy"** বাটনে ক্লিক করুন
২. **"Deploy latest commit"** সিলেক্ট করুন
৩. ৩-৫ মিনিট অপেক্ষা করুন

### ধাপ ৫: বিল্ড লগ দেখুন

১. সার্ভিসের হোম পেজে যান
২. **"Logs"** ট্যাবে ক্লিক করুন (অথবা "Events" ট্যাব)
৩. বিল্ড প্রগ্রেস দেখুন
৪. যদি কোনো এরর দেখায়, সেটি কপি করে আমাকে পাঠান

## সাধারণ সমস্যা ও সমাধান

### সমস্যা ১: "Build failed"

বিল্ড লগে যদি এরর দেখায়:

**সমাধান:**
- Build Command যাচাই করুন: `npm install && npm run build`
- Start Command যাচাই করুন: `NODE_ENV=production node .next/standalone/server.js`
- আমি লোকালে টেস্ট করেছি — বিল্ড সফল হয়

### সমস্যা ২: "Application failed to bind to port"

**সমাধান:**
- PORT env var সেট করা আছে কিনা যাচাই করুন
- Render সাধারণত পোর্ট অটোমেটিক দেয় — `PORT` env var যদি না থাকে, রেখে দিন
- সার্ভার কোডে `process.env.PORT || 3000` ব্যবহার হয়েছে

### সমস্যা ৩: "Cannot find module"

**সমাধান:**
- বিল্ড কমান্ড যাচাই করুন: `npm install` অংশটি আছে কিনা
- package.json ঠিক আছে কিনা যাচাই করুন

### সমস্যা ৪: Free Plan Sleep

Render ফ্রি প্ল্যানে ১৫ মিনিট ট্রাফিক না থাকলে সার্ভার স্লিপে যায়।
প্রথম রিকোয়েস্টে ৩০-৬০ সেকেন্ড সময় লাগতে পারে জেগে উঠতে।

## সফল হলে যা দেখবেন

বিল্ড সফল হলে লগে দেখবেন:
```
==> Build successful
==> Deploying...
==> Your service is live 🎉
```

তারপর:
- `https://asset-management-system-vyjd.onrender.com/app.html` খুলুন
- লগইন: `admin` / `admin123`
- সব ডেটা দেখতে পাবেন (Turso থেকে)

## যদি এখনো সমস্যা হয়

আমাকে এই তথ্য পাঠান:
১. Render ড্যাশবোর্ডের **Logs** ট্যাব থেকে সর্বশেষ ২০ লাইন কপি করুন
২. Settings পেজের স্ক্রিনশট নিন
৩. Environment Variables লিস্ট কপি করুন

আমি তখন সঠিক সমাধান দিতে পারব।
