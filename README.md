[Modern ChatBot Whatsapp Type Node.Js]

# Spesifikasi Script
- Node.js v24.
- ECMAScript Module (ESM).
- Menggunakan @whiskeysockets/baileys.
- Mendukung koneksi Multi Device.
- Respon cepat pada chat pribadi dan grup.
- Sistem plugin command.
- Sistem plugin dinamis.
- mendukung plugin hot reload.
- Struktur kode yang konsisten.
- Database sederhana dan mudah dipahami.
- Risiko banned mengikuti kebijakan WhatsApp.

#Paduan Panel [Pterodactyl]
- Upload seluruh file script ke menu Files.
- Jika file berbentuk .zip, lakukan Extract/Unarchive.
- Pastikan file package.json berada di direktori utama.
- Hapus node_modules, session dan package-lock.json (jika ada).
- Pilih Node.js v24 pada menu Startup.
- Setting config.js sesuaikan kebutuhan. 
- Jalankan proses instalasi dependency: "npm install" lalu "npm start"
- Jalankan server dengan menekan tombol Start.
- Tunggu hingga seluruh dependency selesai terpasang.
- Login dengan pairing code yang sudah diberikan. 
- Setelah berhasil login, file session akan tersimpan sehingga
  tidak perlu scan ulang selama session masih tersedia.

#Panduan Termux
- pkg update && pkg upgrade -y
- pkg install nodejs-lts -y
- pkg install git -y
- termux-setup-storage
- cd ~
- cp -r "/storage/emulated/0/Download/SESUAIKAN" .
- cd "SESUAIKAN"
- rm -rf node_modules package-lock.json
- node -v
- npm -v
- npm install
- npm start

#Note
- Disarankan menggunakan Panel, Hosting, atau Device
  dengan performa tinggi saat menjalankan script ini agar
  proses berjalan stabil dan terhindar dari benturan data
  yang dapat terjadi akibat respons sistem yang lambat.
  
#License
- Script ini TIDAK BOLEH diperjualbelikan, didistribusikan ulang, direbrand, ataupun diklaim sebagai karya sendiri tanpa izin resmi.
- Hak distribusi dan penjualan HANYA dimiliki oleh Developer Asli (Ell / OpenBOT Inc.).
- Siapa pun selain Developer Asli dilarang menjual script ini dalam bentuk apa pun, baik utuh maupun hasil modifikasi.
- Pelanggaran terhadap ketentuan ini dianggap sebagai pelanggaran lisensi dan hak cipta yang berlaku.

#Copyright
©OpenBOT Inc. All Rights Reserved.
Official Base by Hai Ell Engineer.
Officially Engineered by OpenBOT Inc.
