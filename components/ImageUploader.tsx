import React, { useCallback, useState } from 'react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  label?: string;
  subLabel?: string;
  compact?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, label = "Upload Photo", subLabel = "Drag & drop or click", compact = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 1024x1024 to prevent large payloads causing RPC errors
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
             resolve(event.target?.result as string);
             return;
          }
          
          // Draw on canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 0.8 quality for compression
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(e);
        img.src = event.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        // Process (resize/compress) the image before sending up
        const base64String = await processImage(file);
        onImageSelected(base64String);
      } catch (error) {
        console.error("Error processing image:", error);
        // Fallback
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
             onImageSelected(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onImageSelected]);

  return (
    <div className={`border-2 border-dashed border-slate-300 rounded-xl hover:border-primary hover:bg-slate-50 transition-colors cursor-pointer relative overflow-hidden group ${compact ? 'p-4' : 'p-12'} ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center justify-center text-center pointer-events-none">
        {isProcessing ? (
           <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        ) : (
          <div className={`bg-slate-100 rounded-full text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors ${compact ? 'p-2 mb-2' : 'p-4 mb-4'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={compact ? "w-6 h-6" : "w-8 h-8"}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-semibold text-slate-700">{isProcessing ? 'Processing...' : label}</p>
        {!compact && !isProcessing && <p className="text-xs text-slate-500 mt-1">{subLabel}</p>}
      </div>
    </div>
  );
};

export default ImageUploader;