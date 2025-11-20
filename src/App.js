import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Send, CheckCircle, Upload, ExternalLink, Leaf, TreeDeciduous } from 'lucide-react';

export default function GarbageReportApp() {
  const [step, setStep] = useState('welcome');
  const [imagePreview, setImagePreview] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const [formData, setFormData] = useState({ image: null, details: '', location: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [generatedReportId, setGeneratedReportId] = useState('');
  const [loadingStage, setLoadingStage] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;
    script.onload = () => window.emailjs.init('MJzgZh1FY-5o66gnS');
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const compressImage = (file, maxSizeKB = 40) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 800;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          while (compressedDataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      const compressed = await compressImage(file, 40);
      setCompressedImage(compressed);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setFormData({ ...formData, location: { lat: position.coords.latitude, lng: position.coords.longitude }}),
        (error) => {
          console.error('Location error:', error);
          alert('Unable to get location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const openInGoogleMaps = () => {
    if (formData.location) {
      window.open(`https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`, '_blank');
    }
  };

  const checkReportStatus = () => {
    if (!trackingId || trackingId.length < 8) {
      alert('⚠️ Please enter a valid Report ID');
      return;
    }
    const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
    const reportData = storedReports[trackingId];
    if (!reportData) {
      alert('❌ Invalid Report ID! Please check and try again.');
      setTrackingStatus(null);
      return;
    }
    const elapsed = (Date.now() - reportData.timestamp) / 1000;
    setTrackingStatus([
      { step: 1, reached: true },
      { step: 2, reached: elapsed >= 5 },
      { step: 3, reached: elapsed >= 10 },
      { step: 4, reached: reportData.verified || false }
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.image) {
      alert('⚠️ Please capture a photo before submitting.');
      return;
    }
    if (!formData.location) {
      alert('⚠️ Please share your location before submitting.');
      return;
    }

    setIsSubmitting(true);
    setStep('loading');
    setTimeout(() => setLoadingStage(1), 0);
    setTimeout(() => setLoadingStage(2), 5000);
    setTimeout(() => setLoadingStage(3), 8000);

    try {
      if (!window.emailjs) throw new Error('EmailJS not loaded');

      const reportId = `GR-${Date.now().toString().slice(-8)}`;
      const storedReports = JSON.parse(localStorage.getItem('garbageReports') || '{}');
      storedReports[reportId] = {
        timestamp: Date.now(),
        location: formData.location,
        details: formData.details,
        verified: false
      };
      localStorage.setItem('garbageReports', JSON.stringify(storedReports));
      setGeneratedReportId(reportId);

      await new Promise(resolve => setTimeout(resolve, 3000));

      await window.emailjs.send('service_d8u7ayd', 'template_qsgyy3e', {
        report_id: reportId,
        timestamp: new Date().toLocaleString(),
        latitude: formData.location.lat.toFixed(6),
        longitude: formData.location.lng.toFixed(6),
        google_maps_link: `https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`,
        details: formData.details || 'No details',
        image_data: compressedImage,
        verify_link: `${window.location.origin}/verify.html?id=${reportId}`
      });

      setTimeout(() => { setStep('success'); setIsSubmitting(false); }, 1000);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit. Please try again.');
      setStep('form');
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('welcome');
    setImagePreview(null);
    setCompressedImage(null);
    setFormData({ image: null, details: '', location: null });
    setLoadingStage(0);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <TreeDeciduous className="absolute top-10 left-5 w-24 h-24 text-green-200 opacity-20" />
        <TreeDeciduous className="absolute top-40 right-10 w-32 h-32 text-emerald-200 opacity-15" />
        <Leaf className="absolute bottom-20 left-20 w-20 h-20 text-green-300 opacity-25" />
        <TreeDeciduous className="absolute bottom-40 right-5 w-28 h-28 text-teal-200 opacity-20" />
      </div>

      <div className="max-w-md mx-auto relative z-10 p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-xl p-6 mt-8 border-b-4 border-green-500">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full shadow-lg">
              <span className="text-3xl">🎓</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 text-center">
            NITP Clean Campus
          </h1>
          <p className="text-sm text-gray-600 text-center mt-2 flex items-center justify-center gap-1">
            <Leaf className="w-4 h-4 text-green-500" />
            Keep our environment clean & green
            <Leaf className="w-4 h-4 text-green-500" />
          </p>
        </div>

        {step === 'welcome' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-b-3xl">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-full bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🌱</div>
                <h2 className="text-2xl font-bold text-green-800 mb-3">Welcome, Environmental Hero!</h2>
                <p className="text-gray-700 leading-relaxed">
                  Thank you for taking the initiative to keep our environment clean and beautiful. 
                  Your small action creates a big impact for our community.
                </p>
              </div>
              <button onClick={() => setStep('form')} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-5 px-12 rounded-full shadow-xl transition-all transform hover:scale-105 text-lg">
                <span className="flex items-center justify-center gap-3">📝 Open Report Form</span>
              </button>
              <button onClick={() => setStep('track')} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-12 rounded-full shadow-xl transition-all transform hover:scale-105 text-lg">
                <span className="flex items-center justify-center gap-3">🔍 Track Report Status</span>
              </button>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
                <p className="text-sm text-blue-800 text-center leading-relaxed">
                  💡 <strong>Quick Tip:</strong> Take a clear photo, add location, and submit. Save your Report ID to track progress!
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-6 rounded-b-3xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg"><Camera className="w-5 h-5 text-blue-600" /></div>
                  <span>Capture Photo of Garbage *</span>
                </label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageCapture} className="hidden" />
                {!imagePreview ? (
                  <button onClick={() => fileInputRef.current.click()} className="w-full border-3 border-dashed border-gray-300 rounded-2xl p-10 hover:border-green-500 hover:bg-green-50 transition-all">
                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                    <p className="text-base font-semibold text-gray-700">Tap to Open Camera</p>
                  </button>
                ) : (
                  <div className="relative">
                    <img src={imagePreview} alt="Garbage" className="w-full h-72 object-cover rounded-2xl shadow-lg border-4 border-green-100" />
                    <button onClick={() => { setImagePreview(null); setCompressedImage(null); setFormData({ ...formData, image: null }); }} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-2.5 hover:bg-red-600">✕</button>
                    <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />Photo Captured
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-lg"><span className="text-lg">📝</span></div>
                  <span>Additional Details (Optional)</span>
                </label>
                <textarea value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} placeholder="Describe the issue..." className="w-full border-2 border-gray-300 rounded-2xl p-4 focus:ring-2 focus:ring-green-500" rows="5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <div className="bg-red-100 p-2 rounded-lg"><MapPin className="w-5 h-5 text-red-600" /></div>
                  <span>Location Information *</span>
                </label>
                {!formData.location ? (
                  <button onClick={handleGetLocation} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">📍</div><span>Share My Current Location</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-4">
                      <div className="flex gap-3">
                        <div className="bg-green-500 p-2 rounded-full h-fit"><MapPin className="w-5 h-5 text-white" /></div>
                        <div>
                          <p className="text-sm font-bold text-green-800 flex items-center gap-2">Location Captured<CheckCircle className="w-4 h-4" /></p>
                          <p className="text-xs text-green-700 font-mono mt-1 bg-white/50 px-2 py-1 rounded">{formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={openInGoogleMaps} className="w-full bg-white border-2 border-gray-300 hover:border-blue-400 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                      <span className="text-xl">🗺️</span>View in Google Maps<ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 text-white font-bold py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg">
                {isSubmitting ? (<><div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>Sending...</>) : (<><Send className="w-6 h-6" />Submit to NITP Committee</>)}
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-b-3xl text-center">
            {loadingStage < 3 ? (
              <>
                <div className="w-24 h-24 mx-auto border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-bold">{loadingStage === 1 && '🔍 Searching nearby Cleaning Warriors...'}{loadingStage === 2 && '📡 Fetching cleaning staff...'}</p>
              </>
            ) : (
              <div className="space-y-6">
                <div className="w-32 h-32 mx-auto bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-20 h-20 text-white" /></div>
                <div className="w-40 h-40 mx-auto rounded-full border-4 border-green-500 bg-gray-300 flex items-center justify-center text-6xl">🧹</div>
                <div>
                  <h3 className="text-2xl font-bold text-green-800">Mr. Deepu Kumar</h3>
                  <p className="text-gray-700 mt-2">🚛 Our cleaning team led by <strong>Mr. Deepu Kumar</strong> is heading to your location!</p>
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mt-4">
                    <p className="text-sm font-semibold">⏱️ Arrival: 5-10 minutes</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-8 rounded-b-3xl text-center">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
              <CheckCircle className="w-20 h-20 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Report Submitted!</h2>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 mb-4">
              <p className="text-xl font-bold text-green-800">🌿 Thank You for Keeping Our Environment Clean! 🌿</p>
            </div>
            <div className="bg-white border-2 border-green-200 rounded-2xl p-5 mb-4">
              <p className="text-sm font-bold mb-2">📋 Report Details</p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm"><strong>Report ID:</strong> {generatedReportId}</p>
                <p className="text-xs text-gray-600"><strong>Sent to:</strong> NITP Cleaning Committee</p>
              </div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4 mb-4">
              <p className="text-sm font-bold text-yellow-800">⚠️ Important: Save your Report ID!</p>
            </div>
            <button onClick={handleReset} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-8 rounded-full">📸 Report Another Issue</button>
          </div>
        )}

        {step === 'track' && (
          <div className="bg-white/95 backdrop-blur-sm shadow-xl p-6 rounded-b-3xl">
            <h2 className="text-2xl font-bold text-center mb-4">Track Your Report</h2>
            <input type="text" value={trackingId} onChange={(e) => setTrackingId(e.target.value.toUpperCase())} placeholder="GR-12345678" className="w-full border-2 p-4 rounded-xl text-center font-mono mb-4" />
            <button onClick={checkReportStatus} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mb-6">🔍 Check Status</button>
            {trackingStatus && (
              <div className="space-y-4">
                {[
                  { icon: '📨', title: 'Report Received' },
                  { icon: '👀', title: 'Under Review' },
                  { icon: '🚛', title: 'Cleanup Dispatched' },
                  { icon: '✨', title: 'Mission Complete' }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${trackingStatus[i].reached ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gray-300'}`}>{item.icon}</div>
                      <div>
                        <p className={`font-bold ${trackingStatus[i].reached ? 'text-green-700' : 'text-gray-400'}`}>{item.title}</p>
                        {trackingStatus[i].reached && <p className="text-xs text-green-600">✓ Completed</p>}
                      </div>
                    </div>
                    {i < 3 && (
                      <div className="ml-8 h-12 w-2 rounded-full bg-gray-300 relative">
                        {trackingStatus[i].reached && trackingStatus[i+1].reached && <div className="absolute inset-0 bg-green-500 rounded-full"></div>}
                      </div>
                    )}
                  </div>
                ))}
                {trackingStatus.every(s => s.reached) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-6 text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-xl font-bold text-green-800">Thank You, Hero!</p>
                    <p className="text-sm text-green-700 mt-2">Your contribution kept NITP clean!</p>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setStep('welcome'); setTrackingId(''); setTrackingStatus(null); }} className="w-full bg-gray-200 py-3 rounded-xl mt-6">← Back</button>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto mt-8 mb-6 text-center relative z-10">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-green-200">
          <p className="text-sm text-gray-700 font-semibold flex items-center justify-center gap-2">
            <Leaf className="w-4 h-4 text-green-600" />Together for a Cleaner Tomorrow<Leaf className="w-4 h-4 text-green-600" />
          </p>
          <p className="text-xs text-gray-500 mt-2">Reports sent to NITP Cleaning Committee</p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 font-medium">Developed by Anurag Kumar</p>
            <p className="text-xs text-gray-500 mt-1">Contributors: Shloka Reddy, Varsha Sinha</p>
          </div>
        </div>
      </div>
    </div>
  );
}
