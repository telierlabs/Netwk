// Alat kecil untuk memproses gambar sebelum disimpan ke Firestore

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// Crop tengah jadi kotak kecil (foto profil)
export const compressToSquare = (dataUrl: string, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      c.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

// Crop tengah jadi persegi panjang 2:1 (sampul)
export const compressToCover = (dataUrl: string, width = 720, height = 360): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetRatio = width / height;
      let sw = img.width;
      let sh = img.height;
      if (sw / sh > targetRatio) sw = sh * targetRatio; // terlalu lebar → potong kiri-kanan
      else sh = sw / targetRatio;                       // terlalu tinggi → potong atas-bawah
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
