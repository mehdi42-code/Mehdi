import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole, StylistOption, GenerationState } from './types';
import { generateEyewearImage, chatWithStylist, detectIntent } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ImageUploader from './components/ImageUploader';

// Constants
const PRESET_STYLES: StylistOption[] = [
  { id: 'aviator', label: 'Aviator', icon: '🕶️', prompt: 'wear classic gold rimmed aviator sunglasses' },
  { id: 'wayfarer', label: 'Classic Wayfarer', icon: '🎸', prompt: 'wear black wayfarer style sunglasses' },
  { id: 'cat-eye', label: 'Cat Eye', icon: '😺', prompt: 'wear vintage red cat-eye glasses' },
  { id: 'round', label: 'Intellectual', icon: '🤓', prompt: 'wear thin round wire-rimmed glasses' },
  { id: 'rimless', label: 'Minimalist', icon: '👓', prompt: 'wear modern rimless rectangular glasses' },
];

const App: React.FC = () => {
  // State: Images
  const [userImage, setUserImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // State: Chat & Process
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [generationState, setGenerationState] = useState<GenerationState>({ isGenerating: false, progress: '' });
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Handlers
  const handleUserImageUpload = (base64: string) => {
    setUserImage(base64);
    setGeneratedImage(null); // Reset generation
    setChatHistory([{
      role: MessageRole.MODEL,
      text: "Great! I've got your photo. Choose a style below, upload a reference image of glasses you like, or just tell me what to try on!",
      timestamp: Date.now()
    }]);
  };

  const handleReferenceImageUpload = (base64: string) => {
    setReferenceImage(base64);
    handleSendMessage(`I've uploaded a picture of some glasses. Can I try them on?`, base64);
  };

  const handleStyleSelect = (style: StylistOption) => {
    handleSendMessage(`Can I try on ${style.label} glasses?`);
  };

  const cleanBase64 = (dataUrl: string) => dataUrl.split(',')[1];

  const handleSendMessage = async (text: string = inputMessage, overrideRefImage: string | null = null) => {
    if (!text.trim() && !overrideRefImage) return;

    const userMsg: ChatMessage = { role: MessageRole.USER, text, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');

    if (!userImage) {
       setChatHistory(prev => [...prev, { role: MessageRole.MODEL, text: "Please upload a photo of yourself first!", timestamp: Date.now() }]);
       return;
    }

    setGenerationState({ isGenerating: true, progress: 'Thinking...' });

    try {
      const currentRefImage = overrideRefImage || referenceImage;
      
      // 1. Detect Intent
      // If explicit reference image provided in this turn (Try-On), force Image Edit.
      // Otherwise check text intent.
      const intent = currentRefImage ? 'EDIT_IMAGE' : detectIntent(text);

      if (intent === 'EDIT_IMAGE') {
        setGenerationState({ isGenerating: true, progress: 'Generating your new look... (using Gemini 2.5 Flash Image)' });
        
        const rawUserImage = cleanBase64(userImage);
        const rawRefImage = currentRefImage ? cleanBase64(currentRefImage) : undefined;
        
        const newImageBase64 = await generateEyewearImage(rawUserImage, text, rawRefImage);
        const fullNewImage = `data:image/jpeg;base64,${newImageBase64}`;
        
        setGeneratedImage(fullNewImage);
        
        setChatHistory(prev => [...prev, { 
          role: MessageRole.MODEL, 
          text: currentRefImage 
            ? "I've placed the glasses from your reference image onto your face. How do they fit?" 
            : "Here is the updated look based on your request. Use the slider to compare!",
          timestamp: Date.now() 
        }]);
      } else {
        // Chat / Shopping intent
        setGenerationState({ isGenerating: true, progress: 'Consulting the optical expert... (using Gemini 3 Pro)' });
        
        const currentContextImage = generatedImage ? cleanBase64(generatedImage) : cleanBase64(userImage);
        
        const response = await chatWithStylist(text, currentContextImage, chatHistory);
        
        setChatHistory(prev => [...prev, { 
          role: MessageRole.MODEL, 
          text: response.text, 
          timestamp: Date.now(),
          groundingUrls: response.groundingUrls
        }]);
      }

    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: MessageRole.MODEL, text: "Sorry, something went wrong. Please try again.", isError: true, timestamp: Date.now() }]);
    } finally {
      setGenerationState({ isGenerating: false, progress: '' });
    }
  };

  const handleShopLook = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent slider interactions
    handleSendMessage("Find online shopping links for glasses that look exactly like the ones in this photo.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar / Configuration */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-primary mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Visionary<span className="text-primary">AI</span></h1>
          </div>
          <p className="text-xs text-slate-500">Your AI Optical Consultant</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Section: User Photo */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">1. Your Photo</h3>
            {userImage ? (
              <div className="relative rounded-xl overflow-hidden shadow-md border border-slate-200 group">
                <img src={userImage} alt="User" className="w-full h-48 object-cover" />
                <button 
                  onClick={() => { setUserImage(null); setGeneratedImage(null); }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-slate-600 hover:text-red-500 p-1.5 rounded-full shadow-sm transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <ImageUploader onImageSelected={handleUserImageUpload} />
            )}
          </section>

          {/* Section: Styles */}
          {userImage && (
             <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">2. Quick Try-On</h3>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style)}
                    disabled={generationState.isGenerating}
                    className="flex items-center space-x-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-primary hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl">{style.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{style.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Section: Reference Upload */}
          {userImage && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">3. Try Specific Frames</h3>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-2">Upload an image of glasses to map them onto your face.</p>
                {referenceImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-32">
                    <img src={referenceImage} alt="Reference" className="w-full h-full object-contain bg-slate-50" />
                     <button 
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 p-1 rounded-full shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <ImageUploader onImageSelected={handleReferenceImageUpload} label="Upload Glasses" compact />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Visualization Area */}
        <div className="flex-1 bg-slate-100 relative flex items-center justify-center overflow-hidden p-4">
          {userImage ? (
            generatedImage ? (
              <div className="w-full max-w-4xl aspect-[4/3] shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-900/5 relative group">
                 <ComparisonSlider originalImage={userImage} generatedImage={generatedImage} />
                 
                 {/* Shop Similar Button */}
                 <div className="absolute bottom-6 right-6 z-30">
                    <button
                        onClick={handleShopLook}
                        disabled={generationState.isGenerating}
                        className="bg-white/95 hover:bg-white text-slate-900 px-5 py-3 rounded-full shadow-lg backdrop-blur-md border border-white/50 font-bold text-sm flex items-center space-x-2 transition-all transform hover:scale-105 active:scale-95 hover:shadow-xl ring-1 ring-slate-900/5"
                    >
                        <span className="text-lg">🛍️</span>
                        <span>Shop Similar Styles</span>
                    </button>
                 </div>
              </div>
            ) : (
               <div className="w-full max-w-4xl aspect-[4/3] relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-slate-900/5">
                 <img src={userImage} alt="Original" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white/90 p-6 rounded-xl shadow-lg text-center max-w-md">
                       <p className="text-lg font-medium text-slate-800">Ready to style!</p>
                       <p className="text-slate-500 mt-1">Select a style from the left, upload frames, or use the chat below to describe what you want.</p>
                    </div>
                 </div>
               </div>
            )
          ) : (
            <div className="text-center space-y-4 max-w-md">
              <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto flex items-center justify-center text-slate-400 animate-pulse-slow">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-700">Welcome to VisionaryAI</h2>
              <p className="text-slate-500">Upload a selfie to get started with the next generation of virtual eyewear try-on.</p>
            </div>
          )}
          
          {/* Loading Overlay */}
          {generationState.isGenerating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg font-semibold text-slate-800">{generationState.progress}</p>
                <p className="text-sm text-slate-500 mt-1">This might take a few seconds...</p>
              </div>
            </div>
          )}
        </div>

        {/* Context Aware Chat Interface */}
        <div className="h-80 bg-white border-t border-slate-200 flex flex-col">
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-8">
                    Ask me to change the color, style, or find where to buy these frames!
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === MessageRole.USER 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      
                      {/* Grounding Links */}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50">
                           <p className="text-xs font-bold uppercase opacity-70 mb-2">Shopping Suggestions:</p>
                           <div className="flex flex-wrap gap-2">
                             {msg.groundingUrls.slice(0,5).map((url, i) => (
                               <a 
                                key={i} 
                                href={url.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs bg-white/50 hover:bg-white text-current px-2 py-1 rounded border border-current/10 transition-colors flex items-center space-x-1"
                               >
                                 <span>🛍️</span>
                                 <span className="truncate max-w-[150px]">{url.title}</span>
                               </a>
                             ))}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full pl-4 pr-12 py-4 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm text-sm transition-all"
                  placeholder="Type here... e.g., 'Make the frames red' or 'Where can I buy similar glasses?'"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={generationState.isGenerating}
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || generationState.isGenerating}
                  className="absolute right-2 top-2 bottom-2 bg-primary text-white px-3 rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;