// --- Geolocation Utility ---
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Geolocation is not supported by your browser.'));
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                // Error code 1: Permission denied
                const message = error.code === 1
                    ? "Permission to access location was denied."
                    : error.message || "Failed to get location.";
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};


// --- Image Compression Utility ---
// Converts a Base64 Data URL to a compressed Base64 Data URL
export const compressImage = (dataUrl, maxWidth, quality) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if width exceeds max
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to JPEG with specified quality
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // Resolve with the *full* data URL (including prefix)
            // The backend is already built to handle this.
            resolve(compressedDataUrl);
        };
        img.src = dataUrl;
    });
};